// Tweak newly created nijobs offers and companies to conform to spec
const { onelineTruncated, multilineTruncated } = require("./strings");
const specs = require("./specs");
const { info, warn } = require("./progress");
const { shuffleArray } = require("./utils");

const makeTweaks = () => ({
    offer: {
        title: 0,
        description: 0,
        min_technologies: 0,
        max_technologies: 0,
        min_fields: 0,
        max_fields: 0,
    },
    company: {
        min_name: 0,
        max_name: 0,
        bio: 0,
    },
});

const wr = (write, template, value) => value === 0 || write(template, value);

function writeTweaksOffers(tweaks) {
    const otweaks = tweaks.offer;
    wr(info, "Trimmed %d offer titles", otweaks.title);
    wr(info, "Trimmed %d offer descriptions", otweaks.description);
    wr(warn, "Added common tech to %d offers", otweaks.min_technologies);
    wr(info, "Spliced %d offer tech lists", otweaks.max_technologies);
    wr(warn, "Added common fields to %d offers", otweaks.min_fields);
    wr(info, "Spliced %d offer fields", otweaks.max_fields);
    for (const key in otweaks) otweaks[key] = 0;
}

function writeTweaksCompanies(tweaks) {
    const ctweaks = tweaks.company;
    wr(warn, "Extended %d company names", ctweaks.min_name);
    wr(info, "Trimmed %d company names", ctweaks.max_name);
    wr(info, "Trimmed %d company bios", ctweaks.bio);
    for (const key in ctweaks) ctweaks[key] = 0;
}

function tweakOffer(offer, otweaks, sorters) {
    if (offer.title.length > specs.offer_title_max_length) {
        ++otweaks.title;
        offer.title = onelineTruncated(offer.title,
            specs.offer_title_max_length);
    }
    if (offer.description.length > specs.offer_description_max_length) {
        ++otweaks.description;
        offer.description = multilineTruncated(offer.description,
            specs.offer_description_max_length);
    }
    if (offer.technologies.length < specs.min_technologies) {
        ++otweaks.min_technologies;
        const difference = specs.defaultTechnologies
            .filter((tech) => !offer.technologies.includes(tech));
        const newTech = shuffleArray(difference)
            .slice(0, specs.min_technologies - offer.technologies.length);
        offer.technologies = [...offer.technologies, ...newTech];
    }
    if (offer.technologies.length > specs.max_technologies) {
        ++otweaks.max_technologies;
        offer.technologies.sort(sorters.technologies).splice(specs.max_technologies);
    }
    if (offer.fields.length < specs.min_fields) {
        ++otweaks.min_fields;
        const difference = specs.defaultFields
            .filter((field) => !offer.fields.includes(field));
        const newFields = shuffleArray(difference)
            .slice(0, specs.min_fields - offer.fields.length);
        offer.fields = [...offer.fields, ...newFields];
    }
    if (offer.fields.length > specs.max_fields) {
        ++otweaks.max_fields;
        offer.fields.sort(sorters.fields).splice(specs.max_fields);
    }
}

function tweakCompany(company, ctweaks) {
    if (company.name.length < specs.company_name_min_length) {
        ++ctweaks.min_name;
        if (company.name.length + 8 >= specs.company_name_min_length)
            company.name += " Company";
    }
    if (company.name.length > specs.company_name_max_length) {
        ++ctweaks.max_name;
        company.name = onelineTruncated(company.name,
            specs.company_name_max_length);
    }
    if (company.bio.length > specs.company_bio_max_length) {
        ++ctweaks.bio;
        company.bio = multilineTruncated(company.bio,
            specs.company_bio_max_length);
    }
}

function tweak(offers, companies) {
    const sorters = makeSorters(offers);
    const tweaks = makeTweaks();
    info("Tweaking offers...");
    for (const id in offers)
        tweakOffer(offers[id], tweaks.offer, sorters);
    writeTweaksOffers(tweaks);
    info("Tweaking companies...");
    for (const id in companies)
        tweakCompany(companies[id], tweaks.company);
    writeTweaksCompanies(tweaks);
    return { offers, companies };
}

function makeSorters(offers) {
    // counts
    const T = {}, F = {};
    for (const id in offers)
        for (const technology of offers[id].technologies)
            T[technology] = (T[technology] || 0) + 1;
    for (const id in offers)
        for (const field of offers[id].fields)
            F[field] = (F[field] || 0) + 1;
    return {
        technologies: (tech1, tech2) => {
            if (tech1 === tech2) return 0;
            if (T[tech1] === T[tech2]) return 0;
            return T[tech1] > T[tech2] ? -1 : 1;
        },
        fields: (field1, field2) => {
            if (field1 === field2) return 0;
            if (F[field1] === F[field2]) return 0;
            return F[field1] > F[field2] ? -1 : 1;
        },
    };
}

module.exports = { tweak };
