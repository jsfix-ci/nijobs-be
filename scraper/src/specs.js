// handle nijobs limits
const OfferConstants = require("../../src/models/constants/Offer");
const CompanyConstants = require("../../src/models/constants/Company");
const JobTypes = require("../../src/models/JobTypes");
const FieldTypes = require("../../src/models/FieldTypes");
const TechnologyTypes = require("../../src/models/TechnologyTypes");
const TimeConstants = require("../../src/models/TimeConstants");

// in case we need to add more techs or fields to offers to convert them
// there should be enough defaults to pick from to meet the minimum requirement
const defaultTechnologies = ["AWS", "Docker", "Linux", "Windows", "macOS"];
const defaultFields = ["OTHER", "QUALITY ASSURANCE", "DEVOPS"];

// expand everything so that we can keep changes upstream contained
const offer_description_max_length = OfferConstants.description.max_length;
const offer_title_max_length = OfferConstants.title.max_length;
const offer_max_lifetime_months = TimeConstants.OFFER_MAX_LIFETIME_MONTHS;

const company_name_min_length = CompanyConstants.companyName.min_length;
const company_name_max_length = CompanyConstants.companyName.max_length;
const company_bio_max_length = CompanyConstants.bio.max_length;

const min_technologies = TechnologyTypes.MIN_TECHNOLOGIES;
const max_technologies = TechnologyTypes.MAX_TECHNOLOGIES;

const min_fields = FieldTypes.MIN_FIELDS;
const max_fields = FieldTypes.MAX_FIELDS;

module.exports = {
    OfferConstants,
    CompanyConstants,
    JobTypes,
    FieldTypes,
    TechnologyTypes,
    TimeConstants,

    defaultTechnologies,
    defaultFields,

    offer_description_max_length,
    offer_title_max_length,
    offer_max_lifetime_months,
    company_name_min_length,
    company_name_max_length,
    company_bio_max_length,
    min_technologies,
    max_technologies,
    min_fields,
    max_fields,
};
