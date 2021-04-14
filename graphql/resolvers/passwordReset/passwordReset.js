const bcrypt = require("bcryptjs");
require("dotenv").config();
const xss = require("xss");
const { noHtmlTags } = require("../validation/xssWhitelist");

module.exports = async function ({
    passwordResetInput: { accountType, password, confirmPassword, token },
}) {
    if (password !== confirmPassword) {
        throw new Error(`Your passwords don't match`);
    }
    const user = await require(`../../../models/${accountType}`).findOne({
        passwordResetToken: token,
        passwordResetTokenExpiration: { $gt: Date.now() },
    });

    if (!user) {
        const error = new Error("Could not retrieve the account, the token may have expired");
        error.code = 403;
        throw error;
    }

    const hashedPw = await bcrypt.hash(xss(password, noHtmlTags), 12);
    user.password = hashedPw;
    user.passwordResetToken = null;
    user.passwordResetTokenExpiration = null;
    await user.save();
    return "Your password has been updated successfully";
}