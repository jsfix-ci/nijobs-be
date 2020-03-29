// Run any command
const fs = require("fs");

if (!fs.existsSync("hydrate/") || !fs.existsSync("scripts/status.sh")) {
    console.error("Please execute this script in scraper/");
    process.exit(2);
}
process.on("unhandledRejection", (up) => {
    throw up;
});

const shell = require("shelljs");

const tags = require("./tags");
const roles = require("./roles");
const blobs = require("./blobs");
const progress = require("./progress");

const fetcher = require("./fetch");
const visitor = require("./visit");
const scraper = require("./scrap");
const linker = require("./link");
const adopter = require("./adopt");
const converter = require("./nijobs");
const accepter = require("./mongo");

// Run the script
run();

async function all() {
    await fetch();
    await visit();
    scrap();
    link();
    await adopt();
    convert();
    accept();
}

async function fetch() {
    blobs.cleanListings();
    await fetcher.fetchListings();
    status("listings");
}

async function visit() {
    blobs.cleanHTML();
    await visitor.visitAll();
    status("visit");
}

function scrap() {
    blobs.cleanRaw();
    scraper.scrapAll();
    merge("raw");
    tags.writeReport();
    status("scrap");
}

function link() {
    blobs.cleanLink();
    linker.linkRawAll();
    merge("link");
    merge("orphan");
    status("link");
}

async function adopt() {
    await adopter.adoptAll();
    merge("raw");
    merge("link");
    merge("orphan");
    tags.writeReport();
    status("raw");
    status("link");
    status("orphans");
}

function convert() {
    blobs.cleanNijobs();
    converter.convertAll();
    merge("nijobs");
    tags.writeReport();
    roles.writeReport();
    status("nijobs");
}

function accept() {
    blobs.cleanAccept();
    accepter.acceptAll();
    progress.info(">>>>>>>");
    status("done");
}

function merge(which = "all") {
    if (which === "raw" || which === "all") {
        blobs.mergeRaw();
    }
    if (which === "link" || which === "all") {
        blobs.mergeLink();
    }
    if (which === "orphan" || which === "all") {
        blobs.mergeOrphan();
    }
    if (which === "nijobs" || which === "all") {
        blobs.mergeNijobs();
    }
}

function status(which = "all") {
    shell.exec(`./scripts/status.sh ${which}`);
}

function script(action, which) {
    try {
        switch (action) {
            case "all":
                return all();
            case "fetch": case "listings":
                return fetch(which);
            case "visit": case "html":
                return visit(which);
            case "scrap": case "raw":
                return scrap(which);
            case "link":
                return link();
            case "adopt":
                return adopt();
            case "nijobs": case "convert":
                return convert();
            case "data": case "accept": case "move": case "mongo":
                return accept();
            case "merge":
                return merge(which);
            case "status":
                return status(which);
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
