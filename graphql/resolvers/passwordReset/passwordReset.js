const bcrypt = require("bcryptjs");
require("dotenv").config();
const xss = require("xss");
const { transporter } = require("../../../util/transporter");
const { createToken } = require("../authentication/util");
const { noHtmlTags } = require("../validation/xssWhitelist");
const { i18n } = require("../../../i18n.config");
const { emailTemplate } = require("../../../util/email-template");

module.exports = {
  passwordResetInitialize: async function ({ passwordResetInitializeInput }) {
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
      from: "e-learn@learn.com",
      to: user.email,
      subject: i18n.__("passwordResetSubject"),
      html: emailTemplate(i18n.__("passwordReset"), null, null,buttonText , buttonUrl),
    });

    return { token: token };
  },

  passwordReset: async function ({
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
  },
};
