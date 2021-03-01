const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { getObjectUrl } = require("../../../s3");
const { validateAccountUpdate, validateCreateAccount } = require("./validate");
require("dotenv").config();
const xss = require("xss");
const { noHtmlTags } = require("../validation/xssWhitelist");
const { transporter } = require("../../../util/transporter");
const Configuration = require("../../../models/configuration");
const Notification = require("../../../models/notification");
const Instructor = require("../../../models/instructor");
const { sendEmailToOneUser } = require("../../../util/email-user");
const io = require("../../../socket");

module.exports = {
  userLogin: async function ({ email, password, userType }) {
    const user = await require(`../../../models/${userType}`).findOne({
      email: email.toLowerCase().trim(),
    });
    if (!user) {
      const error = new Error(`${userType}NoAccount`);
      error.code = 401;
      throw error;
    }
    if (!user.accountVerified) {
      const error = new Error("notVerifiedCheckEmail");
      error.code = 401;
      throw error;
    }
    if (user.isAccountSuspended) {
      const error = new Error("accountSuspended");
      error.code = 403;
      throw error;
    }
    const isEqual = await bcrypt.compare(password, user.password);
    if (!isEqual) {
      const error = new Error("wrongPassword");
      error.code = 401;
      throw error;
    }
    const token = jwt.sign(
      {
        [userType + "Id"]: user._id.toString(),
        email: user.email.trim(),
      },
      process.env.SECRET,
      { expiresIn: `${process.env.SESSION_EXPIRATION_TIME}s` }
    );
    user.lastLogin = new Date();
    await user.save();
    return {
      ...user._doc,
      token: token,
      userId: user._id.toString(),
      expiresIn: process.env.SESSION_EXPIRATION_TIME,
      language: user.language,
      // firstName: user.firstName,
      // lastName: user.lastName,
      // testResults: user.testResults,
      // completedCourses: user.completedCourses,
      profilePicture: await getObjectUrl(user.profilePicture),
      refreshTokenExpiration:
        Date.now() + parseInt(process.env.SESSION_REFRESH_TIME_LIMIT) * 1000,
      // lastLogin: user.lastLogin,
      // admin:user.admin,
    };
  },

  user: async function ({ }, req) {
    let userType;
    if (req.instructorIsAuth) userType = "instructor";
    if (req.studentIsAuth) userType = "student";
    const user = await require(`../../../models/${userType}`).findById(
      req.userId
    );
    if (!user) {
      const error = new Error("No account found with the provided token");
      error.code = 401;
      throw error;
    }
    const documents = await Promise.all(
      (user.documents || []).map(async (d) => {
        return {
          documentType: d.documentType,
          document: await getObjectUrl(d.document),
        };
      })
    );

    return {
      ...user._doc,
      _id: user._id.toString(),
      profilePicture: await getObjectUrl(user.profilePicture),
      documents,
    };
  },

  createAccount: async function ({ accountInput }, req) {
    const errors = await validateCreateAccount(accountInput);
    if (errors.length > 0) {
      const error = new Error("Invalid input.");
      error.data = errors;
      error.code = 422;
      throw error;
    }
    const token = jwt.sign(
      {
        [accountInput.accountType + "Id"]: accountInput.id.toString(),
        email: accountInput.email,
        accountType: accountInput.accountType,
      },
      process.env.VERIFICATION_SECRET,
      { expiresIn: "168h" } //1 week
    );

    const hashedPw = await bcrypt.hash(
      xss(accountInput.password, noHtmlTags),
      12
    );

    const User = require(`../../../models/${accountInput.accountType}`);
    const foundAdmin = await Instructor.findOne({ admin: true });
    const shouldCreateAdmin =
      !foundAdmin && accountInput.accountType === "instructor";
    console.log('e');
    const admin = await Instructor.findOne({ admin: true }).populate(
      "configuration"
    );
    let adminSettings
    if (admin) {
      adminSettings = admin._doc.configuration;
    }

    const userId = xss(accountInput.id, noHtmlTags);

    let configuration;
    if (shouldCreateAdmin) {
      configuration = new Configuration({
        user: userId,
        isChatNotifications: true,
        isHideActiveStatus: false,
        dropCourseGrade: 30,
        isDropCoursePenalty: true,
        coursePassGrade: 50,
        isEnrollAllowedAfterDropCourse: true,
        isInstructorCoursesLimit: true,
        instructorCoursesLimit: 10,
        isApproveInstructorAccounts: true,
        isApproveStudentAccounts: true,
        isContentBlockedCourseEnd: true,
        studentFileSizeLimit: 25, //MB
        instructorFileSizeLimit: 100, //MB
        isPasswordRequiredStartTest: true,
        voiceRecordTimeLimit: 60, //seconds
        blockedInstructors: [],
        blockedStudents: [],
        isChatAllowedOutsideOfficehours: false,

        isSendTestNotifications: true,
        isSendTestEmails: true,
        isSendLessonNotifications: true,
        isSendLessonEmails: true,
        isSendAssignmentNotifications: true,
        isSendAssignmentEmails: true,
        isSendCourseNotifications: true,
        isSendCourseEmails: true,

        isEnrollEmails: true,
        isEnrollNotifications: true,
        isDropCourseEmails: true,
        isDropCourseNotifications: true,
        isNewInstructorAccountEmails: true,
        isNewInstructorAccountNotifications: true,
        isAllowDeleteStudentAccount: true,
        isAllowDeleteInstructorAccount: true,
      });
    }

    if (!shouldCreateAdmin && accountInput.accountType === "instructor") {
      configuration = new Configuration({
        user: userId,
        isChatAllowedOutsideOfficehours: false,
        isChatNotifications: true,
        isHideActiveStatus: false,
        isSendTestNotifications: true,
        isSendTestEmails: true,
        isSendLessonNotifications: true,
        isSendLessonEmails: true,
        isSendAssignmentNotifications: true,
        isSendAssignmentEmails: true,
        isSendCourseNotifications: true,
        isSendCourseEmails: true,

        isEnrollEmails: true,
        isEnrollNotifications: true,
        isDropCourseEmails: true,
        isDropCourseNotifications: true,
      });
    }

    if (accountInput.accountType === "student") {
      configuration = new Configuration({
        user: userId,
        blockedStudentsChat: [],
        isTestNotifications: true,
        isTestEmails: true,
        isLessonNotifications: true,
        isLessonEmails: true,
        isAssignmentNotifications: true,
        isAssignmentEmails: true,
        isCourseNotifications: true,
        isCourseEmails: true,
        isChatNotifications: true,
        isHideActiveStatus: false,
      });
    }
    const createdConfig = await configuration.save();

    const user = new User({
      _id: userId,
      email: xss(accountInput.email.toLowerCase().trim(), noHtmlTags),
      firstName: xss(accountInput.firstName.trim(), noHtmlTags),
      lastName: xss(accountInput.lastName.trim(), noHtmlTags),
      language: xss(accountInput.language, noHtmlTags),
      password: hashedPw,
      accountVerified: false,
      dob: xss(accountInput.dob, noHtmlTags),
      sex: xss(accountInput.sex, noHtmlTags),
      profilePicture: xss(accountInput.profilePicture, noHtmlTags),
      accountVerificationToken: token,
      accountVerificationTokenExpiration: Date.now() + 3600000 * 24 * 7, // 1 week,
      admin: shouldCreateAdmin,
      configuration: createdConfig._id,
      isAccountApproved: shouldCreateAdmin || !adminSettings.isApproveInstructorAccounts ? true : false,
      isAccountSuspended: false,
    });
    //send e-mail to new user to verify account
    const primaryText = i18n.__("verifyAccountEmail")
    const secondaryText = "";
    const tertiaryText = ""
    const buttonUrl = `${process.env.APP_URL}verify-account/${accountType}/${token}`
    const buttonText = i18n.__("buttons.confirm")
    transporter.sendMail({
      from: "e-learn@learn.com",
      to: accountInput.email,
      subject: i18n.__("verifyAccountEmailSubject"),
      html: emailTemplate(primaryText, secondaryText,tertiaryText, buttonText, buttonUrl),
    });

    if (!shouldCreateAdmin) {
      //send e-mail notifying admin
      let condition, notificationContent;
      if (accountInput.accountType === 'instructor') {
        condition = 'isNewInstructorAccountEmails'
        notificationContent = 'newInstructorAccount'
      }
      if (accountInput.accountType === 'student') {
        condition = 'isNewStudentAccountEmails'
        notificationContent = 'newStudentAccount'
      }
      let secondaryContent;
      if (
        (accountInput.accountType === 'student' && adminSettings.isApproveStudentAccounts) ||
        accountInput.accountType === 'instructor' && adminSettings.isApproveInstructorAccounts
      ) {
        secondaryContent = 'pendingApproval'
      }
      const createdUser = await user.save();

      transporter.sendMail({
        from: "e-learn@learn.com",
        to: accountInput.email,
        subject: i18n.__("verifyAccountEmailSubject"),
        html: emailTemplate(primaryText, secondaryText,tertiaryText, buttonText, buttonUrl),
      });

      await sendEmailToOneUser({
        userId: foundAdmin._id,
        course: null,
        subject: notificationContent + 'Subject',
        content: notificationContent,
        secondaryContent,
        student: accountInput.accountType === 'student' ? user : null,
        instructor: accountInput.accountType === 'instructor' ? user : null,
        condition,
        userType: 'instructor',
        userTypeSender: accountInput.accountType,
      });
      const notification = new Notification({
        toUserType: "instructor",
        toSpecificUser: foundAdmin._id,
        fromUser: createdUser._id,
        // content: secondaryContent ?  [notificationContent,secondaryContent] : [notificationContent],
        content: [notificationContent],
        documentType: notificationContent,
        // documentId: courseId,
        // course: courseId,
      });

      await notification.save();;
      io.getIO().emit("newAccount", {
        userType: "admin",
      });

      return { ...createdUser._doc, _id: createdUser._id.toString() };
    }
    const createdUser = await user.save();
    return { ...createdUser._doc, _id: createdUser._id.toString() };
  },

  updateAccount: async function ({ accountInput }, req) {
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
    user.email = xss(accountInput.email.toLowerCase().trim(), noHtmlTags);
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
    // io.getIO().emit("updateStudents", {
    //   userType: "all",
    // });
    return "Account updated successfully";
  },

  verifyAccount: async function ({ token, password }) {
    const decodedToken = jwt.verify(token, process.env.VERIFICATION_SECRET);
    const accountType = decodedToken.accountType;
    const userFromId = await require(`../../../models/${accountType}`).findById(
      decodedToken[accountType + "Id"]
    );
    if (userFromId.accountVerified) {
      const error = new Error("alreadyVerified");
      error.code = 403;
      throw error;
    }

    const user = await require(`../../../models/${accountType}`).findOne({
      accountVerificationToken: token,
      accountVerificationTokenExpiration: { $gt: Date.now() },
    });

    if (!user) {
      const error = new Error(
        "Could not retrieve the account, the token may have expired"
      );
      error.code = 403;
      throw error;
    }

    const isEqual = await bcrypt.compare(password || "", user.password);
    if (!isEqual) {
      const error = new Error("wrongPassword");
      error.code = 403;
      throw error;
    }

    user.accountVerificationToken = null;
    user.accountVerificationTokenExpiration = null;
    user.accountVerified = true;
    user.lastLogin = new Date();
    await user.save();
    const loginInToken = jwt.sign(
      {
        [accountType + "Id"]: user._id.toString(),
        email: user.email,
      },
      process.env.SECRET,
      { expiresIn: `${process.env.SESSION_EXPIRATION_TIME}s` }
    );
    return {
      token: loginInToken,
      userId: user._id.toString(),
      expiresIn: process.env.SESSION_EXPIRATION_TIME,
      firstName: user.firstName,
      lastName: user.lastName,
      language: user.language,
      refreshTokenExpiration:
        Date.now() + parseInt(process.env.SESSION_REFRESH_TIME_LIMIT) * 1000,
      lastLogin: user.lastLogin,
    };
  },

  resendVerificationEmail: async function ({ email, accountType }) {
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

    if (user.accountVerified) {
      const error = new Error("alreadyVerified");
      error.code = 403;
      throw error;
    }
    const token = jwt.sign(
      {
        [accountType + "Id"]: user._id.toString(),
        email,
        accountType,
      },
      process.env.VERIFICATION_SECRET,
      { expiresIn: "168h" } //1 week
    );

    user.accountVerificationToken = token;
    (user.accountVerificationTokenExpiration = Date.now() + 3600000 * 24 * 7), // 1 week,
      await user.save();
    const primaryText = i18n.__("verifyAccountEmail")
    const secondaryText = ""
    const tertiaryText = ""
    const buttonUrl = `${process.env.APP_URL}verify-account/${accountType}/${token}`
    const buttonText = i18n.__("buttons.confirm")
    transporter.sendMail({
      from: "e-learn@learn.com",
      to: email,
      subject: i18n.__("verifyAccountEmailSubject"),
      html: emailTemplate(primaryText, secondaryText,tertiaryText, buttonText, buttonUrl)
    });

    return "E-mail sent";
  },

  refreshToken: async function ({ }, req) {
    let userType;
    if (req.instructorIsAuth) userType = "instructor";
    if (req.studentIsAuth) userType = "student";

    if (!userType) {
      const error = new Error("Session expired must login again");
      error.code = 401;
      throw error;
    }

    const user = await require(`../../../models/${userType}`).findById(
      req.userId
    );
    if (!user) {
      const error = new Error("No user found");
      error.code = 401;
      throw error;
    }

    //check user last login and compare it to the time limit for refresh tokens
    const refreshTokenLimit = process.env.SESSION_REFRESH_TIME_LIMIT * 1000;
    const lastTimeUserLoggedin = new Date(user.lastLogin).getTime();

    if (Date.now() > lastTimeUserLoggedin + refreshTokenLimit) {
      return {
        token: "expired",
        expiresIn: "same",
      };
    }

    const token = jwt.sign(
      {
        [userType + "Id"]: user._id.toString(),
        email: user.email,
      },
      process.env.SECRET,
      { expiresIn: `${process.env.SESSION_EXPIRATION_TIME}s` }
    );
    return {
      token: token,
      expiresIn: process.env.SESSION_EXPIRATION_TIME,
    };
  },
};
