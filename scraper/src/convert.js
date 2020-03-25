// Convert StackOverflow raw job/company to nijobs offer/company
const { mapTags } = require("./tags");
const { guessFields } = require("./roles");
const {
    identifier,
    oneline,
    multiline,
    english,
} = require("./strings");
const {
    randomBoolean,
    randomVacancies,
    randomPhoneNumber,
    randomOf,
    fromAgoDate,
    fewWeeksAfter,
    randomJobDuration,
} = require("./random");
const JobTypes = require("../../src/models/JobTypes");

// *****

function convertJob(raw) {
    const title = english(oneline(raw.title));
    const company = identifier(raw.company);

    const description = english(multiline(raw.description));

    const technologies = mapTags(raw.tags);
    const fields = guessFields({
        title: title,
        role: english(oneline(raw.role)),
        tags: raw.tags,
        description: description,
    });

    const publishDate = fromAgoDate(raw.ago);
    const publishEndDate = fewWeeksAfter(publishDate);
    const [jobMinDuration, jobMaxDuration] = randomJobDuration();

    if (!title || !description)
        return null;
    if (technologies.length === 0 || fields.length === 0)
        return null;

    const offer = {
        id: raw.id,
        title: title,
        publishDate: publishDate.toISOString(),
        publishEndDate: publishEndDate.toISOString(),
        jobMinDuration: jobMinDuration,
        jobMaxDuration: jobMaxDuration,
        jobStartDate: new Date(),
        description: description,
        contacts: {
            name: raw.companyName,
            address: oneline(raw.location),
            website: `https://${company}.com`, // decent guess
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
        companyName: raw.companyName,
    };

    return offer;
}

function convertCompany(raw) {
    return {
        id: raw.id,
        name: raw.name,
        contacts: {
            address: raw.address,
            website: raw.website,
            phone: randomPhoneNumber(),
        },
    };
}

module.exports = { convertJob, convertCompany };
