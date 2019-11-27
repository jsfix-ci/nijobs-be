const Account = require("../models/Account");

class AuthService {
    // TODO: Use typedi or similar
    constructor() {

    }

    async register(email, password) {
        const account = await Account.create({
            email,
            password,
        });

        return {
            email: account.email,
        };
    }
}

module.exports = AuthService;
