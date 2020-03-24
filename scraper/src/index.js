// Run any command
const shell = require("shelljs");
const fs = require("fs");

const scrapStackOverflow = require("./scraper");
const blobs = require("./blobs");
const tags = require("./tags");
const roles = require("./roles");

require("./config");

// Run the script
run();

async function all() {
    await scrapStackOverflow();
    blobs.writeCompanies();
    blobs.mergeScrapBlobs();
    stats("scrap");
    blobs.convertBlobs();
    blobs.mergeNijobsBlobs();
    stats("convert");
    tags.writeReport();
    roles.writeReport();
    blobs.deployMerges();
}

async function scrap() {
    await scrapStackOverflow();
    blobs.writeCompanies();
    blobs.mergeScrapBlobs();
    stats("scrap");
    tags.writeReport();
}

function convert() {
    blobs.convertBlobs();
    blobs.mergeNijobsBlobs();
    stats("convert");
    tags.writeReport();
    roles.writeReport();
}

function accept() {
    blobs.deployMerges();
}

function merge(which = "all") {
    if (which === "scrap" || which === "all")
        blobs.mergeScrapBlobs();
    if (which === "convert" || which === "all")
        blobs.mergeNijobsBlobs();
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

async function run() {
    const arg = process.argv[2];
    if (!arg) {
        console.error("Missing command argument");
        return;
    }

    const [action, which = "all"] = arg.split(/-|_|\s+/);

    if (!fs.existsSync("hydrate/") || !fs.existsSync("scripts/stats.sh")) {
        console.error("Please execute this script in scraper/");
        process.exit(2);
    }

    try {
        switch (action) {
            case "all":
                await all();
                break;
            case "scrap":
                await scrap();
                break;
            case "convert":
                convert();
                break;
            case "accept":
                accept();
                break;
            case "merge":
                merge(which);
                break;
            case "stats":
                stats(which);
                break;
            case "status":
                status(which);
                break;
            case "clean":
                clean(which);
                break;
            default:
                console.error(`Unknown action ${action}`);
        }
    } catch (err) {
        if (err) console.error(err);
        process.exit(1);
    }
}
