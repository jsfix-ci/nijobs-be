// Fetch stackoverflow.com/jobs pages and write them to html blobs
const plimit = require("p-limit").default;
const got = require("got").default;

const { error, progress } = require("./progress");
const { endofpath } = require("./strings");
const {
    SCRAP_TIMEOUT,
    SCRAP_TIMEOUT_RETRIES,
    QUERY_JOB_LISTING,
    QUERY_COMPANY_LISTING,
    QUERY_JOB,
    QUERY_COMPANY,
    SCRAP_CONCURRENT,
    SCRAP_PAGES_JOBS,
    SCRAP_PAGES_COMPANIES,
} = require("./config");
const {
    writeJobListingHTML,
    writeCompanyListingHTML,
    writeJobHTML,
    writeCompanyHTML,
} = require("./blobs");

const stackoverflow = got.extend({
    prefixUrl: "https://stackoverflow.com",
    retry: SCRAP_TIMEOUT_RETRIES,
    timeout: SCRAP_TIMEOUT,
});

const fetchedJobs = new Set();
const fetchedCompanies = new Set();

function jobURL(id) {
    if (id[0] === "/") return { id: endofpath(id), url: id };
    return { url: `/jobs/${id}`, id };
}

function companyURL(id) {
    if (id[0] === "/") return { id: endofpath(id), url: id };
    return { url: `/jobs/companies/${id}`, id };
}

async function fetchOneJobListing(pg) {
    const url = "/jobs";
    const searchParams = { ...QUERY_JOB_LISTING, pg };
    const html = await fetchHTML(url, searchParams);
    if (!html) return false;
    writeJobListingHTML(html, pg);
    return true;
}

async function fetchOneCompanyListing(pg) {
    const url = "/jobs/companies";
    const searchParams = { ...QUERY_COMPANY_LISTING, pg };
    const html = await fetchHTML(url, searchParams);
    if (!html) return false;
    writeCompanyListingHTML(html, pg);
    return true;
}

async function fetchOneJobPage(idorUrl) {
    const { url, id } = jobURL(idorUrl);
    if (fetchedJobs.has(id)) return true;
    fetchedJobs.add(id);
    const searchParams = { ...QUERY_JOB };
    const html = await fetchHTML(url, searchParams);
    if (!html) return false;
    writeJobHTML(html, id);
    return true;
}

async function fetchOneCompanyPage(idorUrl) {
    const { url, id } = companyURL(idorUrl);
    if (fetchedCompanies.has(id)) return true;
    fetchedCompanies.add(id);
    const searchParams = { ...QUERY_COMPANY };
    const html = await fetchHTML(url, searchParams);
    if (!html) return false;
    writeCompanyHTML(html, id);
    return true;
}

async function fetchHTML(url, searchParams) {
    try {
        return await stackoverflow(url, { searchParams }).text();
    } catch (err) {
        error(err.message ? err.message : err);
        return null;
    }
}

async function fetchJobListings() {
    const limit = plimit(SCRAP_CONCURRENT);
    const pages = SCRAP_PAGES_JOBS;
    const fetched = [];
    const tracker = progress("Fetching job listings...", pages.length);
    await Promise.all(pages.map((pg) => limit(async () => {
        const ok = await fetchOneJobListing(pg);
        if (ok) {
            tracker.success();
            fetched.push(pg);
        } else {
            tracker.fail();
        }
    })));
    return fetched;
}

async function fetchCompanyListings() {
    const limit = plimit(SCRAP_CONCURRENT);
    const pages = SCRAP_PAGES_COMPANIES;
    const fetched = [];
    const tracker = progress("Fetching company listings...", pages.length);
    await Promise.all(pages.map((pg) => limit(async () => {
        const ok = await fetchOneCompanyListing(pg);
        if (ok) {
            tracker.success();
            fetched.push(pg);
        } else {
            tracker.fail();
        }
    })));
    return fetched;
}

async function fetchJobPages(ids) {
    const limit = plimit(SCRAP_CONCURRENT);
    const fetched = [];
    const tracker = progress("Fetching job pages...", ids.length);
    await Promise.all(ids.map((id) => limit(async () => {
        const ok = await fetchOneJobPage(id);
        if (ok) {
            tracker.success();
            fetched.push(jobURL(id).id);
        } else {
            tracker.fail();
        }
    })));
    return fetched;
}

async function fetchCompanyPages(ids) {
    const limit = plimit(SCRAP_CONCURRENT);
    const fetched = [];
    const tracker = progress("Fetching company pages...", ids.length);
    await Promise.all(ids.map((id) => limit(async () => {
        const ok = await fetchOneCompanyPage(id);
        if (ok) {
            tracker.success();
            fetched.push(companyURL(id).id);
        } else {
            tracker.fail();
        }
    })));
    return fetched;
}

async function fetchListings() {
    const jobPages = await fetchJobListings();
    const companyPages = await fetchCompanyListings();
    return { jobPages, companyPages };
}

async function fetchPages(jobs, companies) {
    const jobIds = await fetchJobPages(jobs);
    const companyIds = await fetchCompanyPages(companies);
    return { jobIds, companyIds };
}

module.exports = Object.freeze({
    fetchJobListings,
    fetchCompanyListings,
    fetchJobPages,
    fetchCompanyPages,

    fetchListings,
    fetchPages,
});
