const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const xss = require("xss");
const { transporter } = require("../../../util/transporter");
const { noHtmlTags } = require("../validation/xssWhitelist");


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
    const token = jwt.sign(
      {
        [accountType + "Id"]: user._id.toString(),
        email: user.email,
      },
      process.env.SECRET,
      { expiresIn: "1h" }
    );
    user.passwordResetToken = token;
    user.passwordResetTokenExpiration = tokenExpiry;
    await user.save();

    transporter.sendMail({
      from: "e-learn@learn.com",
      to: passwordResetInitializeInput.email,
      subject: "Password reset",
      html: `
          <p>You requested a password reset</p>
          <p>Click this <a href="${process.env.APP_URL}reset/${accountType}/${token}">link</a> to set a new password.</p>
      `,
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
