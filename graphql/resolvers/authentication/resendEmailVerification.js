require("dotenv").config();
const { transporter } = require("../../../util/transporter");
const { i18n } = require("../../../i18n.config");
const { emailTemplate } = require("../../../util/email-template");
const { createToken } = require("./util");

module.exports = async function ({ email, accountType }) {
  if (
    accountType !== "student" &&
    accountType !== "instructor"
  ) {
    const error = new Error("You need to provide a valid account type");
    error.code = 401;
    throw error;
  }
  const User = require(`../../../models/${accountType}`);
  const user = await User.findOne({ email: email.trim() });

  if (!user) {
    const error = new Error("noAccountWithEmail");
    error.code = 403;
    throw error;
  }

  if (user.accountVerified) {
    const error = new Error("alreadyVerified");
    error.code = 403;
    throw error;
  }

  const expirationTime = process.env.SESSION_EXPIRATION_TIME;
  const secret = process.env.VERIFICATION_SECRET;
  const token = createToken(accountType, user._id, email, expirationTime, secret);

  user.accountVerificationToken = token;
  (user.accountVerificationTokenExpiration = Date.now() + 3600000 * 24 * 7), // 1 week,
    await user.save();
  i18n.setLocale(user.language);
  const primaryText = i18n.__("verifyAccountEmail")
  const secondaryText = ""
  const tertiaryText = ""
  const buttonUrl = `${process.env.APP_URL}verify-account/${accountType}/${token}`
  const buttonText = i18n.__("confirm")
  transporter.sendMail({
    from: "boukacademy@learn.com",
    to: email,
    subject: i18n.__("verifyAccountEmailSubject"),
    html: emailTemplate(primaryText, secondaryText, tertiaryText, buttonText, buttonUrl)
  });

  return "E-mail sent";
}