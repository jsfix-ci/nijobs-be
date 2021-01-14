const ValidationReasons = Object.freeze({
    DEFAULT: "invalid",
    REQUIRED: "required",
    MIN: (val) => `must-be-greater-than-${val}`,
    MAX: (val) => `must-be-lower-than-${val}`,
    TOO_LONG: (len) => `max-length-exceeded:${len}`,
    TOO_SHORT: (len) => `below-min-length:${len}`,
    STRING: "must-be-string",
    ARRAY: "must-be-array",
    DATE: "must-be-ISO8601-date",
    INT: "must-be-int",
    BOOLEAN: "must-be-boolean",
    IN_ARRAY: (vals, field) => `${field ? `${field}:` : ""}must-be-in:[${vals}]`,
    ARRAY_SIZE: (min, max) => `size-must-be-between:[${min},${max}]`,
    OBJECT_ID: "must-be-a-valid-id",
    EMAIL: "must-be-a-valid-email",
    HAS_NUMBER: "must-contain-number",
    ALREADY_EXISTS: (variable) => `${variable}-already-exists`,
    DATE_EXPIRED: "date-already-past",
    MUST_BE_AFTER: (variable) => `must-be-after:${variable}`,
    WRONG_FORMAT: (format) => `must-be-format-${format}`,
    COMPANY_NOT_FOUND: (id) => `no-company-found-with-id:${id}`,
<<<<<<< HEAD
<<<<<<< HEAD
=======
    MAX_OFFERS_EXCEEDED: (max) => `Number of active offers exceeded! The limit is ${max} offers`,
>>>>>>> Created validation reason, moved MAX_OFFERS and changed order of validations
=======
    MAX_CONCURRENT_OFFERS_EXCEEDED: (max) => `max-concurrent-offers-reached:${max}`,
>>>>>>> Offers limit with time interval, offer generator and new test
});

module.exports = ValidationReasons;
