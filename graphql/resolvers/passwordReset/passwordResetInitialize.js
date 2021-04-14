require("dotenv").config();
const { transporter } = require("../../../util/transporter");
const { createToken } = require("../authentication/util");
const { i18n } = require("../../../i18n.config");
const { emailTemplate } = require("../../../util/email-template");

module.exports = async function ({ passwordResetInitializeInput }) {
    const accountType = passwordResetInitializeInput.accountType;
    const tokenExpiry = Date.now() + 3600000; // 1 hour
    if (!accountType) {
        const error = new Error("No account type selected.");
        error.code = 401;
        throw error;
    }

    const user = await require(`../../../models/${accountType}`).findOne({
        email: passwordResetInitializeInput.email,
    });
    if (!user) {
        const error = new Error(
            `${accountType}NoAccount`
        );
        error.code = 401;
        throw error;
    }

    if (!user.password) {
        const error = new Error('noPasswordCreated');
        error.code = 401;
        throw error;
    }

    const token = createToken(accountType, user._id, user.email, process.env.SESSION_EXPIRATION_TIME);
    user.passwordResetToken = token;
    user.passwordResetTokenExpiration = tokenExpiry;
    await user.save();

    const language = user.language;
    i18n.setLocale(language);
    const buttonUrl = `${process.env.APP_URL}reset/${accountType}/${token}`;
    const buttonText = i18n.__("reset");
    transporter.sendMail({
        from: "boukacademy@learn.com",
        to: user.email,
        subject: i18n.__("passwordResetSubject"),
        html: emailTemplate(i18n.__("passwordReset"), null, null, buttonText, buttonUrl),
    });

    return { token: token };
}