// Read html blobs and get jobs and companies
const { keyBy, sortById, removeNulls, uniq } = require("./utils");
const { progress } = require("./progress");
const {
    readJobListingHTML,
    readCompanyListingHTML,
    readJobHTML,
    readCompanyHTML,
    getJobListingPages,
    getCompanyListingPages,
    getJobHTMLIds,
    getCompanyHTMLIds,
    writeRawOffer,
    writeRawCompany,
} = require("./blobs");
const {
    parseJobListingHTML,
    parseCompanyListingHTML,
    parseJobHTML,
    parseCompanyHTML,
} = require("./html");

function scrapJobListings(files) {
    if (files.length === 0) return [];
    const tracker = progress("Scraping job listings...", files.length);
    const idsids = files.map((file) => {
        const html = readJobListingHTML(file);
        const ids = parseJobListingHTML(html);
        if (!ids || ids.length === 0) {
            tracker.fail();
            return [];
        } else {
            tracker.success();
            return ids;
        }
    });
    const ids = [].concat.apply([], idsids).sort().filter(uniq);
    return ids;
}

function scrapCompanyListings(files) {
    if (files.length === 0) return [];
    const tracker = progress("Scraping company listings...", files.length);
    const idsids = files.map((file) => {
        const html = readCompanyListingHTML(file);
        const ids = parseCompanyListingHTML(html);
        if (!ids || ids.length === 0) {
            tracker.fail();
            return [];
        } else {
            tracker.success();
            return ids;
        }
    });
    const ids = [].concat.apply([], idsids).sort().filter(uniq);
    return ids;
}

function scrapJobs(ids) {
    if (ids.length === 0) return [];
    const tracker = progress("Scraping jobs...", ids.length);
    const rawOffers = ids.map((id) => {
        const html = readJobHTML(id);
        const rawOffer = parseJobHTML(html, id);
        if (!rawOffer) {
            tracker.fail();
            return null;
        } else {
            tracker.success();
            return rawOffer;
        }
    }).filter(removeNulls).sort(sortById).filter(uniq);
    return keyBy(rawOffers, "id");
}

function scrapCompanies(ids) {
    if (ids.length === 0) return [];
    const tracker = progress("Scraping companies...", ids.length);
    const rawCompanies = ids.map((id) => {
        const html = readCompanyHTML(id);
        const rawCompany = parseCompanyHTML(html, id);
        if (!rawCompany) {
            tracker.fail();
            return null;
        } else {
            tracker.success();
            return rawCompany;
        }
    }).filter(removeNulls).sort(sortById).filter(uniq);
    return keyBy(rawCompanies, "id");
}

function scrap(jobIds, companyIds) {
    const rawJobs = scrapJobs(jobIds);
    const rawCompanies = scrapCompanies(companyIds);
    return { rawJobs, rawCompanies };
}

function scrapAllJobListings() {
    const files = getJobListingPages();
    return scrapJobListings(files);
}

function scrapAllCompanyListings() {
    const files = getCompanyListingPages();
    return scrapCompanyListings(files);
}

function scrapAllJobs() {
    const ids = getJobHTMLIds();
    const rawJobs = scrapJobs(ids);
    Object.values(rawJobs).forEach(writeRawOffer);
    return rawJobs;
}

function scrapAllCompanies() {
    const ids = getCompanyHTMLIds();
    const rawCompanies = scrapCompanies(ids);
    Object.values(rawCompanies).forEach(writeRawCompany);
    return rawCompanies;
}

function scrapAll() {
    const rawJobs = scrapAllJobs();
    const rawCompanies = scrapAllCompanies();
    return { rawJobs, rawCompanies };
}

module.exports = Object.freeze({
    scrapJobListings,
    scrapCompanyListings,
    scrapJobs,
    scrapCompanies,
    scrap,

    scrapAllJobListings,
    scrapAllCompanyListings,
    scrapAllJobs,
    scrapAllCompanies,
    scrapAll,
});
