const { info } = require("./progress");

function tidyRawJob(job) {
    if (!job.id || !job.company || !job.company.id || !job.company.sopath)
        throw "Tidying job with no id/company?";

    const id = job.id;

    if (!job.title || typeof job.title !== "string") {
        info(`! /jobs/${id.padEnd(6)}  No title`);
        return null;
    }
    if (!job.tags || job.tags.length === 0) {
        info(`! /jobs/${id.padEnd(6)}  No tags`);
        return null;
    }
    if (!job.description || typeof job.description !== "string") {
        info(`! /jobs/${id.padEnd(6)}  No description`);
        return null;
    }
    if (!job.ago || typeof job.title !== "string") {
        info(`! /jobs/${id.padEnd(6)}  No ago date`);
        return null;
    }

    if (typeof job.tags === "string") job.tags = [job.tags];
    return job;
}

function tidyRawCompany(company) {
    if (!company.id || !company.sopath)
        throw "Tidying company with no id/sopath?";

    const id = company.id;

    if (!company.name || !(typeof company.name === "string")) {
        info(`! /jobs/companies/${id.padEnd(40)}  No name`);
        return null;
    }
    if (!company.tags || company.tags.length === 0) {
        info(`! /jobs/companies/${id.padEnd(40)}  No tags`);
        return null;
    }
    if (!company.description || !(typeof company.description === "string")) {
        info(`! /jobs/companies/${id.padEnd(40)}  No description`);
        return null;
    }

    if (typeof company.tags === "string") company.tags = [company.tags];
    return company;
}

function jobExtract(job) {
    return {
        id: job.id,
        title: job.title,
        location: job.location,
        ago: job.ago,
    };
}

function companyExtract(company) {
    return {
        id: company.id,
        logo: company.logo,
        name: company.name,
        sopath: company.sopath,
        website: company.website,
    };
}

function jobAssignOwner(job, companies) {
    if (!{}.hasOwnProperty.call(companies, job.company.id)) return false;
    const company = companies[job.company.id];
    job.company = companyExtract(company);
    if (!company.offers) company.offers = {};
    company.offers[job.id] = jobExtract(job);
    return true;
}

module.exports = {
    tidyRawJob,
    tidyRawCompany,
    companyExtract,
    jobAssignOwner,
};
