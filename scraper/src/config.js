// Use a dotenv-flow like organization
// There is a env.js above this file. Read the default config from there;
// if the env.local.js file exists too, read it as well.
function env() {
    const mainConfig = require("../env");
    try {
        const localConfig = require("../env.local");
        return {
            ...mainConfig,
            ...localConfig,
        };
    } catch (err) {
        return { ...mainConfig };
    }
}

const config = {
    SCRAP_QUERY_PARAMS: {},
    SCRAP_QUERY_PARAMS_DETAILS: {},
    SCRAP_PAGES: 40,
    SCRAP_TIMEOUT: 120000,
    SCRAP_CONCURRENT_LISTING_REQUESTS: 20,
    SCRAP_CONCURRENT_DETAILS_REQUESTS: 40,
    OUTPUT_FOLDER: "output",
    OUTPUT_SUBFOLDER: "default",
    ...env(),
};

module.exports = config;
