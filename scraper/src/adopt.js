// Fetch missing companies for orphan jobs, scrap them and move them
const { removeNulls, uniq } = require("./utils");
const { info } = require("./progress");
const {
    writeRawCompany,
    readAllOrphans,
    writeLinkCompany,
    readAllLinkCompanies,
    adoptOrphanJob,
} = require("./blobs");
const { fetchCompanyPages } = require("./fetch");
const { scrapCompanies } = require("./scrap");
const { splitOrphans } = require("./link");

async function adopt(orphans) {
    if (orphans.length === 0) {
        info("No orphans to adopt");
        return {};
    }

    const numOrphans = Object.keys(orphans).length;

    const sopaths = Object.values(orphans)
        .map((orphan) => orphan.company.sopath)
        .filter(removeNulls).sort().filter(uniq);

    // 1. visit
    info("Fetching %d companies for %d orphans...", sopaths.length, numOrphans);
    const promise = fetchCompanyPages(sopaths);
    const allCompanies = readAllLinkCompanies(); // efficiency
    const ids = await promise;
    info("Fetched %d companies (out of %d)", ids.length, sopaths.length);

    // 2. scrap
    const newCompanies = scrapCompanies(ids);
    Object.values(newCompanies).forEach(writeRawCompany);
    const numNew = Object.keys(newCompanies).length;
    info("Accepted %d new parent companies (out of %d)", ids.length, numNew);

    const companies = { ...allCompanies, ...newCompanies };

    const adopted = splitOrphans(orphans, companies);
    const numAdopted = Object.keys(adopted).length;
    info("Adopted %d offers (out of %d)", numAdopted, numOrphans);

    Object.values(adopted).forEach(adoptOrphanJob);
    Object.values(newCompanies).forEach(writeLinkCompany);

    return adopted;
}

function adoptAll() {
    const orphans = readAllOrphans();
    return adopt(orphans);
}

module.exports = Object.freeze({
    adopt,
    adoptAll,
});
