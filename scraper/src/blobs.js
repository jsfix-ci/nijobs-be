// Write, read and manipulate files under output/
const fs = require("fs");
const mkdirp = require("mkdirp");
const glob = require("glob");
const rimraf = require("rimraf");

const { error } = require("./progress");
const { keyBy } = require("./utils");
const {
    writeHTML,
    readHTML,
    writeYAML,
    readYAML,
    mergeFiles,
    removeFile,
    removeFiles,
} = require("./files");

function isFilename(file) {
    return /\.(?:json|yaml|html)$/iu.test(file);
}

function basename(file) {
    return /\/([^/]+)\.(?:json|yaml|html)$/iu.exec(file)[1];
}

// *** html write/read/get

function writeJobListingHTML(html, pg) {
    if (isFilename(pg)) return writeHTML(pg, html);
    return writeHTML(`out/listings/offers/${pg}.html`, html);
}

function writeCompanyListingHTML(html, pg) {
    if (isFilename(pg)) return writeHTML(pg, html);
    return writeHTML(`out/listings/companies/${pg}.html`, html);
}

function writeJobHTML(html, id) {
    if (isFilename(id)) return writeHTML(id, html);
    return writeHTML(`out/html/offers/${id}.html`, html);
}

function writeCompanyHTML(html, id) {
    if (isFilename(id)) return writeHTML(id, html);
    return writeHTML(`out/html/companies/${id}.html`, html);
}

function readJobListingHTML(pg) {
    if (isFilename(pg)) return readHTML(pg);
    return readHTML(`out/listings/offers/${pg}.html`);
}

function readCompanyListingHTML(pg) {
    if (isFilename(pg)) return readHTML(pg);
    return readHTML(`out/listings/companies/${pg}.html`);
}

function readJobHTML(id) {
    if (isFilename(id)) return readHTML(id);
    return readHTML(`out/html/offers/${id}.html`);
}

function readCompanyHTML(id) {
    if (isFilename(id)) return readHTML(id);
    return readHTML(`out/html/companies/${id}.html`);
}

function getJobListingPages() {
    return glob.sync("out/listings/offers/*.html").map(basename);
}

function getCompanyListingPages() {
    return glob.sync("out/listings/companies/**/*.html").map(basename);
}

function getJobHTMLIds() {
    return glob.sync("out/html/offers/*.html").map(basename);
}

function getCompanyHTMLIds() {
    return glob.sync("out/html/companies/*.html").map(basename);
}

// *** raw read/write/get/merge

function writeRawOffer(offer) {
    writeYAML(`out/raw/offers/${offer.id}.yaml`, offer);
}

function writeRawCompany(company) {
    writeYAML(`out/raw/companies/${company.id}.yaml`, company);
}

function readRawOffer(id) {
    if (isFilename(id)) return readYAML(id);
    return readYAML(`out/raw/offers/${id}.yaml`);
}

function readRawCompany(id) {
    if (isFilename(id)) return readYAML(id);
    return readYAML(`out/raw/companies/${id}.yaml`);
}

function readAllRawOffers() {
    return keyBy(glob.sync("out/raw/offers/*.yaml").map(readYAML));
}

function readAllRawCompanies() {
    return keyBy(glob.sync("out/raw/companies/*.yaml").map(readYAML));
}

function getRawOfferIds() {
    return glob.sync("out/raw/offers/*.yaml").map(basename);
}

function getRawCompanyIds() {
    return glob.sync("out/raw/companies/*.yaml").map(basename);
}

function mergeRawOffers() {
    mergeFiles("out/raw/offers/*.yaml", "out/offers_raw.json");
}

function mergeRawCompanies() {
    mergeFiles("out/raw/companies/*.yaml", "out/companies_raw.json");
}

function mergeRaw() {
    mergeRawOffers();
    mergeRawCompanies();
}

// *** link read/write/get/merge

function writeLinkOffer(offer) {
    writeYAML(`out/link/offers/${offer.id}.yaml`, offer);
}

function writeLinkCompany(company) {
    writeYAML(`out/link/companies/${company.id}.yaml`, company);
}

function readLinkOffer(id) {
    if (isFilename(id)) return readYAML(id);
    return readYAML(`out/link/offers/${id}.yaml`);
}

function readLinkCompany(id) {
    if (isFilename(id)) return readYAML(id);
    return readYAML(`out/link/companies/${id}.yaml`);
}

function readAllLinkOffers() {
    return keyBy(glob.sync("out/link/offers/*.yaml").map(readYAML));
}

function readAllLinkCompanies() {
    return keyBy(glob.sync("out/link/companies/*.yaml").map(readYAML));
}

function getLinkOfferIds() {
    return glob.sync("out/link/offers/*.yaml").map(basename);
}

function getLinkCompanyIds() {
    return glob.sync("out/link/companies/*.yaml").map(basename);
}

function mergeLinkOffers() {
    mergeFiles("out/link/offers/*.yaml", "out/offers_link.json");
}

function mergeLinkCompanies() {
    mergeFiles("out/link/companies/*.yaml", "out/companies_link.json");
}

function mergeLink() {
    mergeLinkOffers();
    mergeLinkCompanies();
}

// *** orphans write/read/get/merge

function writeOrphan(offer) {
    writeYAML(`out/orphans/${offer.id}.yaml`, offer);
}

function readOrphan(id) {
    if (isFilename(id)) return readYAML(id);
    return readYAML(`out/orphans/${id}.yaml`);
}

function readAllOrphans() {
    return keyBy(glob.sync("out/orphans/*.yaml").map(readYAML));
}

function getOrphanIds() {
    return glob.sync("out/orphans/*.yaml").map(basename);
}

function mergeOrphan() {
    mergeFiles("out/orphans/*.yaml", "out/offers_orphan.json");
}

function adoptOrphanJob(offer) {
    removeFile(`out/orphans/${offer.id}.yaml`);
    writeYAML(`out/link/offers/${offer.id}.yaml`, offer);
}

// *** nijobs read/write/get/merge

function writeNijobsOffer(offer) {
    writeYAML(`out/nijobs/offers/${offer.id}.yaml`, offer);
}

function writeNijobsCompany(company) {
    writeYAML(`out/nijobs/companies/${company.id}.yaml`, company);
}

function readNijobsOffer(id) {
    if (isFilename(id)) return readYAML(id);
    return readYAML(`out/nijobs/offers/${id}.yaml`);
}

function readNijobsCompany(id) {
    if (isFilename(id)) return readYAML(id);
    return readYAML(`out/nijobs/companies/${id}.yaml`);
}

function readAllNijobsOffers() {
    return keyBy(glob.sync("out/nijobs/offers/*.yaml").map(readYAML));
}

function readAllNijobsCompanies() {
    return keyBy(glob.sync("out/nijobs/companies/*.yaml").map(readYAML));
}

function getNijobsOfferIds() {
    return glob.sync("out/nijobs/offers/*.yaml").map(basename);
}

function getNijobsCompanyIds() {
    return glob.sync("out/nijobs/companies/*.yaml").map(basename);
}

function mergeNijobsOffers() {
    mergeFiles("out/nijobs/offers/*.yaml", "out/offers_nijobs.json");
}

function mergeNijobsCompanies() {
    mergeFiles("out/nijobs/companies/*.yaml", "out/companies_nijobs.json");
}

function mergeNijobs() {
    mergeNijobsOffers();
    mergeNijobsCompanies();
}

// *** accept

function acceptOffers() {
    const offersFile = "out/offers_nijobs.json";
    if (!fs.existsSync(offersFile)) {
        error("Offers file offers/all_nijobs.json doesn't exist");
        return;
    }
    mkdirp.sync("data");
    fs.copyFileSync(offersFile, "data/offers.json");
}

function acceptCompanies() {
    const companiesFile = "out/companies_nijobs.json";
    if (!fs.existsSync(companiesFile)) {
        error("Companies file companies/all_nijobs.json doesn't exist");
        return;
    }
    mkdirp.sync("data");
    fs.copyFileSync(companiesFile, "data/companies.json");
}

function accept() {
    acceptOffers();
    acceptCompanies();
}

// *** clean

function cleanListings() {
    rimraf.sync("out/listings/");
}

function cleanHTML() {
    rimraf.sync("out/html/");
}

function cleanRaw() {
    rimraf.sync("out/raw/");
    rimraf.sync("out/offers_raw.json");
    rimraf.sync("out/companies_raw.json");
}

function cleanLink() {
    rimraf.sync("out/link/");
    rimraf.sync("out/offers_link.json");
    rimraf.sync("out/companies_link.json");
}

function cleanOrphan() {
    rimraf.sync("out/orphan/");
    rimraf.sync("out/offers_orphan.json");
}

function cleanNijobs() {
    rimraf.sync("out/nijobs/");
    rimraf.sync("out/offers_nijobs.json");
    rimraf.sync("out/companies_nijobs.json");
}

function cleanAccept() {
    rimraf.sync("data/");
}

module.exports = Object.freeze({
    writeJobListingHTML,
    writeCompanyListingHTML,
    writeJobHTML,
    writeCompanyHTML,
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
    readRawOffer,
    readRawCompany,
    readAllRawOffers,
    readAllRawCompanies,
    getRawOfferIds,
    getRawCompanyIds,
    mergeRawOffers,
    mergeRawCompanies,
    mergeRaw,

    writeLinkOffer,
    writeLinkCompany,
    readLinkOffer,
    readLinkCompany,
    readAllLinkOffers,
    readAllLinkCompanies,
    getLinkOfferIds,
    getLinkCompanyIds,
    mergeLinkOffers,
    mergeLinkCompanies,
    mergeLink,

    writeOrphan,
    readOrphan,
    readAllOrphans,
    getOrphanIds,
    mergeOrphan,
    adoptOrphanJob,

    writeNijobsOffer,
    writeNijobsCompany,
    readNijobsOffer,
    readNijobsCompany,
    readAllNijobsOffers,
    readAllNijobsCompanies,
    getNijobsOfferIds,
    getNijobsCompanyIds,
    mergeNijobsOffers,
    mergeNijobsCompanies,
    mergeNijobs,

    acceptOffers,
    acceptCompanies,
    accept,

    cleanListings,
    cleanHTML,
    cleanRaw,
    cleanLink,
    cleanOrphan,
    cleanNijobs,
    cleanAccept,
});
