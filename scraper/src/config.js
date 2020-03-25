// Read environment config
require("dotenv-flow").config();
const qs = require("querystring");

const env = process.env;

const config = {
    SCRAP_QUERY_PARAMS: qs.parse(env.SCRAP_QUERY_PARAMS) || "",
    SCRAP_QUERY_PARAMS_DETAILS: qs.parse(env.SCRAP_QUERY_PARAMS_DETAILS) || "",
    SCRAP_PAGES: env.SCRAP_PAGES || "40",
    SCRAP_TIMEOUT: +env.SCRAP_TIMEOUT || 20000,
    SCRAP_TIMEOUT_RETRIES: +env.SCRAP_TIMEOUT_RETRIES || 3,
    SCRAP_CONCURRENT_LISTING: +env.SCRAP_CONCURRENT_LISTING || 25,
    SCRAP_CONCURRENT_DETAILS: +env.SCRAP_CONCURRENT_DETAILS || 100,
    WRITE_YAML_ALSO: +env.WRITE_YAML_ALSO || false,
    AUTO_CMS: (env.AUTO_CMS === undefined) ? true : env.AUTO_CMS,
};

module.exports = config;
