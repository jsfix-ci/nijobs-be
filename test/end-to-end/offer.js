// const { mockCurrentDate } = require("../testUtils");
const HTTPStatus = require("http-status-codes");
const Offer = require("../../src/models/Offer");
const JobTypes = require("../../src/models/constants/JobTypes");
const FieldTypes = require("../../src/models/constants/FieldTypes");
const TechnologyTypes = require("../../src/models/constants/TechnologyTypes");
const { ErrorTypes } = require("../../src/api/middleware/errorHandler");
const ValidatorTester = require("../utils/ValidatorTester");
const withGodToken = require("../utils/GodToken");
const { DAY_TO_MS } = require("../utils/TimeConstants");
const OfferConstants = require("../../src/models/constants/Offer");
const Account = require("../../src/models/Account");
const Company = require("../../src/models/Company");
const hash = require("../../src/lib/passwordHashing");
const ValidationReasons = require("../../src/api/middleware/validators/validationReasons");
const { Types } = require("mongoose");
const CompanyConstants = require("../../src/models/constants/Company");
const { OFFER_EDIT_GRACE_PERIOD_HOURS, HOUR_IN_MS  } = require("../../src/models/constants/TimeConstants");
const { ensureArray } = require("../../src/api/middleware/validators/validatorUtils");
const OfferService = require("../../src/services/offer");

//----------------------------------------------------------------
describe("Offer endpoint tests", () => {
    const generateTestOffer = (params) => ({
        title: "Test Offer",
        publishDate: (new Date(Date.now() - (DAY_TO_MS))).toISOString(),
        publishEndDate: (new Date(Date.now() + (DAY_TO_MS))).toISOString(),
        description: "For Testing Purposes",
        contacts: ["geral@niaefeup.pt", "229417766"],
        jobType: "SUMMER INTERNSHIP",
        fields: ["DEVOPS", "MACHINE LEARNING", "OTHER"],
        technologies: ["React", "CSS"],
        location: "Testing Street, Test City, 123",
        isHidden: false,
        requirements: ["The candidate must be tested", "Fluent in testJS"],
        ...params,
    });

    let test_company;

    const test_agent = agent();

    const test_user_admin = {
        email: "admin@email.com",
        password: "password123",
    };
    const test_user_company = {
        email: "company@email.com",
        password: "password123",
    };


    beforeAll(async () => {
        await Company.deleteMany({});
        test_company = await Company.create({
            name: "test company",
            bio: "a bio",
            contacts: ["a contact"]
        });
        await Account.deleteMany({});
        await Account.create({
            email: test_user_admin.email,
            password: await hash(test_user_admin.password),
            isAdmin: true
        });
        await Account.create({
            email: test_user_company.email,
            password: await hash(test_user_company.password),
            company: test_company._id
        });
    });

    describe("POST /offers", () => {

        describe("Authentication", () => {

            describe("creating offers requires company account or admin account (without god token)", () => {
                test("should fail if not logged in", async () => {
                    const res = await request()
                        .post("/offers/new")
                        .send({});

                    expect(res.status).toBe(HTTPStatus.UNAUTHORIZED);
                    expect(res.body).toHaveProperty("errors");
                    expect(res.body.errors).toContainEqual(ValidationReasons.INSUFFICIENT_PERMISSIONS);
                });

                test("should succeed if logged to admin account", async () => {
                    // Login
                    await test_agent
                        .post("/auth/login")
                        .send(test_user_admin)
                        .expect(200);

                    const params = { owner: test_company._id };
                    const offer = generateTestOffer(params);
                    const res = await test_agent
                        .post("/offers/new")
                        .send(offer);

                    expect(res.status).toBe(HTTPStatus.OK);
                    expect(res.body).toHaveProperty("title", offer.title);
                    expect(res.body).toHaveProperty("description", offer.description);
                    expect(res.body).toHaveProperty("location", offer.location);
                });

                test("should create offer if logged in to company account", async () => {

                    // Login
                    const offer = generateTestOffer();
                    await test_agent
                        .post("/auth/login")
                        .send(test_user_company)
                        .expect(200);

                    const res = await test_agent
                        .post("/offers/new")
                        .send({ ...offer });

                    expect(res.status).toBe(HTTPStatus.OK);
                    expect(res.body).toHaveProperty("title", offer.title);
                    expect(res.body).toHaveProperty("description", offer.description);
                    expect(res.body).toHaveProperty("location", offer.location);
                    expect(res.body).toHaveProperty("owner", test_company._id.toString());
                    // TODO: When ownerName is a thing -> expect(res.body).toHaveProperty("ownerName", test_company.name);
                });
            });

            describe("creating offers requires god permissions", () => {
                test("should fail when god token not provided", async () => {
                    const res = await request()
                        .post("/offers/new")
                        .send({});

                    expect(res.status).toBe(HTTPStatus.UNAUTHORIZED);
                    expect(res.body).toHaveProperty("error_code", ErrorTypes.FORBIDDEN);
                    expect(res.body).toHaveProperty("errors");
                    expect(res.body.errors).toContainEqual(ValidationReasons.INSUFFICIENT_PERMISSIONS);
                });

                test("should fail when god token is incorrect", async () => {
                    const res = await request()
                        .post("/offers/new")
                        .send({
                            god_token: "NotAValidGodToken!!12345",
                        });

                    expect(res.status).toBe(HTTPStatus.UNAUTHORIZED);
                    expect(res.body).toHaveProperty("errors");
                    expect(res.body.errors).toContainEqual(ValidationReasons.BAD_GOD_TOKEN);
                });

                test("should fail when god token is correct but owner doesn't exist", async () => {
                    const params = { ...generateTestOffer(), owner: "invalidowner" };
                    const res = await request()
                        .post("/offers/new")
                        .send(withGodToken(params));

                    expect(res.status).toBe(HTTPStatus.UNPROCESSABLE_ENTITY);
                    expect(res.body).toHaveProperty("error_code", ErrorTypes.VALIDATION_ERROR);
                    expect(res.body.errors).toContainEqual({
                        value: "invalidowner",
                        location: "body",
                        msg: ValidationReasons.COMPANY_NOT_FOUND("invalidowner"),
                        param: "owner",
                    });

                });

                test("should succeed when god token is correct and owner exists", async () => {
                    const offer = generateTestOffer();
                    const params = { ...offer, owner: test_company._id };
                    const res = await request()
                        .post("/offers/new")
                        .send(withGodToken(params));


                    expect(res.status).toBe(HTTPStatus.OK);
                    expect(res.body).toHaveProperty("title", offer.title);
                    expect(res.body).toHaveProperty("description", offer.description);
                    expect(res.body).toHaveProperty("location", offer.location);
                });
            });
        });

        const EndpointValidatorTester = ValidatorTester((params) => request().post("/offers/new").send(withGodToken(params)));
        const BodyValidatorTester = EndpointValidatorTester("body");

        describe("Input Validation", () => {
            describe("title", () => {
                const FieldValidatorTester = BodyValidatorTester("title");
                FieldValidatorTester.isRequired();
                FieldValidatorTester.mustBeString();
                FieldValidatorTester.hasMaxLength(OfferConstants.title.max_length);
            });

            describe("publishDate", () => {
                const FieldValidatorTester = BodyValidatorTester("publishDate");
                FieldValidatorTester.mustBeDate();
            });

            describe("publishEndDate", () => {
                const FieldValidatorTester = BodyValidatorTester("publishEndDate");
                FieldValidatorTester.isRequired();
                FieldValidatorTester.mustBeDate();
                FieldValidatorTester.mustBeFuture();
                FieldValidatorTester.mustBeAfter("publishDate");
            });

            describe("jobMinDuration", () => {
                const FieldValidatorTester = BodyValidatorTester("jobMinDuration");
                FieldValidatorTester.mustBeNumber();
            });

            describe("jobMaxDuration", () => {
                const FieldValidatorTester = BodyValidatorTester("jobMaxDuration");
                FieldValidatorTester.mustBeNumber();
            });

            describe("jobStartDate", () => {
                const FieldValidatorTester = BodyValidatorTester("jobStartDate");
                FieldValidatorTester.mustBeDate();
            });

            describe("description", () => {
                const FieldValidatorTester = BodyValidatorTester("description");
                FieldValidatorTester.isRequired();
                FieldValidatorTester.mustBeString();
                FieldValidatorTester.hasMaxLength(OfferConstants.description.max_length);
            });

            describe("contacts", () => {
                const FieldValidatorTester = BodyValidatorTester("contacts");
                FieldValidatorTester.isRequired();
            });

            describe("isPaid", () => {
                const FieldValidatorTester = BodyValidatorTester("isPaid");
                FieldValidatorTester.mustBeBoolean();
            });

            describe("vacancies", () => {
                const FieldValidatorTester = BodyValidatorTester("vacancies");
                FieldValidatorTester.mustBeNumber();
            });

            describe("jobType", () => {
                const FieldValidatorTester = BodyValidatorTester("jobType");
                FieldValidatorTester.isRequired();
                FieldValidatorTester.mustBeString();
                FieldValidatorTester.mustBeInArray(JobTypes);
            });

            describe("fields", () => {
                const FieldValidatorTester = BodyValidatorTester("fields");
                FieldValidatorTester.isRequired();
                FieldValidatorTester.mustBeArrayBetween(FieldTypes.MIN_FIELDS, FieldTypes.MAX_FIELDS);
                FieldValidatorTester.mustHaveValuesInRange(FieldTypes.FieldTypes, FieldTypes.MIN_FIELDS + 1);
            });

            describe("technologies", () => {
                const FieldValidatorTester = BodyValidatorTester("technologies");
                FieldValidatorTester.isRequired();
                FieldValidatorTester.mustBeArrayBetween(TechnologyTypes.MIN_TECHNOLOGIES, TechnologyTypes.MAX_TECHNOLOGIES);
                FieldValidatorTester.mustHaveValuesInRange(TechnologyTypes.TechnologyTypes, TechnologyTypes.MIN_TECHNOLOGIES + 1);
            });

            describe("owner", () => {
                const FieldValidatorTester = BodyValidatorTester("owner");
                FieldValidatorTester.isRequired();
            });

            describe("location", () => {
                const FieldValidatorTester = BodyValidatorTester("location");
                FieldValidatorTester.isRequired();
                FieldValidatorTester.mustBeString();
            });

            describe("requirements", () => {
                const FieldValidatorTester = BodyValidatorTester("requirements");
                FieldValidatorTester.isRequired();
            });
        });

        describe("Without pre-existing offers", () => {
            beforeAll(async () => {
                await Offer.deleteMany({});
            });

            // TODO: This test should be 'with minimum requirements'
            // Thus, there should be another with all of the optional fields being sent, at least
            test("Should successfully create an Offer", async () => {
                const offer = generateTestOffer();
                const offer_params = {
                    ...offer,
                    owner: test_company._id,
                    ownerName: test_company.name
                };

                const res = await request()
                    .post("/offers/new")
                    .send(withGodToken(offer_params));

                expect(res.status).toBe(HTTPStatus.OK);
                const created_offer_id = res.body._id;

                const created_offer = await Offer.findById(created_offer_id);

                expect(created_offer).toBeDefined();
                // Ideally matchers alongside .toMatchObject should be used in order to check created_offer against offer
                // However, no matter what I tried, I couldn't get it to work :upside_down_face:
                expect(created_offer).toHaveProperty("title", offer.title);
                expect(created_offer).toHaveProperty("description", offer.description);
                expect(created_offer).toHaveProperty("location", offer.location);
            });
        });

        describe("Before reaching the offers limit while having past offers", () => {
            const testOffers = Array(CompanyConstants.offers.max_concurrent - 1)
                .fill(generateTestOffer({
                    "publishDate": (new Date(Date.now() - (DAY_TO_MS))).toISOString(),
                    "publishEndDate": (new Date(Date.now() + (DAY_TO_MS))).toISOString()
                }));

            testOffers.push(generateTestOffer({
                "publishDate": (new Date(Date.now() - (3 * DAY_TO_MS))).toISOString(),
                "publishEndDate": (new Date(Date.now() - (2 * DAY_TO_MS))).toISOString()
            }));

            console.info("TEST OFFERS: ", ensureArray(testOffers));

            beforeAll(async () => {
                await Offer.deleteMany({});

                testOffers.forEach((offer) => {
                    offer.owner = test_company._id;
                    offer.ownerName = test_company.name;
                });

                await Offer.create(testOffers);
            });

            afterAll(async () => {
                await Offer.deleteMany({});
            });

            test("should be able to create a new offer (past offers do not restrain the company)", async () => {
                const offer_params = {
                    ...generateTestOffer(),
                    owner: test_company._id,
                    ownerName: test_company.name,
                };

                const res = await request()
                    .post("/offers/new")
                    .send(withGodToken(offer_params));

                expect(res.status).toBe(HTTPStatus.OK);
                expect(res.body).toHaveProperty("title", offer_params.title);
                expect(res.body).toHaveProperty("description", offer_params.description);
                expect(res.body).toHaveProperty("location", offer_params.location);
            });
        });

        describe("After reaching the offers limit", () => {
            const testOffers = Array(CompanyConstants.offers.max_concurrent)
                .fill(generateTestOffer({
                    "publishDate": (new Date(Date.now() - (DAY_TO_MS))).toISOString(),
                    "publishEndDate": (new Date(Date.now() + (DAY_TO_MS))).toISOString()
                }));

            beforeAll(async () => {
                await Offer.deleteMany({});

                testOffers.forEach((offer) => {
                    offer.owner = test_company._id;
                    offer.ownerName = test_company.name;
                });

                await Offer.create(testOffers);
            });

            afterAll(async () => {
                await Offer.deleteMany({});
            });


            test("should fail to create a new offer", async () => {
                const offer_params = {
                    ...generateTestOffer(),
                    owner: test_company._id,
                    ownerName: test_company.name,
                };

                const res = await request()
                    .post("/offers/new")
                    .send(withGodToken(offer_params));

                expect(res.status).toBe(HTTPStatus.CONFLICT);
                expect(res.body).toHaveProperty("error_code", ErrorTypes.VALIDATION_ERROR);
                expect(res.body).toHaveProperty("errors");
                expect(res.body.errors).toContainEqual(
                    ValidationReasons.MAX_CONCURRENT_OFFERS_EXCEEDED(CompanyConstants.offers.max_concurrent));
            });
        });

        describe("Trying to schedule an offer in a time period which reached the offers limit", () => {
            const testOffers = Array(CompanyConstants.offers.max_concurrent)
                .fill(generateTestOffer({
                    "publishDate": (new Date(Date.now() + (3 * DAY_TO_MS))).toISOString(),
                    "publishEndDate": (new Date(Date.now() + (6 * DAY_TO_MS))).toISOString()
                }));

            beforeAll(async () => {
                await Offer.deleteMany({});

                testOffers.forEach((offer) => {
                    offer.owner = test_company._id;
                    offer.ownerName = test_company.name;
                });

                await Offer.create(testOffers);
            });

            afterAll(async () => {
                await Offer.deleteMany({});
            });

            test("should fail to schedule a new offer", async () => {
                const offer_params = {
                    ...generateTestOffer({
                        "publishDate": (new Date(Date.now() + (4 * DAY_TO_MS))).toISOString(),
                        "publishEndDate": (new Date(Date.now() + (5 * DAY_TO_MS))).toISOString()
                    }),
                    owner: test_company._id,
                    ownerName: test_company.name
                };

                const res = await request()
                    .post("/offers/new")
                    .send(withGodToken(offer_params));

                expect(res.status).toBe(HTTPStatus.CONFLICT);
                expect(res.body).toHaveProperty("error_code", ErrorTypes.VALIDATION_ERROR);
                expect(res.body).toHaveProperty("errors");
                expect(res.body.errors).toContainEqual(
                    ValidationReasons.MAX_CONCURRENT_OFFERS_EXCEEDED(CompanyConstants.offers.max_concurrent));
            });
        });

        describe("Default values", () => {
            test("publishDate defaults to the current time if not provided", async () => {
                const offer = {
                    title: "Test Offer",
                    publishEndDate: (new Date(Date.now() + (DAY_TO_MS))).toISOString(),
                    description: "For Testing Purposes",
                    contacts: ["geral@niaefeup.pt", "229417766"],
                    jobType: "SUMMER INTERNSHIP",
                    fields: ["DEVOPS", "MACHINE LEARNING", "OTHER"],
                    technologies: ["React", "CSS"],
                    owner: test_company._id,
                    ownerName: test_company.name,
                    location: "Testing Street, Test City, 123",
                    requirements: ["The candidate must be tested", "Fluent in testJS"],
                };

                const res = await request()
                    .post("/offers/new")
                    .send(withGodToken(offer));

                expect(res.status).toBe(HTTPStatus.OK);
                const created_offer_id = res.body._id;

                const created_offer = await Offer.findById(created_offer_id);

                expect(created_offer).toBeDefined();
                expect(created_offer).toHaveProperty("title", offer.title);
                expect(created_offer).toHaveProperty("description", offer.description);
                expect(created_offer).toHaveProperty("location", offer.location);
                expect(created_offer).toHaveProperty("publishDate");
            });
        });

        describe("Job Duration", () => {
            test("should fail if jobMinDuration is greater than jobMaxDuration", async () => {
                const offer_params = generateTestOffer({
                    jobMinDuration: 10,
                    jobMaxDuration: 8,
                    owner: test_company._id,
                    ownerName: test_company.name,
                });

                const res = await request()
                    .post("/offers/new")
                    .send(withGodToken(offer_params));

                expect(res.status).toBe(HTTPStatus.UNPROCESSABLE_ENTITY);
                expect(res.body).toHaveProperty("error_code", ErrorTypes.VALIDATION_ERROR);
                expect(res.body).toHaveProperty("errors");
                expect(res.body.errors[0]).toHaveProperty("param", "jobMaxDuration");
                expect(res.body.errors[0]).toHaveProperty("msg", ValidationReasons.MUST_BE_AFTER("jobMinDuration"));
            });

            test("should succeed if jobMaxDuration is greater than jobMinDuration", async () => {
                const offer_params = generateTestOffer({
                    jobMinDuration: 8,
                    jobMaxDuration: 10,
                    owner: test_company._id,
                    ownerName: test_company.name,
                });

                const res = await request()
                    .post("/offers/new")
                    .send(withGodToken(offer_params));

                expect(res.status).toBe(HTTPStatus.OK);
            });

            test("should fail if jobMaxDuration is specified and jobMinDuration isn't", async () => {
                const offer_params = generateTestOffer({
                    jobMaxDuration: 8,
                    owner: test_company._id,
                    ownerName: test_company.name,
                });

                const res = await request()
                    .post("/offers/new")
                    .send(withGodToken(offer_params));

                expect(res.status).toBe(HTTPStatus.UNPROCESSABLE_ENTITY);
                expect(res.body).toHaveProperty("error_code", ErrorTypes.VALIDATION_ERROR);
                expect(res.body).toHaveProperty("errors");
                expect(res.body.errors[0]).toHaveProperty("param", "jobMaxDuration");
                expect(res.body.errors[0]).toHaveProperty("msg", ValidationReasons.JOB_MIN_DURATION_NOT_SPECIFIED);
            });

            test("should succeed if jobMinDuration is specified and jobMaxDuration isn't", async () => {
                const offer_params = generateTestOffer({
                    jobMinDuration: 8,
                    owner: test_company._id,
                    ownerName: test_company.name,
                });

                const res = await request()
                    .post("/offers/new")
                    .send(withGodToken(offer_params));

                expect(res.status).toBe(HTTPStatus.OK);
            });
        });
    });

    describe("GET /offers", () => {
        describe("Input Validation", () => {
            const EndpointValidatorTester = ValidatorTester((params) => request().get("/offers").query(params));
            const QueryValidatorTester = EndpointValidatorTester("query");

            describe("offset", () => {
                const FieldValidatorTester = QueryValidatorTester("offset");
                FieldValidatorTester.mustBeNumber();
            });

            describe("limit", () => {
                const FieldValidatorTester = QueryValidatorTester("limit");
                FieldValidatorTester.mustBeNumber();
            });

            describe("jobMinDuration", () => {
                const FieldValidatorTester = QueryValidatorTester("jobMinDuration");
                FieldValidatorTester.mustBeNumber();
            });

            describe("jobMaxDuration", () => {
                const FieldValidatorTester = QueryValidatorTester("jobMaxDuration");
                FieldValidatorTester.mustBeNumber();
            });

            describe("jobType", () => {
                const FieldValidatorTester = QueryValidatorTester("jobType");
                FieldValidatorTester.mustBeInArray(JobTypes);
            });

            describe("fields", () => {
                const FieldValidatorTester = QueryValidatorTester("fields");
                FieldValidatorTester.mustHaveValuesInRange(FieldTypes.FieldTypes, FieldTypes.MIN_FIELDS + 1);
            });

            describe("technologies", () => {
                const FieldValidatorTester = QueryValidatorTester("technologies");
                FieldValidatorTester.mustHaveValuesInRange(TechnologyTypes.TechnologyTypes, TechnologyTypes.MIN_TECHNOLOGIES + 1);
            });
        });

        describe("Using already created offer(s)", () => {
            let test_company;
            let test_offer;

            beforeAll(async () => {
                test_company = await Company.create({
                    name: "test company",
                    bio: "a bio",
                    contacts: ["a contact"]
                });

                test_offer = {
                    ...generateTestOffer({
                        "publishDate": "2019-11-22T00:00:00.000Z",
                        "publishEndDate": "2019-11-28T00:00:00.000Z"
                    }),
                    owner: test_company._id,
                    ownerName: test_company.name,
                };

                await Offer.deleteMany({});
                await Offer.create(test_offer);
            });

            const RealDateNow = Date.now;
            const mockCurrentDate = new Date("2019-11-23");

            beforeEach(() => {
                Date.now = () => mockCurrentDate.getTime();
            });

            afterEach(() => {
                Date.now = RealDateNow;
            });

            describe("Only current offers are returned", () => {

                const expired_test_offer = generateTestOffer({
                    "publishDate": "2019-11-17",
                    "publishEndDate": "2019-11-18"
                });
                const future_test_offer = generateTestOffer({
                    "publishDate": (new Date(Date.now() + (DAY_TO_MS))).toISOString(),
                    "publishEndDate": (new Date(Date.now() + (2 * DAY_TO_MS))).toISOString()
                });

                beforeAll(async () => {

                    [future_test_offer, expired_test_offer]
                        .forEach((offer) => {
                            offer.owner = test_company._id;
                            offer.ownerName = test_company.name;
                        });

                    await Offer.create([expired_test_offer, future_test_offer]);
                });


                test("should provide only current offer info (no expired or future offers)", async () => {
                    const res = await request()
                        .get("/offers");

                    expect(res.status).toBe(HTTPStatus.OK);
                    expect(res.body).toHaveLength(1);
                    // Necessary because jest matchers appear to not be working (expect.any(Number), expect.anthing(), etc)
                    const extracted_data = res.body.map((elem) => {
                        delete elem["_id"];
                        delete elem["__v"];
                        delete elem["createdAt"];
                        delete elem["updatedAt"];
                        delete elem["score"];
                        return elem;
                    });
                    const prepared_test_offer = {
                        ...test_offer,
                        isHidden: false,
                        owner: test_offer.owner.toString()
                    };

                    expect(extracted_data).toContainEqual(prepared_test_offer);
                });

                describe("When a limit is given", () => {
                    beforeAll(async () => {
                        // Add 2 more offers
                        await Offer.deleteMany({});
                        await Offer.create([test_offer, expired_test_offer, future_test_offer, test_offer, test_offer]);
                    });

                    test("Only `limit` number of offers are returned", async () => {
                        const res = await request()
                            .get("/offers")
                            .query({
                                limit: 2,
                            });

                        expect(res.status).toBe(HTTPStatus.OK);
                        expect(res.body).toHaveLength(2);

                        // Necessary because jest matchers appear to not be working (expect.any(Number), expect.anthing(), etc)
                        const extracted_data = res.body.map((elem) => {
                            delete elem["_id"]; delete elem["__v"]; delete elem["createdAt"]; delete elem["updatedAt"];
                            return elem;
                        });

                        const prepared_test_offer = {
                            ...test_offer,
                            isHidden: false,
                            owner: test_offer.owner.toString()
                        };

                        expect(extracted_data).toContainEqual(prepared_test_offer);
                    });
                });
                describe("When showHidden is active", () => {

                    beforeAll(async () => {
                        // Add 1 hidden offer
                        await Offer.deleteMany({});
                        await Offer.create([test_offer, { ...test_offer, isHidden: true }]);

                    });

                    test("Should not return hidden offers by default", async () => {
                        await test_agent
                            .post("/auth/login")
                            .send({
                                email: test_user_company.email,
                                password: test_user_company.password,
                            });

                        const res = await test_agent
                            .get("/offers");

                        expect(res.status).toBe(HTTPStatus.OK);
                        expect(res.body).toHaveLength(1);

                        // Necessary because jest matchers appear to not be working (expect.any(Number), expect.anthing(), etc)
                        const extracted_data = res.body.map((elem) => {
                            delete elem["_id"]; delete elem["__v"]; delete elem["createdAt"]; delete elem["updatedAt"];
                            return elem;
                        });

                        const prepared_test_offer = {
                            ...test_offer,
                            isHidden: false,
                            owner: test_offer.owner.toString()
                        };

                        expect(extracted_data).toContainEqual(prepared_test_offer);
                    });

                    test("Only admins can use showHidden", async () => {
                        await test_agent
                            .post("/auth/login")
                            .send({
                                email: test_user_company.email,
                                password: test_user_company.password,
                            });

                        const res = await test_agent
                            .get("/offers")
                            .query({
                                showHidden: true,
                            });

                        expect(res.status).toBe(HTTPStatus.OK);
                        expect(res.body).toHaveLength(1);

                        // Necessary because jest matchers appear to not be working (expect.any(Number), expect.anthing(), etc)
                        const extracted_data = res.body.map((elem) => {
                            delete elem["_id"]; delete elem["__v"]; delete elem["createdAt"]; delete elem["updatedAt"];
                            return elem;
                        });

                        const prepared_test_offer = {
                            ...test_offer,
                            isHidden: false,
                            owner: test_offer.owner.toString()
                        };

                        expect(extracted_data).toContainEqual(prepared_test_offer);
                    });

                    test("Only admins can use showHidden (with admin)", async () => {
                        await test_agent
                            .post("/auth/login")
                            .send({
                                email: test_user_admin.email,
                                password: test_user_admin.password,
                            });

                        const res = await test_agent
                            .get("/offers")
                            .query({
                                showHidden: true,
                            });

                        expect(res.status).toBe(HTTPStatus.OK);
                        expect(res.body).toHaveLength(2);

                        // Necessary because jest matchers appear to not be working (expect.any(Number), expect.anthing(), etc)
                        const extracted_data = res.body.map((elem) => {
                            delete elem["_id"]; delete elem["__v"]; delete elem["createdAt"]; delete elem["updatedAt"];
                            return elem;
                        });

                        const prepared_test_offer = {
                            ...test_offer,
                            isHidden: false,
                            owner: test_offer.owner.toString()
                        };

                        expect(extracted_data).toContainEqual(prepared_test_offer);
                    });
                });

            });

            describe("Full text search", () => {

                let portoFrontend;
                let portoBackend;
                let lisboaBackend;
                let niaefeupOffer;

                beforeAll(async () => {
                    portoFrontend = {
                        ...test_offer,
                        location: "Porto",
                        jobType: "FULL-TIME",
                        fields: ["FRONTEND", "OTHER"],
                        jobMinDuration: 3,
                        jobMaxDuration: 6
                    };
                    portoBackend = {
                        ...test_offer,
                        location: "Porto",
                        fields: ["BACKEND", "OTHER"],
                        jobMinDuration: 2,
                        jobMaxDuration: 4
                    };
                    lisboaBackend = {
                        ...test_offer,
                        location: "Lisboa",
                        fields: ["BACKEND", "DEVOPS"]
                    };
                    niaefeupOffer = {
                        ...test_offer,
                        location: "FEUP",
                        fields: ["BLOCKCHAIN", "OTHER"],
                        ownerName: "NIAEFEUP"
                    };
                    await Offer.deleteMany({});
                    await Offer.create([portoBackend, portoFrontend, lisboaBackend, niaefeupOffer]);
                });

                test("should return porto offers", async () => {

                    const res = await request()
                        .get("/offers")
                        .query({
                            value: "porto"
                        });

                    expect(res.status).toBe(HTTPStatus.OK);
                    expect(res.body).toHaveLength(2);

                    // Necessary because jest matchers appear to not be working (expect.any(Number), expect.anthing(), etc)
                    const extracted_data = res.body.map((elem) => {
                        delete elem["_id"]; delete elem["__v"]; delete elem["createdAt"]; delete elem["updatedAt"]; delete elem["score"];
                        return elem;
                    });

                    // eslint-disable-next-line no-unused-vars
                    const expected_offers = [portoBackend, portoFrontend].map(({ owner, ...offer }) => ({
                        ...offer,
                        isHidden: false,
                        owner: owner.toString()
                    }));

                    expected_offers.forEach((expected) => {
                        expect(extracted_data).toContainEqual(expected);
                    });
                });

                test("should return niaefeup (company) offers", async () => {

                    const res = await request()
                        .get("/offers")
                        .query({
                            value: "niaefeup"
                        });

                    expect(res.status).toBe(HTTPStatus.OK);
                    expect(res.body).toHaveLength(1);

                    // Necessary because jest matchers appear to not be working (expect.any(Number), expect.anthing(), etc)
                    const extracted_data = res.body.map((elem) => {
                        delete elem["_id"]; delete elem["__v"]; delete elem["createdAt"]; delete elem["updatedAt"]; delete elem["score"];
                        return elem;
                    });

                    const prepared_test_offer = {
                        ...niaefeupOffer,
                        isHidden: false,
                        owner: niaefeupOffer.owner.toString()
                    };

                    expect(extracted_data).toContainEqual(prepared_test_offer);
                });

                test("should return porto offers in order", async () => {

                    const res = await request()
                        .get("/offers")
                        .query({
                            value: "porto frontend"
                        });

                    expect(res.status).toBe(HTTPStatus.OK);
                    expect(res.body).toHaveLength(2);

                    // Necessary because jest matchers appear to not be working (expect.any(Number), expect.anthing(), etc)
                    const extracted_data = res.body.map((elem) => {
                        delete elem["_id"]; delete elem["__v"]; delete elem["createdAt"]; delete elem["updatedAt"]; delete elem["score"];
                        return elem;
                    });

                    // eslint-disable-next-line no-unused-vars
                    const expected_offers = [portoFrontend, portoBackend].map(({ owner, ...offer }) => ({
                        ...offer,
                        isHidden: false,
                        owner: owner.toString()
                    }));

                    expected_offers.forEach((expected, i) => {
                        expect(extracted_data[i]).toEqual(expected);
                    });
                });

                test("should return porto offers for FULL-TIME", async () => {

                    const res = await request()
                        .get("/offers")
                        .query({
                            value: "porto",
                            jobType: "FULL-TIME"
                        });

                    expect(res.status).toBe(HTTPStatus.OK);
                    expect(res.body).toHaveLength(1);

                    // Necessary because jest matchers appear to not be working (expect.any(Number), expect.anthing(), etc)
                    const extracted_data = res.body.map((elem) => {
                        delete elem["_id"]; delete elem["__v"]; delete elem["createdAt"]; delete elem["updatedAt"]; delete elem["score"];
                        return elem;
                    });

                    const prepared_test_offer = {
                        ...portoFrontend,
                        isHidden: false,
                        owner: portoFrontend.owner.toString()
                    };

                    expect(extracted_data).toContainEqual(prepared_test_offer);
                });

                test("should return porto offers with React", async () => {

                    const res = await request()
                        .get("/offers")
                        .query({
                            value: "porto",
                            technologies: ["React"]
                        });

                    expect(res.status).toBe(HTTPStatus.OK);
                    expect(res.body).toHaveLength(2);

                    // Necessary because jest matchers appear to not be working (expect.any(Number), expect.anthing(), etc)
                    const extracted_data = res.body.map((elem) => {
                        delete elem["_id"]; delete elem["__v"]; delete elem["createdAt"]; delete elem["updatedAt"]; delete elem["score"];
                        return elem;
                    });

                    // eslint-disable-next-line no-unused-vars
                    const expected_offers = [portoFrontend, portoBackend].map(({ owner, ...offer }) => ({
                        ...offer,
                        isHidden: false,
                        owner: owner.toString()
                    }));

                    expected_offers.forEach((expected) => {
                        expect(extracted_data).toContainEqual(expected);
                    });
                });

                test("should return offers with DEVOPS", async () => {

                    const res = await request()
                        .get("/offers")
                        .query({
                            fields: ["DEVOPS"]
                        });

                    expect(res.status).toBe(HTTPStatus.OK);
                    expect(res.body).toHaveLength(1);

                    // Necessary because jest matchers appear to not be working (expect.any(Number), expect.anthing(), etc)
                    const extracted_data = res.body.map((elem) => {
                        delete elem["_id"]; delete elem["__v"]; delete elem["createdAt"]; delete elem["updatedAt"]; delete elem["score"];
                        return elem;
                    });

                    const prepared_test_offer = {
                        ...lisboaBackend,
                        isHidden: false,
                        owner: lisboaBackend.owner.toString()
                    };

                    expect(extracted_data).toContainEqual(prepared_test_offer);
                });

                test("should return porto offers with min duration of 2", async () => {

                    const res = await request()
                        .get("/offers")
                        .query({
                            value: "porto",
                            jobMinDuration: 2
                        });

                    expect(res.status).toBe(HTTPStatus.OK);
                    expect(res.body).toHaveLength(2);

                    // Necessary because jest matchers appear to not be working (expect.any(Number), expect.anthing(), etc)
                    const extracted_data = res.body.map((elem) => {
                        delete elem["_id"]; delete elem["__v"]; delete elem["createdAt"]; delete elem["updatedAt"]; delete elem["score"];
                        return elem;
                    });

                    // eslint-disable-next-line no-unused-vars
                    const expected_offers = [portoFrontend, portoBackend].map(({ owner, ...offer }) => ({
                        ...offer,
                        isHidden: false,
                        owner: owner.toString()
                    }));

                    expected_offers.forEach((expected) => {
                        expect(extracted_data).toContainEqual(expected);
                    });
                });

                test("should return porto offers with min duration of 2 and max duration of 4", async () => {

                    const res = await request()
                        .get("/offers")
                        .query({
                            value: "porto",
                            jobMinDuration: 2,
                            jobMaxDuration: 4
                        });
                    expect(res.status).toBe(HTTPStatus.OK);
                    expect(res.body).toHaveLength(1);

                    // Necessary because jest matchers appear to not be working (expect.any(Number), expect.anthing(), etc)
                    const extracted_data = res.body.map((elem) => {
                        delete elem["_id"]; delete elem["__v"]; delete elem["createdAt"]; delete elem["updatedAt"]; delete elem["score"];
                        return elem;
                    });

                    const prepared_test_offer = {
                        ...portoBackend,
                        isHidden: false,
                        owner: portoBackend.owner.toString()
                    };

                    expect(extracted_data).toContainEqual(prepared_test_offer);
                });
            });

            describe("Offer requirements", () => {

                beforeAll(async () => {
                    await Offer.deleteMany();
                    await Offer.create(test_offer);
                });

                test("should return an array of requirements", async () => {

                    const res = await request()
                        .get("/offers");

                    expect(res.status).toBe(HTTPStatus.OK);
                    expect(res.body).toHaveLength(1);
                    expect(res.body[0].requirements).toEqual(test_offer.requirements);
                });
            });
        });
    });

    describe("GET /offers/:offerId", () => {

        beforeAll(async () => {
            await Offer.deleteMany({});
        });

        describe("Id Validation", () => {
            test("should fail if requested an invalid id", async () => {
                const res = await request()
                    .get("/offers/123");

                expect(res.body.errors[0]).toHaveProperty("msg", ValidationReasons.OBJECT_ID);
            });
            test("should fail if an offer does not exist", async () => {
                const id = Types.ObjectId("5facf0cdb8bc30016ee58952");
                const res = await request()
                    .get(`/offers/${id}`);
                expect(res.status).toBe(HTTPStatus.NOT_FOUND);
                expect(res.body).toHaveProperty("error_code", ErrorTypes.FORBIDDEN);
                expect(res.body).toHaveProperty("errors");
                expect(res.body.errors).toContainEqual(ValidationReasons.OFFER_NOT_FOUND(id));
            });
        });

        describe("Get offer by Id", () => {
            const test_offers = [{}, {}, {}];

            const test_agent = agent();


            beforeAll(async () => {
                await Offer.deleteMany({});

                const createOffer = async (offer) => {
                    const { _id, owner, ownerName } = await Offer.create({
                        ...offer,
                        owner: test_company._id.toString(),
                        ownerName: test_company.name,
                    });
                    return {
                        ...offer,
                        owner: owner.toString(),
                        ownerName,
                        _id: _id.toString()
                    };
                };

                (await Promise.all(test_offers
                    .map((_, i) => createOffer({ ...generateTestOffer(), isHidden: i === 2 }))))
                    .forEach((elem, i) => {
                        test_offers[i] = elem;
                    });
            });

            test("should return offer", async () => {
                const res_1 = await test_agent.get(`/offers/${test_offers[0]._id}`);
                expect(res_1.status).toBe(HTTPStatus.OK);
                const extracted_data_1 = res_1.body;
                expect(extracted_data_1).toMatchObject(test_offers[0]);

                const res_2 = await test_agent.get(`/offers/${test_offers[1]._id}`);
                expect(res_2.status).toBe(HTTPStatus.OK);
                const extracted_data_2 = res_2.body;

                expect(extracted_data_2).toMatchObject(test_offers[1]);
            });

            test("should fail if not admin or owner", async () => {
                const res = await test_agent.get(`/offers/${test_offers[2]._id}`);
                expect(res.status).toBe(HTTPStatus.NOT_FOUND);
            });

            test("should return hidden offer as admin", async () => {
                const hiddenOffer = test_offers[2];
                await test_agent
                    .post("/auth/login")
                    .send(test_user_admin)
                    .expect(200);

                const res = await test_agent.get(`/offers/${hiddenOffer._id}`);
                expect(res.status).toBe(HTTPStatus.OK);

                const extracted_data = res.body;

                expect(extracted_data).toMatchObject(hiddenOffer);
            });

            test("should return hidden offer as company", async () => {
                const hiddenOffer = test_offers[2];
                await test_agent
                    .post("/auth/login")
                    .send(test_user_company)
                    .expect(200);

                const res = await test_agent.get(`/offers/${hiddenOffer._id}`);
                expect(res.status).toBe(HTTPStatus.OK);
                const extracted_data = res.body;

                expect(extracted_data).toMatchObject(hiddenOffer);
            });
        });
    });

    describe("POST /offers/edit/:offerId", () => {
        let createOffer,
            expired_test_offer,
            grace_period_over_test_offer,
            grace_period_valid_test_offer,
            future_test_offer,
            valid_test_offer_1,
            valid_test_offer_2,
            disabled_test_offer;

        beforeAll(async () => {
            await Offer.deleteMany({});
            await test_agent.del("/auth/login");
            createOffer = async (offer) => {
                const { _id, owner, ownerName, jobMinDuration, jobMaxDuration, createdAt } = await Offer.create({
                    ...offer,
                    owner: test_company._id.toString(),
                    ownerName: test_company.name,
                });
                return {
                    ...offer,
                    owner: owner.toString(),
                    ownerName,
                    _id: _id.toString(),
                    jobMinDuration,
                    jobMaxDuration,
                    createdAt: createdAt.toISOString()
                };
            };

            expired_test_offer = await createOffer(generateTestOffer({
                "publishDate": "2019-11-17",
                "publishEndDate": "2019-11-18"
            }));

            grace_period_over_test_offer = await createOffer(generateTestOffer({
                "publishDate": (new Date(Date.now())).toISOString(),
                "publishEndDate": (new Date(Date.now() + (2 * DAY_TO_MS))).toISOString()
            }
            ));

            grace_period_valid_test_offer = await createOffer(generateTestOffer({
                "publishDate": (new Date(Date.now())).toISOString(),
                "publishEndDate": (new Date(Date.now() + (2 * DAY_TO_MS))).toISOString()
            }
            ));

            future_test_offer = await createOffer(generateTestOffer({
                "publishDate": (new Date(Date.now() + (2 * DAY_TO_MS))).toISOString(),
                "publishEndDate": (new Date(Date.now() + (3 * DAY_TO_MS))).toISOString(),
                "jobMinDuration": 4,
                "jobMaxDuration": 5,
            }
            ));

            valid_test_offer_1 = await createOffer(generateTestOffer({
                "publishDate": (new Date(Date.now() + (2 * DAY_TO_MS))).toISOString(),
                "publishEndDate": (new Date(Date.now() + (3 * DAY_TO_MS))).toISOString(),
                "jobMinDuration": 4,
                "jobMaxDuration": 5,
            }
            ));

            valid_test_offer_2 = await createOffer(generateTestOffer({
                "publishDate": (new Date(Date.now() + (2 * DAY_TO_MS))).toISOString(),
                "publishEndDate": (new Date(Date.now() + (3 * DAY_TO_MS))).toISOString(),
                "jobMinDuration": 4,
                "jobMaxDuration": 5,
            }
            ));

            disabled_test_offer = await createOffer(
                generateTestOffer()
            );

            await (new OfferService()).disable(disabled_test_offer._id, OfferConstants.HiddenOfferReasons.admin);
        });

        test("should fail not logged in", async () => {
            const res = await test_agent
                .post(`/offers/edit/${future_test_offer._id}`)
                .expect(HTTPStatus.UNAUTHORIZED);
            expect(res.status).toBe(HTTPStatus.UNAUTHORIZED);
            expect(res.body).toHaveProperty("error_code", ErrorTypes.FORBIDDEN);
            expect(res.body).toHaveProperty("errors");
            expect(res.body.errors).toContainEqual(ValidationReasons.INSUFFICIENT_PERMISSIONS);
        });

        describe("testing validations with god token", () => {
            test("should fail with invalid id", async () => {
                const res = await test_agent
                    .post("/offers/edit/not-a-valid-id")
                    .send(withGodToken())
                    .expect(HTTPStatus.UNPROCESSABLE_ENTITY);
                expect(res.body.errors[0]).toHaveProperty("param", "offerId");
                expect(res.body.errors[0]).toHaveProperty("msg", ValidationReasons.OBJECT_ID);
            });

            test("should fail if offer does not exist", async () => {
                const _id = "111111111111111111111111";
                const res = await test_agent
                    .post(`/offers/edit/${_id}`)
                    .send(withGodToken())
                    .expect(HTTPStatus.UNPROCESSABLE_ENTITY);
                expect(res.body.errors[0]).toHaveProperty("param", "offerId");
                expect(res.body.errors[0]).toHaveProperty("msg", ValidationReasons.OFFER_NOT_FOUND(_id));
            });


            test("should fail with expired offer", async () => {
                const res = await test_agent
                    .post(`/offers/edit/${expired_test_offer._id.toString()}`)
                    .send(withGodToken())
                    .expect(HTTPStatus.FORBIDDEN);
                expect(res.body).toHaveProperty("errors");
                expect(res.body.errors).toContainEqual(ValidationReasons.OFFER_EXPIRED(expired_test_offer._id.toString()));
            });

            describe("should fail if offer with grace period over", () => {
                const RealDateNow = Date.now;
                const mockDate = new Date(Date.now() + (OFFER_EDIT_GRACE_PERIOD_HOURS * HOUR_IN_MS * 2));
                beforeEach(() => {
                    Date.now = () => mockDate.getTime();
                });

                afterEach(() => {
                    Date.now = RealDateNow;
                });

                test("should fail offer with grace period over", async () => {
                    const expired_over_hours =
                        ((new Date(Date.now())).getTime() - (new Date(grace_period_over_test_offer.createdAt)).getTime()) / HOUR_IN_MS;
                    const res = await test_agent
                        .post(`/offers/edit/${grace_period_over_test_offer._id.toString()}`)
                        .send(withGodToken())
                        .expect(HTTPStatus.FORBIDDEN);
                    expect(res.body).toHaveProperty("errors");
                    expect(res.body.errors).toContainEqual(ValidationReasons.OFFER_EDIT_PERIOD_OVER(expired_over_hours.toFixed(2)));
                });

            });

            test("should allow editing offer with valid grace period", async () => {
                await test_agent
                    .post(`/offers/edit/${grace_period_valid_test_offer._id.toString()}`)
                    .send(withGodToken())
                    .expect(HTTPStatus.OK);
            });

            test("should allow editing offer in the future", async () => {
                await test_agent
                    .post(`/offers/edit/${future_test_offer._id.toString()}`)
                    .send(withGodToken())
                    .expect(HTTPStatus.OK);
            });

            describe("testing edit dates in the past", () => {
                test("should fail if publishDate in the past", async () => {
                    const res = await test_agent
                        .post(`/offers/edit/${future_test_offer._id.toString()}`)
                        .send(withGodToken({ "publishDate": "2019-02-01" }))
                        .expect(HTTPStatus.UNPROCESSABLE_ENTITY);
                    expect(res.body.errors[0]).toHaveProperty("param", "publishDate");
                    expect(res.body.errors[0]).toHaveProperty("msg", ValidationReasons.DATE_EXPIRED);
                });

                test("should fail if publishEndDate in the past", async () => {
                    const res = await test_agent
                        .post(`/offers/edit/${future_test_offer._id.toString()}`)
                        .send(withGodToken({ "publishEndDate": "2019-02-01" }))
                        .expect(HTTPStatus.UNPROCESSABLE_ENTITY);
                    expect(res.body.errors[0]).toHaveProperty("param", "publishEndDate");
                    expect(res.body.errors[0]).toHaveProperty("msg", ValidationReasons.DATE_EXPIRED);
                });
            });

            describe("testing dates editing", () => {
                test("should fail if publishDate after offer publishEndDate", async () => {
                    const res = await test_agent
                        .post(`/offers/edit/${future_test_offer._id.toString()}`)
                        .send(withGodToken({
                            "publishDate":
                            (new Date(new Date(future_test_offer.publishEndDate).getTime() + DAY_TO_MS))
                                .toISOString()
                        }))
                        .expect(HTTPStatus.UNPROCESSABLE_ENTITY);
                    expect(res.body.errors[0]).toHaveProperty("param", "publishDate");
                    expect(res.body.errors[0]).toHaveProperty("msg", ValidationReasons.MUST_BE_BEFORE("publishEndDate"));
                });

                test("should fail if publishEndDate before offer publishDate", async () => {
                    const res = await test_agent
                        .post(`/offers/edit/${future_test_offer._id.toString()}`)
                        .send(withGodToken({
                            "publishEndDate":
                            (new Date(new Date(future_test_offer.publishDate).getTime() - DAY_TO_MS))
                                .toISOString()
                        }))
                        .expect(HTTPStatus.UNPROCESSABLE_ENTITY);
                    expect(res.body.errors[0]).toHaveProperty("param", "publishEndDate");
                    expect(res.body.errors[0]).toHaveProperty("msg", ValidationReasons.MUST_BE_AFTER("publishDate"));
                });

                test("should fail if sending invalid date combination in request", async () => {
                    const res = await test_agent
                        .post(`/offers/edit/${future_test_offer._id.toString()}`)
                        .send(withGodToken({
                            "publishEndDate": new Date(Date.now() + DAY_TO_MS).toISOString(),
                            "publishDate": new Date(Date.now() + (2 * DAY_TO_MS)).toISOString(),
                        }))
                        .expect(HTTPStatus.UNPROCESSABLE_ENTITY);
                    expect(res.body.errors[0]).toHaveProperty("param", "publishEndDate");
                    expect(res.body.errors[0]).toHaveProperty("msg", ValidationReasons.MUST_BE_AFTER("publishDate"));
                });

                test("should edit if is after offer's publishEndDate", async () => {
                    const newDate = (new Date(new Date(future_test_offer.publishEndDate).getTime() - DAY_TO_MS));
                    const res = await test_agent
                        .post(`/offers/edit/${future_test_offer._id.toString()}`)
                        .send(withGodToken({ "publishDate": newDate.toISOString() }))
                        .expect(HTTPStatus.OK);
                    expect(res.body).toHaveProperty("publishDate", newDate.toISOString());
                });

                test("should edit if is after request's publishEndDate", async () => {
                    const newPublishDate = (new Date(new Date(future_test_offer.publishEndDate).getTime() + DAY_TO_MS));
                    const newPublishEndDate = (new Date(new Date(future_test_offer.publishEndDate).getTime() + (2 * DAY_TO_MS)));
                    const res = await test_agent
                        .post(`/offers/edit/${future_test_offer._id.toString()}`)
                        .send(withGodToken({
                            "publishDate": newPublishDate.toISOString(),
                            "publishEndDate": newPublishEndDate.toISOString()
                        }))
                        .expect(HTTPStatus.OK);
                    expect(res.body).toHaveProperty("publishDate", newPublishDate.toISOString());
                    expect(res.body).toHaveProperty("publishEndDate", newPublishEndDate.toISOString());
                });
            });

            describe("testing other validations", () => {

                test("should fail if offer disabled by admins", async () => {
                    await test_agent
                        .post("/auth/login")
                        .send(test_user_company)
                        .expect(HTTPStatus.OK);
                    const res = await test_agent
                        .post(`/offers/${disabled_test_offer._id}/enable`)
                        .expect(HTTPStatus.FORBIDDEN);
                    expect(res.body).toHaveProperty("error_code", ErrorTypes.FORBIDDEN);
                    expect(res.body).toHaveProperty("errors");
                    expect(res.body.errors).toContainEqual(ValidationReasons.OFFER_BLOCKED_ADMIN);
                    await test_agent
                        .del("/auth/login");
                });

                test("should fail if minDuration bigger than offer's maxDuration", async () => {
                    const res = await test_agent
                        .post(`/offers/edit/${future_test_offer._id.toString()}`)
                        .send(withGodToken({ "jobMinDuration": future_test_offer.jobMaxDuration + 1 }))
                        .expect(HTTPStatus.UNPROCESSABLE_ENTITY);
                    expect(res.body.errors[0]).toHaveProperty("param", "jobMinDuration");
                    expect(res.body.errors[0]).toHaveProperty("msg", ValidationReasons.MUST_BE_BEFORE("jobMaxDuration"));
                });
                test("should fail if maxDuration smaller than offer's minDuration", async () => {
                    const res = await test_agent
                        .post(`/offers/edit/${future_test_offer._id.toString()}`)
                        .send(withGodToken({ "jobMaxDuration": future_test_offer.jobMinDuration - 1 }))
                        .expect(HTTPStatus.UNPROCESSABLE_ENTITY);
                    expect(res.body.errors[0]).toHaveProperty("param", "jobMaxDuration");
                    expect(res.body.errors[0]).toHaveProperty("msg", ValidationReasons.MUST_BE_AFTER("jobMinDuration"));
                });
                test("should fail if invalid combination of jobDuration in request", async () => {
                    const res = await test_agent
                        .post(`/offers/edit/${future_test_offer._id.toString()}`)
                        .send(withGodToken({
                            "jobMaxDuration": 11,
                            "jobMinDuration": 12
                        }))
                        .expect(HTTPStatus.UNPROCESSABLE_ENTITY);
                    expect(res.body.errors[0]).toHaveProperty("param", "jobMaxDuration");
                    expect(res.body.errors[0]).toHaveProperty("msg", ValidationReasons.MUST_BE_AFTER("jobMinDuration"));
                });

                test("should fail if requirements is empty array", async () => {
                    const res = await test_agent
                        .post(`/offers/edit/${future_test_offer._id.toString()}`)
                        .send(withGodToken({ "requirements": [] }))
                        .expect(HTTPStatus.UNPROCESSABLE_ENTITY);
                    expect(res.body.errors[0]).toHaveProperty("param", "requirements");
                    expect(res.body.errors[0]).toHaveProperty("msg", ValidationReasons.TOO_SHORT(1));
                });

                test("should edit if valid requirements", async () => {
                    await test_agent
                        .post(`/offers/edit/${future_test_offer._id.toString()}`)
                        .send(withGodToken({ "requirements": future_test_offer.requirements }))
                        .expect(HTTPStatus.OK);
                });

                const EndpointValidatorTester = ValidatorTester((params) => request().post("/offers/new").send(withGodToken(params)));
                const BodyValidatorTester = EndpointValidatorTester("body");

                describe("title", () => {
                    const FieldValidatorTester = BodyValidatorTester("title");
                    FieldValidatorTester.mustBeString();
                    FieldValidatorTester.hasMaxLength(OfferConstants.title.max_length);
                });

                describe("jobStartDate", () => {
                    const FieldValidatorTester = BodyValidatorTester("jobStartDate");
                    FieldValidatorTester.mustBeDate();
                });

                describe("description", () => {
                    const FieldValidatorTester = BodyValidatorTester("description");
                    FieldValidatorTester.mustBeString();
                    FieldValidatorTester.hasMaxLength(OfferConstants.description.max_length);
                });

                describe("contacts", () => {
                    const FieldValidatorTester = BodyValidatorTester("contacts");
                    FieldValidatorTester.isRequired();
                });

                describe("isPaid", () => {
                    const FieldValidatorTester = BodyValidatorTester("isPaid");
                    FieldValidatorTester.mustBeBoolean();
                });

                describe("vacancies", () => {
                    const FieldValidatorTester = BodyValidatorTester("vacancies");
                    FieldValidatorTester.mustBeNumber();
                });

                describe("jobType", () => {
                    const FieldValidatorTester = BodyValidatorTester("jobType");
                    FieldValidatorTester.mustBeString();
                    FieldValidatorTester.mustBeInArray(JobTypes);
                });

                describe("fields", () => {
                    const FieldValidatorTester = BodyValidatorTester("fields");
                    FieldValidatorTester.mustBeArrayBetween(FieldTypes.MIN_FIELDS, FieldTypes.MAX_FIELDS);
                    FieldValidatorTester.mustHaveValuesInRange(FieldTypes.FieldTypes, FieldTypes.MIN_FIELDS + 1);
                });

                describe("technologies", () => {
                    const FieldValidatorTester = BodyValidatorTester("technologies");
                    FieldValidatorTester.mustBeArrayBetween(TechnologyTypes.MIN_TECHNOLOGIES, TechnologyTypes.MAX_TECHNOLOGIES);
                    FieldValidatorTester.mustHaveValuesInRange(TechnologyTypes.TechnologyTypes, TechnologyTypes.MIN_TECHNOLOGIES + 1);
                });

                describe("location", () => {
                    const FieldValidatorTester = BodyValidatorTester("location");
                    FieldValidatorTester.mustBeString();
                });
            });
        });

        describe("testing as admin without god token", () => {
            beforeAll(async () => {
                await test_agent.post("/auth/login")
                    .send(test_user_admin)
                    .expect(HTTPStatus.OK);
            });

            test("should edit as an admin", async () => {
                await test_agent.post(`/offers/edit/${future_test_offer._id}`)
                    .expect(HTTPStatus.OK);
            });
        });


        describe("testing as a company", () => {

            describe("testing as another company", () => {

                const test_user_company_2 = {
                    email: "company2@email.com",
                    password: "password123",
                };

                let test_company_2;

                beforeAll(async () => {
                    test_company_2 = await Company.create({
                        name: "test company",
                        bio: "a bio",
                        contacts: ["a contact"]
                    });
                    await Account.create({
                        email: test_user_company_2.email,
                        password: await hash(test_user_company.password),
                        company: test_company_2._id
                    });

                    await test_agent.post("/auth/login")
                        .send(test_user_company_2)
                        .expect(HTTPStatus.OK);
                });

                test("should fail if the company is not the owner", async () => {
                    const res = await test_agent
                        .post(`/offers/edit/${future_test_offer._id}`)
                        .expect(HTTPStatus.FORBIDDEN);
                    expect(res.body).toHaveProperty("errors");
                    expect(res.body.errors).toContainEqual(ValidationReasons.NOT_OFFER_OWNER(future_test_offer._id));
                });

            });

            describe("testing as offer's owner", () => {
                beforeAll(async () => {
                    await test_agent.post("/auth/login")
                        .send(test_user_company)
                        .expect(HTTPStatus.OK);

                });

                test("should edit title", async () => {
                    const edits = { "title": "This is a new title" };
                    const res = await test_agent.post(`/offers/edit/${valid_test_offer_1._id}`)
                        .send(edits)
                        .expect(HTTPStatus.OK);
                    expect(res.body).toMatchObject({
                        ...valid_test_offer_1,
                        ...edits
                    });
                });

                test("should edit several parameters", async () => {
                    const edits = {
                        "title": "This is a new title",
                        "description": "This is a new description",
                        "jobMinDuration": valid_test_offer_1.jobMinDuration - 1,
                        "location": "Porto",
                        "technologies": ["CSS"]
                    };
                    const res = await test_agent.post(`/offers/edit/${valid_test_offer_2._id}`)
                        .send(edits)
                        .expect(HTTPStatus.OK);
                    expect(res.body).toMatchObject({
                        ...valid_test_offer_2,
                        ...edits
                    });
                });
            });

        });

    });

    describe("POST /offers/:offerId/disable", () => {
        let test_offer, hidden_default_test_offer, hidden_user_test_offer;
        beforeAll(async () => {
            test_offer = await Offer.create({
                ...generateTestOffer(),
                owner: test_company._id.toString(),
                ownerName: test_company.name,
            });

            hidden_default_test_offer = await Offer.create({
                ...generateTestOffer({ isHidden: true }),
                owner: test_company._id.toString(),
                ownerName: test_company.name,
            });

            hidden_user_test_offer = await Offer.create({
                ...generateTestOffer(),
                owner: test_company._id.toString(),
                ownerName: test_company.name,
            });

            await (new OfferService()).disable(hidden_user_test_offer._id, OfferConstants.HiddenOfferReasons.company);
        });

        test("should fail if not logged in", async () => {
            await test_agent
                .del("/auth/login");

            const res = await test_agent
                .post(`/offers/${test_offer._id}/disable`)
                .expect(HTTPStatus.UNAUTHORIZED);
            expect(res.status).toBe(HTTPStatus.UNAUTHORIZED);
            expect(res.body).toHaveProperty("error_code", ErrorTypes.FORBIDDEN);
            expect(res.body).toHaveProperty("errors");
            expect(res.body.errors).toContainEqual(ValidationReasons.INSUFFICIENT_PERMISSIONS);
        });

        test("should fail if logged in as company", async () => {
            await test_agent
                .post("/auth/login")
                .send(test_user_company)
                .expect(HTTPStatus.OK);
            const res = await test_agent
                .post(`/offers/${test_offer._id}/disable`)
                .expect(HTTPStatus.UNAUTHORIZED);
            expect(res.status).toBe(HTTPStatus.UNAUTHORIZED);
            expect(res.body).toHaveProperty("error_code", ErrorTypes.FORBIDDEN);
            expect(res.body).toHaveProperty("errors");
            expect(res.body.errors).toContainEqual(ValidationReasons.INSUFFICIENT_PERMISSIONS);
        });

        test("should allow if logged in as admin", async () => {
            await test_agent
                .post("/auth/login")
                .send(test_user_admin)
                .expect(HTTPStatus.OK);
            const res = await test_agent
                .post(`/offers/${test_offer._id}/disable`);
            expect(res.body).toHaveProperty("hiddenReason", OfferConstants.HiddenOfferReasons.admin);
            expect(res.body).toHaveProperty("isHidden", true);
        });

        test("should fail if offer already disabled", async () => {
            const res = await test_agent
                .post(`/offers/${test_offer._id}/disable`)
                .expect(HTTPStatus.FORBIDDEN);
            expect(res.body).toHaveProperty("error_code", ErrorTypes.FORBIDDEN);
            expect(res.body).toHaveProperty("errors");
            expect(res.body.errors).toContainEqual(ValidationReasons.OFFER_HIDDEN);
        });

        test("should allow if offer hidden by default", async () => {
            const res = await test_agent
                .post(`/offers/${hidden_default_test_offer._id}/disable`)
                .expect(HTTPStatus.OK);
            expect(res.body).toHaveProperty("hiddenReason", OfferConstants.HiddenOfferReasons.admin);
            expect(res.body).toHaveProperty("isHidden", true);
        });

        test("should allow if offer hidden by company/admin", async () => {
            const res = await test_agent
                .post(`/offers/${hidden_user_test_offer._id}/disable`);
            expect(res.body).toHaveProperty("hiddenReason", OfferConstants.HiddenOfferReasons.admin);
            expect(res.body).toHaveProperty("isHidden", true);
        });
    });

    describe("POST /offers/:offerId/hide", () => {

        let test_offer_1, test_offer_2, hidden_default_test_offer, disabled_test_offer;
        beforeAll(async () => {
            test_offer_1 = await Offer.create({
                ...generateTestOffer(),
                owner: test_company._id.toString(),
                ownerName: test_company.name,
            });

            test_offer_2 = await Offer.create({
                ...generateTestOffer(),
                owner: test_company._id.toString(),
                ownerName: test_company.name,
            });


            hidden_default_test_offer = await Offer.create({
                ...generateTestOffer({ isHidden: true }),
                owner: test_company._id.toString(),
                ownerName: test_company.name,
            });

            disabled_test_offer = await Offer.create({
                ...generateTestOffer(),
                owner: test_company._id.toString(),
                ownerName: test_company.name,
            });

            await (new OfferService()).disable(disabled_test_offer._id, OfferConstants.HiddenOfferReasons.admin);
        });

        test("should fail if not logged in", async () => {
            await test_agent
                .del("/auth/login");

            const res = await test_agent
                .post(`/offers/${test_offer_1._id}/disable`)
                .expect(HTTPStatus.UNAUTHORIZED);
            expect(res.status).toBe(HTTPStatus.UNAUTHORIZED);
            expect(res.body).toHaveProperty("error_code", ErrorTypes.FORBIDDEN);
            expect(res.body).toHaveProperty("errors");
            expect(res.body.errors).toContainEqual(ValidationReasons.INSUFFICIENT_PERMISSIONS);
        });

        test("should succeed if admin", async () => {
            await test_agent
                .post("/auth/login")
                .send(test_user_admin)
                .expect(HTTPStatus.OK);

            const res = await test_agent
                .post(`/offers/${test_offer_1._id}/hide`)
                .expect(HTTPStatus.OK);
            expect(res.body).toHaveProperty("hiddenReason", OfferConstants.HiddenOfferReasons.company);
            expect(res.body).toHaveProperty("isHidden", true);
        });

        test("should succeed if company", async () => {
            await test_agent
                .post("/auth/login")
                .send(test_user_company)
                .expect(HTTPStatus.OK);

            const res = await test_agent
                .post(`/offers/${test_offer_2._id}/hide`)
                .expect(HTTPStatus.OK);
            expect(res.body).toHaveProperty("hiddenReason", OfferConstants.HiddenOfferReasons.company);
            expect(res.body).toHaveProperty("isHidden", true);
        });

        test("should fail if already hidden offer by default", async () => {
            const res = await test_agent
                .post(`/offers/${hidden_default_test_offer._id}/hide`)
                .expect(HTTPStatus.FORBIDDEN);
            expect(res.body).toHaveProperty("error_code", ErrorTypes.FORBIDDEN);
            expect(res.body).toHaveProperty("errors");
            expect(res.body.errors).toContainEqual(ValidationReasons.OFFER_HIDDEN);
        });

        test("should fail if already hidden offer by user", async () => {
            const res = await test_agent
                .post(`/offers/${test_offer_1._id}/hide`)
                .expect(HTTPStatus.FORBIDDEN);
            expect(res.body).toHaveProperty("error_code", ErrorTypes.FORBIDDEN);
            expect(res.body).toHaveProperty("errors");
            expect(res.body.errors).toContainEqual(ValidationReasons.OFFER_HIDDEN);
        });

        test("should fail if already disabled by admin", async () => {
            const res = await test_agent
                .post(`/offers/${disabled_test_offer._id}/hide`)
                .expect(HTTPStatus.FORBIDDEN);
            expect(res.body).toHaveProperty("error_code", ErrorTypes.FORBIDDEN);
            expect(res.body).toHaveProperty("errors");
            expect(res.body.errors).toContainEqual(ValidationReasons.OFFER_HIDDEN);
        });
    });

    describe("POST /offers/:offerId/enable", () => {

        let test_offer,
            hidden_user_test_offer,
            hidden_default_test_offer,
            disabled_test_offer;

        beforeAll(async () => {

            test_offer = await Offer.create({
                ...generateTestOffer(),
                owner: test_company._id.toString(),
                ownerName: test_company.name,
            });

            hidden_default_test_offer = await Offer.create({
                ...generateTestOffer({ isHidden: true }),
                owner: test_company._id.toString(),
                ownerName: test_company.name,
            });

            hidden_user_test_offer = await Offer.create({
                ...generateTestOffer({ isHidden: true }),
                owner: test_company._id.toString(),
                ownerName: test_company.name,
            });

            await (new OfferService()).disable(hidden_user_test_offer._id, OfferConstants.HiddenOfferReasons.company);

            disabled_test_offer = await Offer.create({
                ...generateTestOffer({
                    "publishDate": (new Date(Date.now() + (10 * DAY_TO_MS))).toISOString(),
                    "publishEndDate": (new Date(Date.now() + (20 * DAY_TO_MS))).toISOString()
                }),
                owner: test_company._id.toString(),
                ownerName: test_company.name,
            });

            await (new OfferService()).disable(disabled_test_offer._id, OfferConstants.HiddenOfferReasons.admin);
        });

        test("should fail if not logged in", async () => {
            await test_agent
                .del("/auth/login");

            const res = await test_agent
                .post(`/offers/${test_offer._id}/enable`)
                .expect(HTTPStatus.UNAUTHORIZED);
            expect(res.status).toBe(HTTPStatus.UNAUTHORIZED);
            expect(res.body).toHaveProperty("error_code", ErrorTypes.FORBIDDEN);
            expect(res.body).toHaveProperty("errors");
            expect(res.body.errors).toContainEqual(ValidationReasons.INSUFFICIENT_PERMISSIONS);
        });

        test("should succeed if admin and offer hidden by default", async () => {
            await test_agent
                .post("/auth/login")
                .send(test_user_admin)
                .expect(HTTPStatus.OK);

            const res = await test_agent
                .post(`/offers/${hidden_default_test_offer._id}/enable`)
                .expect(HTTPStatus.OK);
            expect(res.body).toHaveProperty("isHidden", false);
        });

        test("should succeed if company and hidden by user/admin", async () => {
            await test_agent
                .post("/auth/login")
                .send(test_user_company)
                .expect(HTTPStatus.OK);

            const res = await test_agent
                .post(`/offers/${hidden_user_test_offer._id}/enable`)
                .expect(HTTPStatus.OK);
            expect(res.body).toHaveProperty("isHidden", false);
        });

        test("should fail if already shown offer by default", async () => {
            const res = await test_agent
                .post(`/offers/${test_offer._id}/enable`)
                .expect(HTTPStatus.FORBIDDEN);
            expect(res.body).toHaveProperty("error_code", ErrorTypes.FORBIDDEN);
            expect(res.body).toHaveProperty("errors");
            expect(res.body.errors).toContainEqual(ValidationReasons.OFFER_VISIBLE);
        });

        test("should fail if offer disabled by admins", async () => {
            const res = await test_agent
                .post(`/offers/${disabled_test_offer._id}/enable`)
                .expect(HTTPStatus.FORBIDDEN);
            expect(res.body).toHaveProperty("error_code", ErrorTypes.FORBIDDEN);
            expect(res.body).toHaveProperty("errors");
            expect(res.body.errors).toContainEqual(ValidationReasons.OFFER_BLOCKED_ADMIN);
        });

        describe("testing concurrent offers", () => {
            const test_offers = Array(CompanyConstants.offers.max_concurrent)
                .fill(generateTestOffer());

            let test_offer;
            beforeAll(async () => {
                await Offer.deleteMany({});

                test_offers.forEach((offer) => {
                    offer.owner = test_company._id;
                    offer.ownerName = test_company.name;
                });

                test_offer = await Offer.create({
                    ...generateTestOffer({ isHidden: true }),
                    owner: test_company._id,
                    ownerName: test_company.name
                });

                await Offer.create(test_offers);
            });

            test("should fail if offer disabled by admins", async () => {
                const res = await test_agent
                    .post(`/offers/${test_offer._id}/enable`)
                    .expect(HTTPStatus.CONFLICT);
                expect(res.body).toHaveProperty("error_code", ErrorTypes.VALIDATION_ERROR);
                expect(res.body).toHaveProperty("errors");
                expect(res.body.errors)
                    .toContainEqual(ValidationReasons.MAX_CONCURRENT_OFFERS_EXCEEDED(CompanyConstants.offers.max_concurrent));
            });
        });

    });
});
