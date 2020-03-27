// Read environment config
require("dotenv-flow").config();
const qs = require("querystring");

const { parsePages } = require("./utils");

const env = process.env;

const config = {
    QUERY_JOB_LISTING: qs.parse(env.QUERY_JOB_LISTING) || "",
    QUERY_COMPANY_LISTING: qs.parse(env.QUERY_COMPANY_LISTING) || "",
    QUERY_JOB: qs.parse(env.QUERY_JOB) || "",
    QUERY_COMPANY: qs.parse(env.QUERY_COMPANY) || "",
    SCRAP_PAGES_JOBS: parsePages(env.SCRAP_PAGES_JOBS || ""),
    SCRAP_PAGES_COMPANIES: parsePages(env.SCRAP_PAGES_COMPANIES || ""),
    SCRAP_TIMEOUT: +env.SCRAP_TIMEOUT || 20000,
    SCRAP_TIMEOUT_RETRIES: +env.SCRAP_TIMEOUT_RETRIES || 3,
    SCRAP_CONCURRENT: +env.SCRAP_CONCURRENT || 100,
    WRITE_YAML_ALSO: +env.WRITE_YAML_ALSO || false,
};

module.exports = Object.freeze(config);
