/**
 * A scraper for https://stackoverflow.com/jobs
 * with hooks for hydrating (adjusting) the raw mined data, writing files,
 * and limiting concurrency
 *
 * https://meta.stackoverflow.com/questions/348954/can-i-scrape-stack-overflow-job-postings
 */
"use strict";

const fs = require("fs");
const mkdirp = require("mkdirp");
const axios = require("axios").default;
const plimit = require("p-limit").default;
const cheerio = require("cheerio");
const YAML = require("yaml");

// Query parameters for listing pages
// l   ->  Location
// d   ->  Distance to location
// u   ->  Units of distance
// r   ->  Allow remote
// j   ->  Type: ['internship' 'permanent' 'contract']
// dr  ->  Developer Role (see below)
const COMMON_QUERY_PARAMETERS = {
//    l: "Portugal",
//    d: 20,
//    u: "Km",
//    r: true,
//    j: "internship"
//    dr: "BackendDeveloper"
};
const DEFAULT_PAGES = 10;

// careful, we don't want to get blacklisted by stackoverflow.
const MAX_CONCURRENT_LISTING_REQUESTS = 20;
const MAX_CONCURRENT_DETAILS_REQUESTS = 40;
const TIMEOUT = 120000;

const ID_PREFIX = "so_";
const DEFAULT_PAGE_DUMP_FOLDER = "output/raw/pages";

// *****

const stackoverflow = axios.create({
    baseURL: "https://stackoverflow.com",
    timeout: TIMEOUT,
    method: "GET",
});

function keyBy(array, key) {
    const obj = {};
    for (const entry of array)
        if (entry.hasOwnProperty(key))
            obj[entry[key]] = entry;
    return obj;
}

function sortById({ id: id1 }, { id: id2 }) {
    if (id1 === id2) return 0;
    return id1 < id2 ? -1 : 1;
}

// *****

/**
 * @typedef {Object} Offer
 * @typedef {Object} RawOffer
 */

/**
 * @callback Hydrator
 * @param {RawOffer}         rawOffer - the offer scrapped from StackOverflow
 * @param {Object}           cheerio
 * @property {CheerioStatic} cheerio.job$ - cheerio for the details page
 * @property {Cheerio}       cheerio.row$ - row cheerio for the listings page
 * @returns {Offer} A proper, hydrated offer
 */

/**
 * @callback Writer
 * @param {Offer|RawOffer} offer - the offer to store (e.g. write to a file)
 */

/**
 * Mine raw data from the cheerio representations
 *
 * @param {Object}        arg
 * @param {String}        arg.id   - job's stackoverflow id
 * @param {CheerioStatic} arg.job$ - cheerio for job's details page
 * @param {Cheerio}       arg.row$ - cheerio for job's row in listing page
 * @returns RawOffer
 */
function scrapData({ id, job$, row$ }) {
    // in the listing page...
    const sub = row$.find("h2 > a[title]").eq(0).parent().next().children();
    const footer = row$.find("div.fs-caption > div:contains(' ago')");

    // in the details page...
    const titleLink = job$("#mainbar h1 > a[title]");
    const aboutHeader = job$("#mainbar h2:icontains('About this job')");
    const techHeader = job$("#mainbar h2:icontains('Technologies')");
    const descrHeader = job$("#mainbar h2:icontains('Job description')");
    const logoLink = job$("#mainbar header.job-details--header a[href]:has(img)");

    const title = titleLink.text().trim();
    const companyName = sub.eq(0).text().trim();
    const location = sub.eq(1).text().trim();
    const companyUri = logoLink.attr("href");
    const companyNick = () => {
        const match = /^\/jobs\/companies\/([^/]+)/.exec(companyUri);
        if (!match) return null;
        return match[1];
    };

    const aboutFn = (label) => aboutHeader.next()
        .find(`div.mb8 span:contains('${label}')`).next()
        .text().trim();

    const tags = techHeader.next().find("a.post-tag")
        .map((_index, element) => job$(element).text().trim()).get()
        .sort()
        .filter((el, i, a) => i === a.indexOf(el));

    const description = descrHeader.next()
        .text().trim()
        .replace(/\n\s*\n\s*\n/g, "\n\n");

    const publishDate = footer.text().trim();

    // The order matters here. YAML and JSON will print them in this order
    const rawOffer = {
        id: ID_PREFIX + id,
        title: title,
        companyName: companyName,
        companyUri: companyUri,
        companyNick: companyNick(),
        location: location,
        jobType: aboutFn("Job type"),
        role: aboutFn("Role"),
        experience: aboutFn("Experience level"),
        industry: aboutFn("Industry"),
        companySize: aboutFn("Company size"),
        companyType: aboutFn("Company type"),
        tags: tags,
        description: description,
        publishDate: publishDate,
    };

    return rawOffer;
}

/**
 * Get a Cheerio for each job in the listing page
 *
 * @param {CheerioStatic} listing$ - Listing page cheerio
 * @returns {Object[]}
 */
function getRowsFromListings(listing$, pg) {
    const rows = [];
    for (const entry of listing$("div.-job[data-jobid]").get()) {
        const row$ = listing$(entry);
        const id = row$.attr("data-jobid");
        rows.push({ id, row$: row$ });
    }
    if (rows.length === 0)
        console.warn(`Found no jobs in page ${pg}`);
    return rows;
}

/**
 * Handle a fetch error
 */
function fetchError(err) {
    const time = new Date().toISOString();
    console.error(`\n${time}  GET ${err.config.url}`);
    console.error(err.config.params);
    console.error(`${err.code}: ${err.message}`);

    if (err.response && err.response.status === 429) {
        console.error("Received 429 Too Many Requests. Bailing...");

        const retry = err.response.headers["retry-after"];
        if (retry > 0)
            console.info(`Note: asked to retry after ${retry} seconds`);

        process.exit(2);
    }
    return null;
}

/**
 * Fetch job details, https://stackoverflow.com/jobs/$id
 *
 * @param {String} id - Job id
 * @param {Object} more - More query parameters
 * @returns ?CheerioStatic
 */
async function fetchDetails(id, more = {}) {
    const url = `/jobs/${id}`;
    const params = { ...more };

    try {
        const jobHTML = await stackoverflow.get(url, { params })
            .then((res) => res.data);

        return cheerio.load(jobHTML);
    } catch (err) {
        return fetchError(err);
    }
}

/**
 * Fetch one listing page, https://stackoverflow.com/jobs?pg=$pg
 *
 * @param {Number} pg - Page number
 * @param {Object} more - More query parameters
 * @returns ?CheerioStatic
 */
async function fetchListing(pg, more = {}) {
    const url = "/jobs";
    const params = { ...COMMON_QUERY_PARAMETERS, ...more, pg };

    try {
        const listingsHTML = await stackoverflow.get(url, { params })
            .then((res) => res.data);

        return cheerio.load(listingsHTML);
    } catch (err) {
        return fetchError(err);
    }
}

/**
 * Fetch the job details from the given id, scrap the data and hydrate it
 *
 * @param {Hydrator} hydrator
 * @returns {?Offer} A proper, hydrated offer, if successful
 */
async function fetchScrapHydrate(hydrator, { id, row$ }) {
    try {
        const job$ = await fetchDetails(id);
        if (!job$) return null;

        const rawOffer = scrapData({ id, job$, row$ });
        if (!rawOffer) return null;

        const offer = hydrator(rawOffer, { id, job$, row$ });
        if (!offer) return null;

        return offer;
    } catch (err) {
        console.error("Exception occurred mining /jobs/%s:\n", id, err);
        return null;
    }
}

/**
 * Dump data to YAML and JSON files
 *
 * @param {Object} offers - One or more job offers
 * @param {String} folder - Dump folder
 * @param {String} basename - Dump file basename
 */
function dumpData(offers, folder = ".", basename = "offers") {
    mkdirp.sync(folder);

    const yaml = YAML.stringify(offers);
    fs.writeFileSync(`${folder}/${basename}.yaml`, yaml);

    const json = JSON.stringify(offers);
    fs.writeFileSync(`${folder}/${basename}.json`, json);
}

/**
 * Get intended pages from a number of pages or array of pages
 *
 * @param {Number|Number[]} pages
 * @returns {Number[]}
 */
function getNumPages(pages) {
    // if we send trash page numbers to stackoverflow it won't complain.
    // usually it just answers back with page #1. We don't want to
    // deal with duplicate jobs or other such stupid nonsense.

    const fuckup = "PAGES should be a positive int or an array of ints";

    if (typeof pages === "object") {
        if (!Array.isArray(pages))
            throw fuckup;
        for (const page of pages)
            if (!Number.isInteger(page))
                throw fuckup;
        return pages;
    }
    if (Number.isInteger(pages) && pages > 0) {
        const arr  = [];
        for (let i = 1; i <= pages; ++i) arr.push(i);
        return arr;
    }
    throw fuckup;
}

// simplistic progress routines
function makeProgressCallbacks() {
    let actual = 0, total = 0;
    let actualPages = 0, totalPages = 0;
    let failed = 0, failedPages = 0;

    const print = (allownl = true) => {
        const a = actual, t = total;
        const ap = actualPages, tp = totalPages;
        const f = failed, fp = failedPages;
        const nl = (allownl && a === t) ? "\n" : "";

        if (process.stderr.isTTY)
            process.stderr.write(
                `\rMining... (${ap}/${tp}p  ${a}/${t}j)  failed: ${fp}p  ${f}j${nl}\r`
            );
    };
    const endJob = () => {
        ++actual;
        print();
    };
    const failJob = () => {
        ++actual;
        ++failed;
        print();
    };
    const addListing = (numJobs = 0) => {
        total += numJobs;
        print(false);
    };
    const endListing = () => {
        ++actualPages;
        print();
    };
    const failListing = () => {
        ++actualPages;
        ++failedPages;
        print();
    };
    const setNumPages = (num) => {
        totalPages = num;
        actual = total = actualPages = failed = 0;
    };

    return { endJob, failJob, addListing, endListing, failListing,
        setNumPages };
}

const DEFAULT_HYDRATOR = (offer) => offer;

const DEFAULT_WRITE_OFFER = (_offers) => {};

const DEFAULT_WRITE_PAGES = (offers, pg) => {
    const folder = `${DEFAULT_PAGE_DUMP_FOLDER}/${pg}`;
    dumpData(offers, folder, "offers");
};

/**
 * Scrap StackOverflow
 *
 * Exits the process if 429 is received on any request
 *
 * @param {Object}          args
 * @param {Number|Number[]} args.pages - The pages to fetch and scrap
 * @param {Object}          args.params - Query parameters for fetch
 * @param {Hydrator}        args.hydrator - Hydrate callback
 * @param {Writer} args.writeOffer - Callback to write individual offers
 * @param {Writer} args.writePages - Callback to write offers from one page
 * @returns {Offer[]} Array of proper, hydrated offers
 */
async function scrapStackOverflow({
    pages = DEFAULT_PAGES,
    params = {},
    hydrator = DEFAULT_HYDRATOR,
    writeOffer = DEFAULT_WRITE_OFFER,
    writePages = DEFAULT_WRITE_PAGES,
    concurrentListingRequests = MAX_CONCURRENT_LISTING_REQUESTS,
    concurrentDetailsRequests = MAX_CONCURRENT_DETAILS_REQUESTS,
} = {}) {
    const pagesList = getNumPages(pages);
    const { endJob, failJob, addListing, endListing, failListing,
        setNumPages } = makeProgressCallbacks();
    setNumPages(pagesList.length);

    const llimit = plimit(concurrentListingRequests);
    const dlimit = plimit(concurrentDetailsRequests);

    // fetch scrap all pages
    const results = await Promise.all(pagesList.map((pg) => llimit(async () => {
        const listing$ = await fetchListing(pg, params);
        if (!listing$) return endListing();

        // scrap all jobs in the listing
        const entries = getRowsFromListings(listing$);
        addListing(entries.length);
        if (entries.length === 0) return failListing();


        // fetch all entries; scrap job details into offers
        const unfiltered = await Promise.all(entries.map(({ id, row$ }) => (
            dlimit(async () => {
                const offer = await fetchScrapHydrate(hydrator, { id, row$ });
                if (!offer) return failJob();

                endJob();
                writeOffer(offer);
                return offer;
            })
        )));
        endListing();

        // remove nulls | sort
        const processed = unfiltered
            .filter((elem) => elem)
            .sort(sortById);

        const offers = { offers: keyBy(processed, "id") };
        writePages(offers, pg);
        return offers;
    })));

    // remove nulls | sort | uniq
    const processed = results
        .filter((elem) => elem)
        .sort(sortById)
        .filter((elem, i, arr) => i === arr.indexOf(elem));

    const offers = { offers: keyBy(processed, "id") };
    return offers;
}

module.exports = scrapStackOverflow;
