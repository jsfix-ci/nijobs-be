// Convert nijobs offers/companies to mongo stuff
const {
    readAllNijobsOffers,
    readAllNijobsCompanies,
    acceptData,
} = require("./blobs");

function stubOffer(offer) {
    offer._stubid = offer.id;
    offer._company = offer.company;
    delete offer.id;
    delete offer.company;
    return offer;
}

function stubCompany(company) {
    company._stubid = company.id;
    delete company.id;
    return company;
}

function accept(nijobsOffers, nijobsCompanies) {
    const arrOffers = [];
    const arrCompanies = [];
    for (const id in nijobsOffers)
        arrOffers.push(stubOffer(nijobsOffers[id]));
    for (const id in nijobsCompanies)
        arrCompanies.push(stubCompany(nijobsCompanies[id]));
    return { offers: arrOffers, companies: arrCompanies };
}

function acceptAll() {
    const nijobsOffers = readAllNijobsOffers();
    const nijobsCompanies = readAllNijobsCompanies();
    const { offers, companies } = accept(nijobsOffers, nijobsCompanies);
    acceptData(offers, companies);
    return { offers, companies };
}

module.exports = {
    stubOffer,
    stubCompany,
    accept,
    acceptAll,
};
