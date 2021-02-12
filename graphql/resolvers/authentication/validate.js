const validator = require("validator");
const bcrypt = require("bcryptjs");
const moment = require("moment");

const validateCreateAccount = async (accountInput) => {
  const userType = accountInput.accountType
  const errors = [];
  // const namePattern = /^[a-zA-Z ]*$/;
  const namePatternAccents = /^[ a-zA-ZÀ-ÿ\u00f1\u00d1]*$/g;

  if (
    !/^[ a-zA-ZÀ-ÿ\u00f1\u00d1]*$/g.test(accountInput.firstName) ||
    validator.isEmpty(accountInput.firstName || "") ||
    !accountInput.firstName
  ) {
    errors.push({
      message:
        "First name is required and must contain only letters and spaces",
    });
  }

  if (
    !/^[ a-zA-ZÀ-ÿ\u00f1\u00d1]*$/g.test(accountInput.lastName) ||
    validator.isEmpty(accountInput.lastName || "") ||
    !accountInput.lastName
  ) {
    errors.push({
      message: "Last name is required and must contain only letters and spaces",
    });
  }

  if (
    validator.isEmpty(accountInput.dob || "") ||
    !moment(accountInput.dob).isValid() ||
    !accountInput.dob
  ) {
    errors.push({ message: "A valid date of birth is required" });
  }
  if (!(Date.now() - new Date(accountInput.dob).getTime() > 31449600000 * 3)) {
    errors.push({ message: "User must be atleast 3 years old" });
  }

  // const allowedGenders = ["male", "female", "other"];
  // if (
  //   validator.isEmpty(accountInput.sex || "") ||
  //   !allowedGenders.includes(accountInput.sex) ||
  //   !accountInput.sex
  // ) {
  //   errors.push({ message: "Gender must be male female or other" });
  // }

  const userFoundWithEmail = await require(`../../../models/${userType}`).findOne(
    { email: accountInput.email.trim() }
  );

  if (
    !validator.isEmail(accountInput.email.trim()) ||
    validator.isEmpty(accountInput.email.trim() || "") ||
    !accountInput.email
  ) {
    errors.push({
      message: "A valid e-mail is required",
    });
  }

  if (userFoundWithEmail) {
    //did email change?
    //is the logged in user equal to the user found with email?
    errors.push({
      message: "emailTaken",
    });
  }

  const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])(?=.{8,})/;
  if (!passwordPattern.test(accountInput.password)) {
    errors.push({
      message:
        "Password must contain atleast 8 characters and must contain atleast 1 of the followerin characters: 1 uppercase, 1 lowercase, 1 special character(!,@,#,$,%,^,&,*), and 1 numeric character",
    });
  }
  return errors;
};

const validateAccountUpdate = async (accountInput, req) => {
  const errors = [];

  const namePattern = /^[a-zA-Z ]*$/;

  if (
    !/^[ a-zA-ZÀ-ÿ\u00f1\u00d1]*$/g.test(accountInput.firstName) ||
    validator.isEmpty(accountInput.firstName || "") ||
    !accountInput.firstName
  ) {
    errors.push({
      message:
        "First name is required and must contain only letters and spaces",
    });
  }

  if (
    !/^[ a-zA-ZÀ-ÿ\u00f1\u00d1]*$/g.test(accountInput.lastName) ||
    validator.isEmpty(accountInput.lastName || "") ||
    !accountInput.lastName
  ) {
    errors.push({
      message: "Last name is required and must contain only letters and spaces",
    });
  }

  const userFoundWithEmail = await require(`../../../models/${accountInput.accountType}`).findOne(
    { email: accountInput.email }
  );
  const loggedInUser = await require(`../../../models/${accountInput.accountType}`).findById(
    req.userId
  );

  if (
    userFoundWithEmail &&
    // accountInput.email !== loggedInUser.email &&
    (userFoundWithEmail || {})._id.toString() !== loggedInUser._id.toString()
  ) {
    //did email change?
    //is the logged in user equal to the user found with email?
    errors.push({
      message: "emailTaken",
    });
  }

  if (
    !validator.isEmail(accountInput.email.trim()) ||
    validator.isEmpty(accountInput.email.trim() || "") ||
    !accountInput.email
  ) {
    errors.push({
      message: "A valid e-mail is required",
    });
  }

  if (accountInput.newPassword) {
    if (
      !accountInput.currentPassword ||
      validator.isEmpty(accountInput.currentPassword || "")
    ) {
      errors.push({
        message:
          "If you are trying to set a new password, you must provide the current password",
      });
    }
    const isEqual = await bcrypt.compare(
      accountInput.currentPassword || "",
      loggedInUser.password
    );
    if (!isEqual) {
      errors.push({
        message: "wrongPassword",
      });
    }
  }

  const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])(?=.{8,})/;
  if (
    !passwordPattern.test(accountInput.newPassword) &&
    accountInput.newPassword
  ) {
    errors.push({
      message:
        "Password must contain atleast 8 characters and must contain atleast 1 of the followerin characters: 1 uppercase, 1 lowercase, 1 special character(!,@,#,$,%,^,&,*), and 1 numeric character",
    });
  }

  if (
    validator.isEmpty(accountInput.dob || "") ||
    !moment(accountInput.dob).isValid() ||
    !accountInput.dob
  ) {
    errors.push({ message: "A valid date of birth is required" });
  }
  if (!(Date.now() - new Date(accountInput.dob).getTime() > 31449600000 * 3)) {
    errors.push({ message: "User must be atleast 3 years old" });
  }
  // const allowedGenders = ["male", "female", "other"];
  // if (
  //   validator.isEmpty(accountInput.sex || "") ||
  //   !allowedGenders.includes(accountInput.sex) ||
  //   !accountInput.sex
  // ) {
  //   errors.push({ message: "Gender must be male female or other" });
  // }
  const documentTypesAllowed = [
    "governmentId",
    "birthCertificate",
    "transcript",
    "legalStatusProof",
    "cv",
    "testScoresProof",
    "referenceLetter",
    "statementPurpose",
    "other",
  ];

  const allowedExtensions = ["jpeg", "jfif", "jpg", "docx", "doc", "pdf"];
  (accountInput.documents || []).forEach((d) => {
    if (!documentTypesAllowed.includes(d.documentType)) {
      errors.push({ message: "Must select a valid document type" });
    }
    const docExtension = (d.document || "").toString().split(".").pop();
    if (!allowedExtensions.includes(docExtension) || !d.document) {
      errors.push({ message: "Must provide a document in a valid format" });
    }
  });
  return errors;
};
// maxDate={new Date(Date.now() - 31449600000 * 3)}
exports.validateAccountUpdate = validateAccountUpdate;
exports.validateCreateAccount = validateCreateAccount;
