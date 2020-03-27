// Convert linked offers and companies to nijobs format
const { keyBy } = require("./utils");
const { progress } = require("./progress");
const {
    getLinkOfferIds,
    getLinkCompanyIds,
    readLinkOffer,
    readLinkCompany,
    writeNijobsOffer,
    writeNijobsCompany,
} = require("./blobs");
const {
    convertJob,
    convertCompany,
} = require("./convert");

function convertOffers(ids) {
    if (ids.length === 0) return [];
    const tracker = progress("Converting offers...", ids.length);
    const nijobsOffers = ids.map((id) => {
        const linkedOffer = readLinkOffer(id);
        const nijobsOffer = convertJob(linkedOffer);
        tracker.success();
        return nijobsOffer;
    });
    return keyBy(nijobsOffers, "id");
}

function convertCompanies(ids) {
    if (ids.length === 0) return [];
    const tracker = progress("Converting companies...", ids.length);
    const nijobsCompanies = ids.map((id) => {
        const linkedCompany = readLinkCompany(id);
        const nijobsCompany = convertCompany(linkedCompany);
        tracker.success();
        return nijobsCompany;
    });
    return keyBy(nijobsCompanies, "id");
}

function convert() {
    convertOffers();
    convertCompanies();
}

function convertAllOffers() {
    const ids = getLinkOfferIds();
    const offers = convertOffers(ids);
    Object.values(offers).forEach(writeNijobsOffer);
    return offers;
}

function convertAllCompanies() {
    const ids = getLinkCompanyIds();
    const companies = convertCompanies(ids);
    Object.values(companies).forEach(writeNijobsCompany);
    return companies;
}

function convertAll() {
    convertAllOffers();
    convertAllCompanies();
}

module.exports = Object.freeze({ convert, convertAll });
