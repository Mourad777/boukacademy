const bcrypt = require("bcryptjs");
const { validateAccountUpdate } = require("./validate");
require("dotenv").config();
const xss = require("xss");
const { noHtmlTags } = require("../validation/xssWhitelist");

module.exports = async function ({ accountInput }, req) {
    const user = await require(`../../../models/${accountInput.accountType}`).findById(
        req.userId
    );
    if (!user) {
        const error = new Error("No account found with the provided token");
        error.code = 401;
        throw error;
    }
    const errors = await validateAccountUpdate(accountInput, req);
    if (errors.length > 0) {
        const error = new Error("Invalid input.");
        error.data = errors;
        error.code = 422;
        throw error;
    }

    user.firstName = xss(accountInput.firstName, noHtmlTags);
    user.lastName = xss(accountInput.lastName, noHtmlTags);
    // user.email = xss(accountInput.email.toLowerCase().trim(), noHtmlTags);
    user.dob = xss(accountInput.dob, noHtmlTags);
    user.language = xss(accountInput.language, noHtmlTags);
    user.profilePicture = xss(accountInput.profilePicture, noHtmlTags);
    user.documents = accountInput.documents;
    if (accountInput.newPassword) {
        const hashedPw = await bcrypt.hash(
            xss(accountInput.newPassword, noHtmlTags),
            12
        );
        user.password = hashedPw;
    }
    await user.save();
    return "Account updated successfully";
}