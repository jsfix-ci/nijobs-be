// Read html blobs and get jobs and companies
const cheerio = require("cheerio");

const { info } = require("./progress");
const { normalizeTags } = require("./tags");
const { tidyRawJob, tidyRawCompany } = require("./tidy");
const { fromAgoDate } = require("./random");
const {
    safetrim,
    rmquery,
    endofpath,
    domainname,
    oneline,
    multiline,
    english,
} = require("./strings");

function selectCompanyPath(candidates) {
    if (!candidates || candidates.length === 0) return null;
    for (const candidate of candidates)
        if (/^\/jobs\/companies\/(?!a\/)[^/?]+$/u.test(candidate))
            return candidate;
    return null;
}

function parseLocation(locationText) {
    // the regex below has a brain damaged utf8 character used by SO...
    return oneline(locationText).replace(/^[-–]/u, "").trim();
}

function parseSocialIcon($, a) {
    const uri = safetrim($(a).attr("href")); // redirect
    const svgclasses = $("svg.svg-icon", a).attr("class").split(/\s+/g);
    for (const clazz of svgclasses)
        if (/\bicon\S+\b/.test(clazz))
            return { uri, name: domainname(/\bicon(\S+)\b/.exec(clazz)[1]) };
    return { uri };
}

function parseJobListingHTML(html) {
    const $ = cheerio.load(html);
    return $("div.-job[data-jobid]").get()
        .map((row) => $(row).attr("data-jobid"));
}

function parseCompanyListingHTML(html) {
    const $ = cheerio.load(html);
    return $("div.company-list > div.-company").get()
        .map((row) => endofpath($(row).find("h2 > a[href]").attr("href")));
}

function parseJobHTML(html, id) {
    const $ = cheerio.load(html);

    // main locations, from top to bottom
    const headerSec = $("#mainbar header.job-details--header");
    const aboutSec = $("#mainbar section > h2:icontains('About this job')").parent();
    const tagsSec = $("#mainbar section > h2:icontains('Technologies')").parent();
    const descrSec = $("#mainbar section > h2:icontains('Job description')").parent();

    // cut to the chase, if we don't have the job's company just discard it now
    const paths = $('a[href^="/jobs/companies/"]', headerSec).get()
        .map((elem) => $(elem).attr("href"));
    const sopath = selectCompanyPath(paths);
    if (!sopath) {
        info(`! /jobs/${id}  No company uri found`);
        return null;
    }

    // * header
    const logoNode = $("img.s-avatar[src]", headerSec);
    const titleNode = $("h1", headerSec);
    const companyNode = $("h1 + div > a:first-of-type", headerSec);
    const locationNode = $("h1 + div > a:first-of-type + span", headerSec);

    const logoURI = rmquery(logoNode.attr("src"));
    const title = english(oneline(titleNode.text()));
    const companyName = oneline(companyNode.text());
    const location = parseLocation(locationNode.text());
    const companyId = endofpath(sopath);

    // * ago
    const agoNode = $("#overview-items svg.iconClock").parent();
    const ago = fromAgoDate(oneline(agoNode.text()));

    // * about
    const aboutNode = (label) => $(`div span:icontains('${label}') +`, aboutSec);
    const about = (label) => english(oneline(aboutNode(label).text()));

    // * tags
    const tagsNodes = $("h2 + div > a.post-tag", tagsSec);
    const rawTags = tagsNodes.get().map((a) => oneline($(a).text()));
    const tags = normalizeTags(rawTags);

    // * description
    const descriptionNode = $("h2 + div", descrSec);
    const description = english(multiline(descriptionNode.text()));

    // The order matters here. YAML and JSON will print them in this order
    const rawOffer = {
        id: id,
        title: title,
        location: location,
        ago: ago.toISOString(),
        jobType: about("Job type"),
        role: about("Role"),
        experience: about("Experience level"),
        industry: about("Industry"),
        companySize: about("Company size"),
        companyType: about("Company type"),
        tags: tags,
        description: description,
        company: {
            id: companyId,
            sopath: sopath,
            logo: logoURI,
            name: companyName,
        },
    };

    return tidyRawJob(rawOffer);
}

function parseCompanyHTML(html, id) {
    const $ = cheerio.load(html);

    // main locations, from top to bottom
    const headerSec = $("#header-content");
    const descrSec = $("#about-items");
    const tagsSec = $("#tech-stack-items");
    const rightSec = $("#right-column");
    const benefitsSec = $("div:has(> h2:icontains('Company Benefits'))", rightSec);

    // * header
    const logoNode = $("img#gh-logo[src]");
    const companyNameNode = $("#company-name-tagline h1", headerSec);
    const companyTaglineNode = $("#company-name-tagline h1 + p", headerSec);
    const logo = safetrim(logoNode.attr("href"));
    const companyName = oneline(companyNameNode.text());
    const companyTagline = oneline(companyTaglineNode.text());

    // * right
    const aboutNode = $("div:has(div:contains('About'))", rightSec);
    const websiteNode = $("div:has(p:icontains('Website')) > p +", aboutNode);
    const websiteLinkNode = $("span > a[href]", websiteNode).eq(0);
    const industryNode = $("div:has(p:icontains('Industry')) > p +", aboutNode);
    const sizeNode = $("div:has(p:icontains('Size')) > p +", aboutNode);
    const foundedNode = $("div:has(p:icontains('Founded')) > p +", aboutNode);
    const statusNode = $("div:has(p:icontains('Status')) > p +", aboutNode);
    const socialNode = $("div:has(p:icontains('Social'))", aboutNode);
    const websiteName = oneline(websiteNode.text());
    const websiteLink = safetrim(websiteLinkNode.attr("href"));
    const industry = oneline(industryNode.text());
    const size = oneline(sizeNode.text());
    const founded = oneline(foundedNode.text());
    const status = oneline(statusNode.text());
    const iconNodes = $("a[href]:has(svg.svg-icon)", socialNode);
    const social = iconNodes.get().map((a) => parseSocialIcon($, a));

    // * tags
    const tagsNodes = $("h2 + div > a.post-tag", tagsSec);
    const rawTags = tagsNodes.get().map((a) => oneline($(a).text()));
    const tags = normalizeTags(rawTags);

    // * description
    const mainDescription = english(multiline(descrSec.text()));
    const restDescription = english(multiline($("h2 + div ~", tagsSec).text()));
    const description = `${mainDescription}\n\n${restDescription}`;

    // * benefits
    const listNodes = $("ol > li div:has(> svg) + div", benefitsSec);
    const benefits = listNodes.get().map((div) => oneline($(div).text()));

    const rawCompany = {
        id: id,
        name: companyName,
        tagline: companyTagline,
        sopath: `/jobs/companies/${id}`,
        logo: logo,
        websiteName: websiteName,
        website: websiteLink,
        industry: industry,
        size: size,
        founded: founded,
        status: status,
        tags: tags,
        description: description,
        benefits: benefits,
        social: social,
    };

    return tidyRawCompany(rawCompany);
}

module.exports = Object.freeze({
    parseJobListingHTML,
    parseCompanyListingHTML,
    parseJobHTML,
    parseCompanyHTML,
});
