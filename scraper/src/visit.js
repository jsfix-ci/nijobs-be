// Scrap listings and visit the job pages listed in them
const { warn } = require("./progress");
const {
    scrapAllJobListings,
    scrapAllCompanyListings,
} = require("./scrap");
const {
    fetchJobPages,
    fetchCompanyPages,
} = require("./fetch");

function visitJobs() {
    const ids = scrapAllJobListings();
    if (!ids || ids.length === 0) {
        warn("Visitor: Warning: No job ids found -- visiting no job pages");
        return false;
    }
    return fetchJobPages(ids);
}

function visitCompanies() {
    const ids = scrapAllCompanyListings();
    if (!ids || ids.length === 0) {
        warn("Visitor: Warning: No company ids found -- visiting no company pages");
        return false;
    }
    return fetchCompanyPages(ids);
}

async function visitAll() {
    const jobIds = await visitJobs();
    const companyIds = await visitCompanies();
    return { jobIds, companyIds };
}

module.exports = Object.freeze({
    visitJobs,
    visitCompanies,
    visitAll,
});
