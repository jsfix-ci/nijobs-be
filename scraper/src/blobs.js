// Write, read and manipulate files under output/
const fs = require("fs");
const mkdirp = require("mkdirp");
const glob = require("glob");
const rimraf = require("rimraf");

const { convertJob, convertCompany } = require("./convert");
const {
    writeYAML,
    readYAML,
    mergeFiles,
} = require("./files");
const { getCompanies } = require("./parser");

function writeRawBlob(raw) {
    writeYAML(`output/scrap/jobs/${raw.id}.yaml`, raw);
}

function writeOfferBlob(offer) {
    writeYAML(`output/nijobs/offers/${offer.id}.yaml`, offer);
}

function writePageBlobs(pageBlob, pg) {
    writeYAML(`output/scrap/pages/${pg}.yaml`, pageBlob);
}

function writeCompanies() {
    Object.values(getCompanies()).forEach((company) => {
        writeYAML(`output/scrap/companies/${company.id}.yaml`, company);
    });
}

function mergeRawJobBlobs() {
    mergeFiles("output/scrap/jobs/*.yaml", "output/scrap/all_jobs.json");
}

function mergeRawCompanyBlobs() {
    mergeFiles("output/scrap/companies/*.yaml", "output/scrap/all_companies.json");
}

function mergeOfferBlobs() {
    mergeFiles("output/nijobs/offers/*.yaml", "output/nijobs/all_offers.json");
}

function mergeCompanyBlobs() {
    mergeFiles("output/nijobs/companies/*.yaml", "output/nijobs/all_companies.json");
}

function mergeScrapBlobs() {
    mergeRawJobBlobs();
    mergeRawCompanyBlobs();
}

function mergeNijobsBlobs() {
    mergeOfferBlobs();
    mergeCompanyBlobs();
}

function convertJobBlobs() {
    const files = glob.sync("output/scrap/jobs/*.yaml");
    if (files.length === 0) {
        console.warn("WARNING: There are no jobs -- converted nothing");
        return;
    }
    files.forEach((file) => {
        const raw = readYAML(file);
        const offer = convertJob(raw);
        const outputFile = file.replace("/scrap/jobs/", "/nijobs/offers/");
        if (offer) writeYAML(outputFile, offer);
    });
}

function convertCompanyBlobs() {
    const files = glob.sync("output/scrap/companies/*.yaml");
    if (files.length === 0) {
        console.warn("WARNING: There are no companies -- converted nothing");
        return;
    }
    files.forEach((file) => {
        const raw = readYAML(file);
        const company = convertCompany(raw);
        const outputFile = file.replace("/scrap/", "/nijobs/");
        if (company) writeYAML(outputFile, company);
    });
}

function convertBlobs() {
    if (!fs.existsSync("output/scrap/")) {
        console.error("scrap/ is empty -- converted nothing");
        return;
    }
    convertJobBlobs();
    convertCompanyBlobs();
}

function deployMerges() {
    if (!fs.existsSync("output/nijobs/")) {
        console.error("nijobs/ is empty");
        return;
    }
    const offersFile = "output/nijobs/all_offers.json";
    const companiesFile = "output/nijobs/all_companies.json";
    if (!fs.existsSync(offersFile)) {
        console.error("Offers file nijobs/all_offers.json doesn't exist");
        return;
    }
    if (!fs.existsSync(companiesFile)) {
        console.error("Companies file nijobs/all_companies.json doesn't exist");
        return;
    }
    mkdirp.sync("data");
    fs.copyFileSync(offersFile, "data/offers.json");
    fs.copyFileSync(companiesFile, "data/companies.json");
}

function cleanPagesFolder() {
    rimraf.sync("output/scrap/pages/");
}

module.exports = {
    writeRawBlob,
    writeOfferBlob,
    writePageBlobs,
    mergeScrapBlobs,
    mergeNijobsBlobs,
    convertBlobs,
    deployMerges,
    writeCompanies,
    cleanPagesFolder,
};
