const config = require("./config");

// Manipulate the config depending on the script to be run
changeConfig();

const scrapStackOverflow = require("./scraper");
const files = require("./files");

// Run the script
runScript();

// *****

function runScript() {
    const action = process.argv[2];

    if (oneof(action, "scrap", "scrap-raw", "scrap-test")) {
        scrapStackOverflow();
    }
    if (oneof(action, "stats", "stats-raw", "stats-test")) {
        // stats.analyzeScrap();
    }
    if (oneof(action, "join", "join-raw", "join-test")) {
        files.persist();
    }
}

function changeConfig() {
    const action = process.argv[2];

    if (oneof(action, "scrap", "stats", "join")) {
        config.OUTPUT_SUBFOLDER = "nijobs";
    }
    if (oneof(action, "scrap-raw", "stats-raw", "join-raw")) {
        config.OUTPUT_SUBFOLDER = "raw";
    }
    if (oneof(action, "scrap-test", "stats-test", "join-test")) {
        config.OUTPUT_SUBFOLDER = "test";
    }
}

function oneof(action, ...values) {
    return values.includes(action);
}
