// Convert StackOverflow raw job/company to nijobs offer/company
const { mapTags } = require("./tags");
const { guessFields } = require("./roles");
const { domainname, oneline, english } = require("./strings");
const {
    randomBoolean,
    randomVacancies,
    randomPhoneNumber,
    randomOf,
    fewWeeksAfter,
    randomJobDuration,
} = require("./random");
const JobTypes = require("../../src/models/JobTypes");

function convertJob(raw) {
    const title = english(oneline(raw.title));
    const company = raw.company.id;

    const technologies = mapTags(raw.tags);
    const fields = guessFields({
        title: title,
        role: english(oneline(raw.role)),
        tags: raw.tags,
        description: raw.description,
    });

    const publishDate = new Date(raw.ago);
    const publishEndDate = fewWeeksAfter(publishDate);
    const [jobMinDuration, jobMaxDuration] = randomJobDuration();

    const nijobsOffer = {
        id: raw.id,
        title: title,
        publishDate: publishDate.toISOString(),
        publishEndDate: publishEndDate.toISOString(),
        jobMinDuration: jobMinDuration,
        jobMaxDuration: jobMaxDuration,
        jobStartDate: new Date(),
        contacts: {
            name: raw.company.name,
            address: oneline(raw.location),
            phone: randomPhoneNumber(),
        },
        isPaid: randomBoolean(0.96),
        vacancies: randomVacancies(),
        jobType: randomOf(JobTypes),
        fields: fields,
        technologies: technologies,
        isHidden: randomBoolean(0.03),
        location: raw.location,
        company: company,
        description: raw.description,
    };

    return nijobsOffer;
}

function convertCompany(raw) {
    const website = raw.website || `https://${domainname(raw.id)}.com`;

    const nijobsCompany = {
        id: raw.id,
        name: raw.name,
        tagline: raw.tagline,
        contacts: {
            name: raw.name,
            phone: randomPhoneNumber(),
            website: website,
        },
        bio: raw.description,
    };

    return nijobsCompany;
}

module.exports = Object.freeze({ convertJob, convertCompany });
