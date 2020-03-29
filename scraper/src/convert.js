// Convert StackOverflow raw job/company to nijobs offer/company
const { mapTags } = require("./tags");
const { guessFields } = require("./roles");
const { getRandomBio } = require("./bios");
const {
    randomBoolean,
    randomVacancies,
    randomPhoneNumber,
    randomOf,
    fewWeeksAfter,
    fewMonthsAfter,
    randomJobDuration,
} = require("./random");
const {
    domainname,
    oneline,
    multiline,
    english,
    tidytitle,
} = require("./strings");
const specs = require("./specs");

function convertJob(raw) {
    const title = english(tidytitle(raw.title));
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
        jobStartDate: fewMonthsAfter(),
        contacts: {
            name: raw.company.name,
            address: oneline(raw.location),
            phone: randomPhoneNumber(),
        },
        isPaid: randomBoolean(0.96),
        vacancies: randomVacancies(),
        jobType: randomOf(specs.JobTypes),
        fields: fields,
        technologies: technologies,
        isHidden: randomBoolean(0.03),
        location: raw.location,
        description: raw.description,
        _company: company,
    };

    return nijobsOffer;
}

function convertCompany(raw) {
    const website = raw.website || `https://${domainname(raw.id)}.com`;

    const nijobsCompany = {
        id: raw.id,
        name: raw.name,
        tagline: oneline(raw.tagline),
        contacts: {
            name: raw.name,
            phone: randomPhoneNumber(),
            website: website,
        },
        bio: multiline(raw.description) || getRandomBio(),
    };

    return nijobsCompany;
}

module.exports = Object.freeze({ convertJob, convertCompany });
