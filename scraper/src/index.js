// Run any command

const fs = require("fs");

if (!fs.existsSync("hydrate/") || !fs.existsSync("scripts/stats.sh")) {
    console.error("Please execute this script in scraper/");
    process.exit(2);
}

const shell = require("shelljs");

const scrapStackOverflow = require("./scraper");
const blobs = require("./blobs");
const tags = require("./tags");
const roles = require("./roles");

// Run the script
run();

async function all() {
    blobs.cleanPagesFolder();
    await scrapStackOverflow();
    blobs.writeCompanies();
    merge("scrap");
    blobs.convertBlobs();
    merge("nijobs");
    tags.writeReport();
    roles.writeReport();
    blobs.deployMerges();
}

async function scrap() {
    blobs.cleanPagesFolder();
    await scrapStackOverflow();
    blobs.writeCompanies();
    merge("scrap");
    tags.writeReport();
}

function convert() {
    blobs.convertBlobs();
    merge("nijobs");
    tags.writeReport();
    roles.writeReport();
}

function accept() {
    blobs.deployMerges();
}

function merge(which = "all") {
    if (which === "scrap" || which === "all") {
        blobs.mergeScrapBlobs();
        stats("scrap");
        status("scrap");
    }
    if (which === "nijobs" || which === "all") {
        blobs.mergeNijobsBlobs();
        stats("nijobs");
        status("nijobs");
    }
}

function stats(which = "all") {
    shell.exec(`./scripts/stats.sh ${which}`);
}

function status(which = "all") {
    shell.exec(`./scripts/status.sh ${which}`);
}

function clean(which = "all") {
    shell.exec(`./scripts/clean.sh ${which}`);
}

function script(action, which) {
    try {
        switch (action) {
            case "all":
                return all();
            case "scrap":
                return scrap();
            case "nijobs":
                return convert();
            case "accept":
                return accept();
            case "merge":
                return merge(which);
            case "stats":
                return stats(which);
            case "status":
                return status(which);
            case "clean":
                return clean(which);
            default:
                console.error(`Unknown action ${action}`);
                return 1;
        }
    } catch (err) {
        if (err) console.error(err);
        return 1;
    }
}

function run() {
    const action = process.argv[2] || "all";
    const which = process.argv[3] || "all";
    script(action, which);
}
