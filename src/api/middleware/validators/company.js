const { body, query } = require("express-validator");
const { useExpressValidators } = require("../errorHandler");
const ValidationReasons = require("./validationReasons");
const CompanyConstants = require("../../../models/constants/Company");

const MAX_LIMIT_RESULTS = 100;

const finish = useExpressValidators([
    body("bio", ValidationReasons.DEFAULT)
        .isString().withMessage(ValidationReasons.STRING)
        .isLength({ max: CompanyConstants.bio.max_length }).withMessage(ValidationReasons.TOO_LONG(CompanyConstants.bio.max_length)),
]);

const list = useExpressValidators([
    query("limit", ValidationReasons.DEFAULT)
        .optional()
        .isInt({ min: 1, max: MAX_LIMIT_RESULTS })
        .withMessage(ValidationReasons.MAX(MAX_LIMIT_RESULTS)),
    query("offset", ValidationReasons.DEFAULT)
        .optional()
        .isInt({ min: 0 })
        .withMessage(ValidationReasons.MIN(0)),
]);


module.exports = {
    finish,
    list,
    MAX_LIMIT_RESULTS
};
