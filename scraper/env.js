// Scraper configuration
// Query parameters for listing pages
// l   ->  Location
// d   ->  Distance to location
// u   ->  Units of distance
// r   ->  Allow remote
// j   ->  Type: ['internship' 'permanent' 'contract']
// dr  ->  Developer Role (see roles.js)
const SCRAP_QUERY_PARAMS = {
//    l: "Portugal",
//    d: 20,
//    u: "Km",
//    r: true,
//    j: "internship"
//    dr: "BackendDeveloper"
};

// this can be a number of pages or an array of pages
const SCRAP_PAGES = 10;

const SCRAPER_REQUESTS_TIMEOUT = 120000;

const PERSIST_FOLDER = "data";

module.exports = {
    SCRAP_QUERY_PARAMS,
    SCRAP_PAGES,
    SCRAPER_REQUESTS_TIMEOUT,
    PERSIST_FOLDER,
};
