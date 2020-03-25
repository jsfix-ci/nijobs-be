/**
 * A scraper for https://stackoverflow.com/jobs
 * Output is written to output/
 */
const plimit = require("p-limit").default;
const cheerio = require("cheerio");
const got = require("got").default;

const {
    SCRAP_TIMEOUT,
    SCRAP_TIMEOUT_RETRIES,
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

const stackoverflow = got.extend({
    prefixUrl: "https://stackoverflow.com",
    retry: SCRAP_TIMEOUT_RETRIES,
    timeout: SCRAP_TIMEOUT,
});

function keyBy(array, key) {
    const obj = {};
    for (const entry of array)
        if ({}.hasOwnProperty.call(entry, key))
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

async function fetchDetails(id) {
    const url = `/jobs/${id}`;
    const searchParams = { ...REQUIRED_QUERY_PARAMS_DETAILS,
        ...SCRAP_QUERY_PARAMS_DETAILS };

    try {
        const jobHTML = await stackoverflow(url, { searchParams }).text();

        return cheerio.load(jobHTML);
    } catch (err) {
        console.error(err.message ? err.message : err);
        return null;
    }
}

async function fetchListing(pg) {
    const url = "/jobs";
    const searchParams = { ...REQUIRED_QUERY_PARAMS,
        ...SCRAP_QUERY_PARAMS, pg };

    try {
        const listingsHTML = await stackoverflow(url, { searchParams }).text();

        return cheerio.load(listingsHTML);
    } catch (err) {
        console.error(err.message ? err.message : err);
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
    const pages = SCRAP_PAGES.split(/,|;/g);
    for (const page in pages) {
        if (/(?:\d+(?:-\d+)?)+/g.test(page)) continue;
        console.error("Invalid SCRAP_PAGES value");
        process.exit(2);
    }
    return pages
        .map((page) => {
            if (/^\d+-\d+$/.test(page)) {
                const [min, max] = page.split("-");
                const arr  = [];
                for (let i = +min; i <= +max; ++i) arr.push(i);
                return arr;
            } else {
                return +page;
            }
        }).reduce((acc, value) => acc.concat(value), []);
}

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
                `\rMining... (${ap}/${tp}p  ${a}/${t}j)  failed: ${fp}p  ${f}j${nl}\r`,
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

    const results = await Promise.all(pages.map((pg) => llimit(async () => {
        const listing$ = await fetchListing(pg);
        if (!listing$) return failListing();

        const entries = getRowsFromListings(listing$, pg);
        addListing(entries.length);
        if (entries.length === 0) return failListing();


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
