const HTTPStatus = require("http-status-codes");
const CompanyApplication  = require("../../src/models/CompanyApplication");
const Account  = require("../../src/models/Account");
const ValidatorTester = require("../utils/ValidatorTester");
const ValidationReasons = require("../../src/api/middleware/validators/validationReasons");

describe("Company application endpoint test", () => {
    describe("POST /application", () => {
        describe("Input Validation (unsuccessful application)", () => {
            const EndpointValidatorTester = ValidatorTester((params) => request().post("/application/company").send(params));
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
                FieldValidatorTester.hasMinLength(8);
                FieldValidatorTester.hasNumber();
            });

            describe("motivation", () => {
                const FieldValidatorTester = BodyValidatorTester("motivation");
                FieldValidatorTester.isRequired();
                FieldValidatorTester.mustBeString();
                FieldValidatorTester.hasMinLength(10);
                FieldValidatorTester.hasMaxLength(1500);
            });

            describe("companyName", () => {
                const FieldValidatorTester = BodyValidatorTester("companyName");
                FieldValidatorTester.isRequired();
                FieldValidatorTester.mustBeString();
                FieldValidatorTester.hasMinLength(3);
                FieldValidatorTester.hasMaxLength(20);
            });
        });

        describe("Without any existing application and accounts", () => {
            beforeAll(async () => {
                await CompanyApplication.deleteMany({});
                await Account.deleteMany({});
            });

            test("Valid creation", async () => {
                const application = {
                    email: "test@test.com",
                    password: "password123",
                    companyName: "Testing company",
                    motivation: "This comapny has a very valid motivation, because otherwise the tests would not exist.",
                };
                const res = await request()
                    .post("/application/company")
                    .send(application);

                expect(res.status).toBe(HTTPStatus.OK);
                const created_application_id = res.body._id;

                const created_application = await CompanyApplication.findById(created_application_id);

                expect(created_application).toBeDefined();
                expect(created_application).toHaveProperty("email", application.email);
                expect(created_application).toHaveProperty("companyName", application.companyName);
                expect(created_application).toHaveProperty("motivation", application.motivation);
            });

            describe("Invalid input", () => {
                test("Should fail while using an email with an associated Account", async () => {
                    const application = {
                        email: "test2@test.com",
                        password: "password123",
                        companyName: "Testing company",
                        motivation: "This comapny has a very valid motivation, because otherwise the tests would not exist.",
                        submittedAt: Date.now(),
                    };

                    await Account.create({
                        email: application.email,
                        password: application.password,
                        isAdmin: true,
                    });
                    const res = await request()
                        .post("/application/company")
                        .send(application);

                    expect(res.status).toBe(HTTPStatus.UNPROCESSABLE_ENTITY);
                    expect(res.body.errors).toContainEqual({
                        "location": "body",
                        "msg": ValidationReasons.ALREADY_EXISTS("email"),
                        "param": "email",
                        "value": application.email,
                    });
                });
            });
        });
    });
});
