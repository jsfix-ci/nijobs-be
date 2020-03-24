/**
 * A scraper for https://stackoverflow.com/jobs
 * Output is written to output/
 */
const axios = require("axios").default;
const plimit = require("p-limit").default;
const cheerio = require("cheerio");

const {
    SCRAP_TIMEOUT,
    TIMEOUT_RETRIES,
    SCRAP_QUERY_PARAMS,
    SCRAP_QUERY_PARAMS_DETAILS,
    SCRAP_CONCURRENT_LISTING,
    SCRAP_CONCURRENT_DETAILS,
    SCRAP_PAGES,
} = require("./config");
const { writeRawBlob, writePageBlobs } = require("./blobs");
const { parseStackOverflow } = require("./parser");

const REQUIRED_QUERY_PARAMS = {};
const REQUIRED_QUERY_PARAMS_DETAILS = {};

const stackoverflow = axios.create({
    baseURL: "https://stackoverflow.com",
    timeout: SCRAP_TIMEOUT,
    method: "GET",
});

// https://github.com/axios/axios/issues/934
stackoverflow.interceptors.request.use(null, (err) => {
    const code = err.code;
    if (!err.config || (code !== "ECONNABORTED" && code !== "ETIMEDOUT")) {
        return Promise.reject(err);
    }
    err.config.retriesCount = (err.config.retriesCount || 0) + 1;
    fetchRetry(err);
    if (err.config.retriesCount <= TIMEOUT_RETRIES) {
        return axios.request(err.config);
    } else {
        return Promise.reject(err);
    }
});

// https://meta.stackoverflow.com/questions/348954
stackoverflow.interceptors.response.use(null, (err) => {
    if (!err.config || !err.response || err.response.status !== 429) {
        return Promise.reject(err);
    }
    console.error("Received 429 Too Many Requests. Bailing...");
    const retry = err.response.headers["retry-after"];
    if (retry > 0)
        console.info(`Note: asked to retry after ${retry} seconds`);
    return process.exit(2); /* eslint-disable */
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

function fetchRetry(err) {
    const time = new Date().toISOString();
    const retries = err.config.retriesCount;
    const max = TIMEOUT_RETRIES;
    console.error(`\n\n${time}  GET ${err.config.url}`);
    console.error(err.config.params);
    console.error(`${err.code}: ${err.message}`);
    if (retries >= max)
        console.error(`Retries [${retries}/${max}]: Giving up...`);
    else
        console.error(`Retries [${retries}/${max}]: Trying again...`);
}

async function fetchDetails(id) {
    const url = `/jobs/${id}`;
    const params = { ...REQUIRED_QUERY_PARAMS_DETAILS,
        ...SCRAP_QUERY_PARAMS_DETAILS };

    try {
        const jobHTML = await stackoverflow.get(url, { params })
            .then((res) => res.data);

        return cheerio.load(jobHTML);
    } catch (err) {
        return null;
    }
}

async function fetchListing(pg) {
    const url = "/jobs";
    const params = { ...REQUIRED_QUERY_PARAMS,
        ...SCRAP_QUERY_PARAMS, pg };

    try {
        const listingsHTML = await stackoverflow.get(url, { params })
            .then((res) => res.data);

        return cheerio.load(listingsHTML);
    } catch (err) {
        return null;
    }
}

async function fetchScrap({ id, row$ }) {
    try {
        const job$ = await fetchDetails(id);
        if (!job$) return null;

        const raw = parseStackOverflow({ id, job$, row$ });
        if (!raw) return null;

        return raw;
    } catch (err) {
        console.error("Exception occurred mining /jobs/%s:\n", id, err);
        return null;
    }
}

function getNumPages() {
    // if we send trash page numbers to stackoverflow it won't complain.
    // usually it just answers back with page #1. We don't want to
    // deal with duplicate jobs or other such stupid nonsense.

    const fuckup = "PAGES should be a positive int or an array of ints";
    const pages = SCRAP_PAGES;

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
        setNumPages, print };
}

async function scrapStackOverflow() {
    const pages = getNumPages();
    const { endJob, failJob, addListing, endListing, failListing,
        setNumPages, print } = makeProgressCallbacks();
    setNumPages(pages.length);

    const llimit = plimit(SCRAP_CONCURRENT_LISTING);
    const dlimit = plimit(SCRAP_CONCURRENT_DETAILS);
    print(false);

    // fetch scrap all pages
    const results = await Promise.all(pages.map((pg) => llimit(async () => {
        const listing$ = await fetchListing(pg);
        if (!listing$) return endListing();

        // scrap all jobs in the listing
        const entries = getRowsFromListings(listing$);
        addListing(entries.length);
        if (entries.length === 0) return failListing();


        // fetch all entries; scrap job details into offers
        const unfiltered = await Promise.all(entries.map(({ id, row$ }) => (
            dlimit(async () => {
                const raw = await fetchScrap({ id, row$ });
                if (!raw) return failJob();

                writeRawBlob(raw);
                endJob();
                return raw;
            })
        )));
        endListing();

        // remove nulls
        const processed = unfiltered.filter((elem) => elem);

        const keyed = keyBy(processed, "id");
        writePageBlobs(keyed, pg);
        return keyed;
    })));

    // remove nulls | sort | uniq
    const processed = results
        .filter((elem) => elem)
        .sort(sortById)
        .filter((elem, i, arr) => i === arr.indexOf(elem));

    const offers = keyBy(processed, "id");
    return offers;
}

module.exports = scrapStackOverflow;
