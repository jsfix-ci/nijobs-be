const EmailService = require("../../src/lib/nodemailer");
const HTTPStatus = require("http-status-codes");
const CompanyApplication = require("../../src/models/CompanyApplication");
const { CompanyApplicationRules }  = require("../../src/models/CompanyApplication");
const Account  = require("../../src/models/Account");
const ValidatorTester = require("../utils/ValidatorTester");
const ValidationReasons = require("../../src/api/middleware/validators/validationReasons");
const CompanyApplicationConstants = require("../../src/models/constants/CompanyApplication");
const AccountConstants = require("../../src/models/constants/Account");
const CompanyConstants = require("../../src/models/constants/Company");
const { NEW_COMPANY_APPLICATION_ADMINS, NEW_COMPANY_APPLICATION_COMPANY } = require("../../src/services/emails/companyApplicationApproval");
const config = require("../../src/config/env");


describe("Company application endpoint test", () => {
    describe("POST /application", () => {
        describe("Input Validation (unsuccessful application)", () => {
            const EndpointValidatorTester = ValidatorTester((params) => request().post("/apply/company").send(params));
            const BodyValidatorTester = EndpointValidatorTester("body");
            describe("email", () => {
                const FieldValidatorTester = BodyValidatorTester("email");
                FieldValidatorTester.isRequired();
                FieldValidatorTester.mustBeEmail();
            });

            describe("password", () => {
                const FieldValidatorTester = BodyValidatorTester("password");
                FieldValidatorTester.isRequired();
                FieldValidatorTester.mustBeString();
                FieldValidatorTester.hasMinLength(AccountConstants.password.min_length);
                FieldValidatorTester.hasNumber();
            });

            describe("motivation", () => {
                const FieldValidatorTester = BodyValidatorTester("motivation");
                FieldValidatorTester.isRequired();
                FieldValidatorTester.mustBeString();
                FieldValidatorTester.hasMinLength(CompanyApplicationConstants.motivation.min_length);
                FieldValidatorTester.hasMaxLength(CompanyApplicationConstants.motivation.max_length);
            });

            describe("companyName", () => {
                const FieldValidatorTester = BodyValidatorTester("companyName");
                FieldValidatorTester.isRequired();
                FieldValidatorTester.mustBeString();
                FieldValidatorTester.hasMinLength(CompanyConstants.companyName.min_length);
                FieldValidatorTester.hasMaxLength(CompanyConstants.companyName.max_length);
            });
        });

        describe("Without any existing application and accounts", () => {
            beforeAll(async () => {
                await CompanyApplication.deleteMany({});
                await Account.deleteMany({});
            });

            const RealDateNow = Date.now;
            const mockCurrentDate = new Date("2019-11-23");

            beforeEach(() => {
                Date.now = () => mockCurrentDate.getTime();
            });

            afterEach(() => {
                Date.now = RealDateNow;
            });

            test("Valid creation", async () => {
                const application = {
                    email: "test@test.com",
                    password: "password123",
                    companyName: "Testing company",
                    motivation: "This company has a very valid motivation because otherwise, the tests would not exist.",
                };
                const res = await request()
                    .post("/apply/company")
                    .send(application);

                expect(res.status).toBe(HTTPStatus.OK);
                const created_application_id = res.body._id;

                const created_application = await CompanyApplication.findById(created_application_id);

                expect(created_application).toBeDefined();
                expect(created_application).toHaveProperty("email", application.email);
                expect(created_application).toHaveProperty("companyName", application.companyName);
                expect(created_application).toHaveProperty("motivation", application.motivation);
                expect(created_application).toHaveProperty("submittedAt", mockCurrentDate);
            });

            test("Should send an email to admin and to company user", async () => {
                const application = {
                    email: "test2@test.com",
                    password: "password123",
                    companyName: "Testing company",
                    motivation: "This company has a very valid motivation because otherwise, the tests would not exist.",
                };
                const res = await request()
                    .post("/apply/company")
                    .send(application);

                expect(res.status).toBe(HTTPStatus.OK);

                const adminEmailOptions = NEW_COMPANY_APPLICATION_ADMINS(
                    application.email, application.companyName, application.motivation);
                const companyEmailOptions = NEW_COMPANY_APPLICATION_COMPANY(
                    application.companyName, res.body._id);

                expect(EmailService.sendMail).toHaveBeenNthCalledWith(1, {
                    subject: adminEmailOptions.subject,
                    text: adminEmailOptions.text,
                    html: adminEmailOptions.html,
                    to: config.mail_address
                });

                expect(EmailService.sendMail).toHaveBeenNthCalledWith(2, {
                    subject: companyEmailOptions.subject,
                    text: companyEmailOptions.text,
                    html: companyEmailOptions.html,
                    to: application.email
                });
            });

            describe("Invalid input", () => {
                test("Should fail while using an email with an associated Account", async () => {
                    const application = {
                        email: "test2@test.com",
                        password: "password123",
                        companyName: "Testing company",
                        motivation: "This company has a very valid motivation, because otherwise the tests would not exist.",
                    };

                    await Account.create({
                        email: application.email,
                        password: application.password,
                        isAdmin: true,
                    });
                    const res = await request()
                        .post("/apply/company")
                        .send(application);

                    expect(res.status).toBe(HTTPStatus.UNPROCESSABLE_ENTITY);
                    expect(res.body.errors).toContainEqual({
                        "location": "body",
                        "msg": ValidationReasons.ALREADY_EXISTS("email"),
                        "param": "email",
                        "value": application.email,
                    });
                });

                test("Should fail while using an email with an associated application that was not rejected", async () => {

                    const application = {
                        email: "test2@test.com",
                        password: "password123",
                        companyName: "Testing company",
                        motivation: "This company has a very valid motivation, because otherwise the tests would not exist.",
                    };

                    await CompanyApplication.deleteMany({});
                    // Guarantees that the company application will succeed regarding account rules
                    await Account.deleteOne({ email: application.email });


                    // Existing Application - Deafult `Pending` state
                    await CompanyApplication.create({
                        ...application,
                        submittedAt: Date.now(),
                    });

                    const res = await request()
                        .post("/apply/company")
                        .send(application);

                    expect(res.status).toBe(HTTPStatus.UNPROCESSABLE_ENTITY);
                    expect(res.body.errors).toContainEqual({
                        "location": "body",
                        "msg": CompanyApplicationRules.ONLY_ONE_APPLICATION_ACTIVE_PER_EMAIL.msg,
                        "param": "email",
                        "value": application.email,
                    });
                });
            });
        });
    });
});
