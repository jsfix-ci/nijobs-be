// Parse the stackoverflow.com/jobs HTML with Cheerio (jQuery-like)
const { identifier, oneline, multiline, english } = require("./strings");
const { normalizeTags } = require("./tags");

const companies = {};

/**
 * Mine raw data from the cheerio representations
 *
 * @param {Object}        arg
 * @param {String}        arg.id   - job's stackoverflow id
 * @param {CheerioStatic} arg.job$ - cheerio for job's details page
 * @param {Cheerio}       arg.row$ - cheerio for job's row in listing page
 * @returns RawOffer
 */
function parseStackOverflow({ id, job$, row$ }) {
    // in the listing page...
    const sub = row$.find("h2 > a[title]").eq(0).parent().next().children();
    const footer = row$.find("div.fs-caption > div:contains(' ago')");

    // in the details page...
    const titleLink = job$("#mainbar h1 > a[title]");
    const aboutHeader = job$("#mainbar h2:icontains('About this job')");
    const techHeader = job$("#mainbar h2:icontains('Technologies')");
    const descrHeader = job$("#mainbar h2:icontains('Job description')");
    const logoLink = job$("#mainbar header.job-details--header a[href]:has(img)");

    const title = titleLink.text().trim();
    const location = sub.eq(1).text().trim();
    const companyName = sub.eq(0).text().trim();
    const companyUri = logoLink.attr("href");
    const company = (() => {
        if (!companyUri) return companyName;
        let match = /^\/jobs\/companies\/([^/]+)/.exec(companyUri);
        if (match) return match[1];
        match = /([^/]+)$/.exec(companyUri);
        if (match) return match[1];
        return companyName;
    })();

    const aboutFn = (label) => oneline(aboutHeader.next()
        .find(`div.mb8 span:contains('${label}')`).next()
        .text().trim().replace(/\s+/g, " "));

    const tags = techHeader.next().find("a.post-tag")
        .map((_index, element) => oneline(job$(element).text()))
        .get().sort().filter((el, i, a) => el && i === a.indexOf(el));

    const description = descrHeader.next().text();

    const ago = footer.text();

    // The order matters here. YAML and JSON will print them in this order
    const raw = {
        id: id,
        title: english(oneline(title)),
        companyName: oneline(companyName),
        companyUri: companyUri,
        company: identifier(company),
        location: oneline(location),
        jobType: english(aboutFn("Job type")),
        role: english(aboutFn("Role")),
        experience: aboutFn("Experience level"),
        industry: aboutFn("Industry"),
        companySize: aboutFn("Company size"),
        companyType: aboutFn("Company type"),
        tags: normalizeTags(tags),
        description: english(multiline(description)),
        ago: oneline(ago),
    };

    addCompany(raw);

    return raw;
}

function addCompany(raw) {
    if ({}.hasOwnProperty.call(companies, raw.company)) return;

    companies[raw.company] = {
        id: raw.company,
        name: raw.companyName,
        uri: raw.companyUri,
        industry: raw.industry || "Software Development",
        size: raw.companySize || "Some people",
        type: raw.companyType || "Normal",
        address: raw.location,
        website: `https://${raw.company}.com`,
    };
}

function getCompanies() {
    return companies;
}

module.exports = { parseStackOverflow, getCompanies };
