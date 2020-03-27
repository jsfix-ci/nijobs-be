// Analyze and link the result of a scrap of multiple jobs and companies
const { keyBy } = require("./utils");
const { jobAssignOwner } = require("./tidy");
const { info } = require("./progress");
const {
    readAllRawOffers,
    readAllRawCompanies,
    writeLinkOffer,
    writeLinkCompany,
    writeOrphan,
} = require("./blobs");

function splitOrphans(jobs, companies) {
    const linked = [], orphan = [];
    info("Inspecting %d jobs...", Object.keys(jobs).length);
    Object.values(jobs).forEach((job) => {
        if (jobAssignOwner(job, companies)) return linked.push(job);
        return orphan.push(job);
    });
    if (orphan.length > 0) {
        info("Found %d orphan jobs (out of %d)",
            orphan.length, Object.keys(jobs).length);
        orphan.forEach(writeOrphan);
    }
    return keyBy(linked, "id");
}

function linkRaw(rawJobs, companies) {
    const offers = splitOrphans(rawJobs, companies);
    Object.values(offers).forEach(writeLinkOffer);
    Object.values(companies).forEach(writeLinkCompany);
    return { offers, companies };
}

function linkRawAll() {
    const rawOffers = readAllRawOffers();
    const rawCompanies = readAllRawCompanies();
    return linkRaw(rawOffers, rawCompanies);
}

// *** join job and company scraps

module.exports = Object.freeze({
    splitOrphans,
    linkRaw,
    linkRawAll,
});
