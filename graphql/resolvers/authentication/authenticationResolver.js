const createAccount = require("./createAccount");
const updateAccount = require("./updateAccount");
const refreshToken = require("./refreshToken");
const resendEmailVerification = require("./resendEmailVerification");
const userLogin = require("./userLogin");
const user = require("./user");
const verifyAccount = require("./verifyAccount");

module.exports = {
  createAccount,
  updateAccount,
  refreshToken,
  resendEmailVerification,
  user,
  userLogin,
  verifyAccount,
};
