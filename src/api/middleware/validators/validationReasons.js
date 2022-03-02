const ValidationReasons = Object.freeze({
    UNKNOWN: "unexpected-error",
    DEFAULT: "invalid",
    REQUIRED: "required",
    INSUFFICIENT_PERMISSIONS: "insufficient-permissions",
    MUST_BE_LOGGED_IN: "login-required",
    MUST_BE_ADMIN: "must-be-admin",
    MUST_BE_COMPANY: "must-be-company",
    COMPANY_BLOCKED: "company-blocked",
    COMPANY_ALREADY_BLOCKED: "company-already-blocked",
    MUST_BE_GOD: "must-be-god",
    BAD_GOD_TOKEN: "invalid-god-token",
    MIN: (val) => `must-be-greater-than-or-equal-to-${val}`,
    MAX: (val) => `must-be-lower-than-or-equal-to-${val}`,
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
    MUST_BE_BEFORE: (variable) => `must-be-before:${variable}`,
    WRONG_FORMAT: (format) => `must-be-format-${format}`,
    COMPANY_NOT_FOUND: (id) => `no-company-found-with-id:${id}`,
    COMPANY_DISABLED: "company-disabled",
    INSUFFICIENT_PERMISSIONS_COMPANY_SETTINGS: "insufficient-permissions-to-manage-company-settings",
    MAX_CONCURRENT_OFFERS_EXCEEDED: (max) => `max-concurrent-offers-reached:${max}`,
    OFFER_NOT_FOUND: (id) => `no-offer-found-with-id:${id}`,
    OFFER_EXPIRED: (id) => `offer-expired:${id}`,
    NOT_OFFER_OWNER: (id) => `not-offer-owner:${id}`,
    OFFER_EDIT_PERIOD_OVER: (value) => `offer-edit-period-over:${value}-hours`,
    OFFER_NOT_MATCHING_CRITERIA: "offer-not-matching-search-criteria",
    JOB_MIN_DURATION_NOT_SPECIFIED: "job-max-duration-requires-job-min-duration",
    REGISTRATION_FINISHED: "registration-already-finished",
    REGISTRATION_NOT_FINISHED: "registration-not-finished-yet",
    FAILED_SAVE: "failed-save",
    IMAGE_FORMAT: "formats-supported-png-jpeg-jpg",
    OFFER_BLOCKED_ADMIN: "offer-blocked-by-admin",
    OFFER_HIDDEN: "offer-is-hidden",
    FILE_TOO_LARGE: (max) => `file-cant-be-larger-than-${max}MB`,
});

export default ValidationReasons;
