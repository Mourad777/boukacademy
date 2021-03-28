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
const { i18n } = require("../../../i18n.config");
const { emailTemplate } = require("../../../util/email-template");
const { pushNotify } = require("../../../util/pushNotification");
const { getDefaultAdminSettings, getDefaultInstructorSettings, getDefaultStudentSettings, createToken } = require("./util");
const bson = require('bson');
//SESSION_EXPIRATION_TIME is for the automatic logout of the session upon inactivity
//SESSION_REFRESH_TIME_LIMIT is for the automatic logout of the session regardless of inactivity
module.exports = {
  userLogin: async function ({ email, password, userType, notificationSubscription }, req) {
    //check if user has account userId
    console.log('check -1')
    console.log('req.isGoogleAuth',req.isGoogleAuth)
    const user = await require(`../../../models/${userType}`).findOne({
      email: email.toLowerCase().trim(),
    });

    if (!user && req.isGoogleAuth) {
      const { given_name, family_name, locale, } = req.googleUser
      //create account

      const foundAdmin = await Instructor.findOne({ admin: true }).populate(
        "configuration"
      );

      if (!foundAdmin && userType === "student") {
        const error = new Error("noAdminAccount");
        error.code = 403;
        throw error;
      }
      const shouldCreateAdmin =
        !foundAdmin && userType === "instructor";

      const admin = await Instructor.findOne({ admin: true }).populate(
        "configuration"
      );

      let adminSettings
      if (admin) {
        adminSettings = admin._doc.configuration;
      }

      const userId = new bson.ObjectId().toHexString();
      console.log('userId 1', userId)

      let configuration;
      if (shouldCreateAdmin) {
        configuration = new Configuration(getDefaultAdminSettings(userId));
      }
      if (!shouldCreateAdmin && userType === "instructor") {
        configuration = new Configuration(getDefaultInstructorSettings(userId));
      }
      if (userType === "student") {
        configuration = new Configuration(getDefaultStudentSettings(userId));
      }
      const createdConfig = await configuration.save();

      const User = require(`../../../models/${userType}`);
      const expirationTime = process.env.LONG_SESSION_REFRESH_TIME_LIMIT;
      const token = createToken(userType, userId, email, expirationTime);
      let isAccountApproved = false;
      if (shouldCreateAdmin) {
        isAccountApproved = true
      } else {
        if (userType === 'student' && !adminSettings.isApproveStudentAccounts) {
          isAccountApproved = true
        }
        if (userType === 'instructor' && !adminSettings.isApproveInstructorAccounts) {
          isAccountApproved = true
        }
      }

      const newUser = new User({
        _id: userId,
        email: xss(email.toLowerCase().trim(), noHtmlTags),
        firstName: xss(given_name.trim(), noHtmlTags),
        lastName: xss(family_name.trim(), noHtmlTags),
        language: xss(locale, noHtmlTags),
        // password: hashedPw,
        accountVerified: true,
        // dob: xss(accountInput.dob, noHtmlTags),
        // sex: xss(accountInput.sex, noHtmlTags),
        // profilePicture: xss(accountInput.profilePicture, noHtmlTags),
        admin: shouldCreateAdmin,
        configuration: createdConfig._id,
        isAccountApproved,
        isAccountSuspended: false,
        notificationSubscription: notificationSubscription,
      });

      const createdUser = await newUser.save();




      if (!shouldCreateAdmin) {

        console.log('creating reg instructor')

        i18n.setLocale(admin.language);
        //send e-mail notifying admin
        let emailCondition, pushCondition, notificationContent;
        if (userType === 'instructor') {
          pushCondition = 'isNewInstructorAccountPushNotifications'
          emailCondition = 'isNewInstructorAccountEmails'
          notificationContent = 'newInstructorAccount'
        }
        if (userType === 'student') {
          pushCondition = 'isNewStudentAccountPushNotifications'
          emailCondition = 'isNewStudentAccountEmails'
          notificationContent = 'newStudentAccount'
        }
        let secondaryContent;
        if (
          (userType === 'student' && adminSettings.isApproveStudentAccounts) ||
          userType === 'instructor' && adminSettings.isApproveInstructorAccounts
        ) {
          secondaryContent = i18n.__('pendingApproval')
        }

        // transporter.sendMail({
        //   from: "e-learn@learn.com",
        //   to: accountInput.email,
        //   subject: i18n.__("verifyAccountEmailSubject"),
        //   html: emailTemplate(subject, primaryText, null, buttonText, buttonUrl),
        // });
        console.log('check 1')
        const notificationOptions = {
          multipleUsers: false,
          userId: admin._id,
          isInstructorRecieving: true,
          student: userType === 'student' ? createdUser : "",
          instructor: userType === 'instructor' ? createdUser : "",
          url: `users/${userType}s/${createdUser._id}`,
          content: notificationContent,
          condition:pushCondition,
        }

        await pushNotify(notificationOptions);


        console.log('check 2')

        await sendEmailToOneUser({
          userId: foundAdmin._id,
          course: null,
          subject: notificationContent + 'Subject',
          content: notificationContent,
          secondaryContent,
          student: userType === 'student' ? user : null,
          instructor: userType === 'instructor' ? user : null,
          condition:emailCondition,
          userType: 'instructor',
          userTypeSender: userType,
          buttonText: 'userDetails',
          buttonUrl: `users/${userType}s/${createdUser._id}`,
        });

        console.log('check 3')

        const notification = new Notification({
          toUserType: "instructor",
          toSpecificUser: foundAdmin._id,
          fromUser: createdUser._id,
          content: [notificationContent],
          documentType: notificationContent,
        });

        await notification.save();;
        io.getIO().emit("newAccount", {
          userType: "admin",
        });

      }

      return {
        ...createdUser._doc,
        token: token,
        userId: createdUser._id.toString(),
        expiresIn: process.env.LONG_SESSION_REFRESH_TIME_LIMIT,
        language: createdUser.language,
        // firstName: user.firstName,
        // lastName: user.lastName,
        // testResults: user.testResults,
        // completedCourses: user.completedCourses,
        profilePicture: await getObjectUrl(createdUser.profilePicture),
        refreshTokenExpiration:
          Date.now() + parseInt(process.env.LONG_SESSION_REFRESH_TIME_LIMIT) * 1000,
        // lastLogin: user.lastLogin,
        // admin:user.admin,
      };
    }

    console.log('not creating account')





    if (!user) {
      const error = new Error(`${userType}NoAccount`);
      error.code = 401;
      throw error;
    }
    if (!user.accountVerified && !req.isGoogleAuth) {
      const error = new Error("notVerifiedCheckEmail");
      error.code = 401;
      throw error;
    }
    if (!user.accountVerified && req.isGoogleAuth) {
      user.accountVerified = true;
    }
    if (user.isAccountSuspended) {
      const error = new Error("accountSuspended");
      error.code = 403;
      throw error;
    }
    if (!req.isGoogleAuth) {
      if (!user.password) {
        const error = new Error("noPasswordCreated");
        error.code = 401;
        throw error;
      }
      const isEqual = await bcrypt.compare(password, user.password);
      if (!isEqual) {
        const error = new Error("wrongPassword");
        error.code = 401;
        throw error;
      }
    }

    user.lastLogin = new Date();
    user.notificationSubscription = notificationSubscription,
      await user.save();
    const config = await Configuration.findOne({
      user: user._id,
    });
    const expirationTime = config.isStayLoggedIn ? process.env.LONG_SESSION_REFRESH_TIME_LIMIT : process.env.SESSION_EXPIRATION_TIME
    const token = createToken(userType, user._id, email, expirationTime);
    console.log('process.env.LONG_SESSION_REFRESH_TIME_LIMIT', process.env.LONG_SESSION_REFRESH_TIME_LIMIT)
    console.log('process.env.SESSION_EXPIRATION_TIME', process.env.SESSION_EXPIRATION_TIME)
    console.log('config.isStayLoggedIn', config.isStayLoggedIn, Date.now() + parseInt(config.isStayLoggedIn ? process.env.LONG_SESSION_REFRESH_TIME_LIMIT : process.env.SESSION_REFRESH_TIME_LIMIT) * 1000)
    return {
      ...user._doc,
      token: token,
      userId: user._id.toString(),
      expiresIn: expirationTime,
      language: user.language,
      profilePicture: await getObjectUrl(user.profilePicture),
      refreshTokenExpiration:
        Date.now() + parseInt(config.isStayLoggedIn ? process.env.LONG_SESSION_REFRESH_TIME_LIMIT : process.env.SESSION_REFRESH_TIME_LIMIT) * 1000,
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
      isPassword: !!user.password
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
    const userId = xss(accountInput.id, noHtmlTags);
    const expirationTime = process.env.SESSION_EXPIRATION_TIME;
    const secret = process.env.VERIFICATION_SECRET;
    const token = createToken(accountInput.accountType, userId, accountInput.email, expirationTime, secret);

    const hashedPw = await bcrypt.hash(
      xss(accountInput.password, noHtmlTags),
      12
    );

    const User = require(`../../../models/${accountInput.accountType}`);
    const foundAdmin = await Instructor.findOne({ admin: true });
    if (!foundAdmin && accountInput.accountType === "student") {
      const error = new Error("noAdminAccount");
      error.code = 403;
      throw error;
    }
    const shouldCreateAdmin =
      !foundAdmin && accountInput.accountType === "instructor";
    const admin = await Instructor.findOne({ admin: true }).populate(
      "configuration"
    );
    let adminSettings
    if (admin) {
      adminSettings = admin._doc.configuration;
    }

    let configuration;
    if (shouldCreateAdmin) {
      configuration = new Configuration(getDefaultAdminSettings());
    }
    if (!shouldCreateAdmin && accountInput.accountType === "instructor") {
      configuration = new Configuration(getDefaultInstructorSettings(userId));
    }
    if (accountInput.accountType === "student") {
      configuration = new Configuration(getDefaultStudentSettings(userId));
    }
    const createdConfig = await configuration.save();
    let isAccountApproved = false;
    if (shouldCreateAdmin) {
      isAccountApproved = true
    } else {
      if (accountInput.accountType === 'student' && !adminSettings.isApproveStudentAccounts) {
        isAccountApproved = true
      }
      if (accountInput.accountType === 'instructor' && !adminSettings.isApproveInstructorAccounts) {
        isAccountApproved = true
      }
    }
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
      isAccountApproved,
      isAccountSuspended: false,
      notificationSubscription: accountInput.notificationSubscription,
    });
    i18n.setLocale(accountInput.language);
    console.log('accountInput.language', accountInput.language)
    //send e-mail to new user to verify account
    const primaryText = i18n.__("verifyAccountEmail")
    console.log('primaryText', primaryText)
    const buttonUrl = `${process.env.APP_URL}verify-account/${accountInput.accountType}/${token}`
    const buttonText = i18n.__("confirm");
    const subject = i18n.__("verifyAccountEmailSubject")
    console.log('subject', i18n.__("verifyAccountEmailSubject"))
    console.log('buttonText', buttonText)
    transporter.sendMail({
      from: "e-learn@learn.com",
      to: accountInput.email,
      subject: subject,
      html: emailTemplate(subject, primaryText, null, buttonText, buttonUrl),
    });


    if (!shouldCreateAdmin) {
      i18n.setLocale(admin.language);
      //send e-mail notifying admin
      let pushCondition,emailCondition, notificationContent;
      if (accountInput.accountType === 'instructor') {
        emailCondition = 'isNewInstructorAccountEmails'
        pushCondition = 'isNewInstructorAccountPushNotifications'
        notificationContent = 'newInstructorAccount'
      }
      if (accountInput.accountType === 'student') {
        emailCondition = 'isNewStudentAccountEmails'
        pushCondition = 'isNewStudentAccountPushNotifications'
        notificationContent = 'newStudentAccount'
      }
      let secondaryContent;
      if (
        (accountInput.accountType === 'student' && adminSettings.isApproveStudentAccounts) ||
        accountInput.accountType === 'instructor' && adminSettings.isApproveInstructorAccounts
      ) {
        secondaryContent = i18n.__('pendingApproval')
      }
      const createdUser = await user.save();

      // transporter.sendMail({
      //   from: "e-learn@learn.com",
      //   to: accountInput.email,
      //   subject: i18n.__("verifyAccountEmailSubject"),
      //   html: emailTemplate(subject, primaryText, null, buttonText, buttonUrl),
      // });

      const notificationOptions = {
        multipleUsers: false,
        userId: admin._id,
        isInstructorRecieving: true,
        student: accountInput.accountType === 'student' ? createdUser : "",
        instructor: accountInput.accountType === 'instructor' ? createdUser : "",
        url: `users/${accountInput.accountType}s/${createdUser._id}`,
        content: notificationContent,
        condition:pushCondition,
      }

      await pushNotify(notificationOptions);


      await sendEmailToOneUser({
        userId: foundAdmin._id,
        course: null,
        subject: notificationContent + 'Subject',
        content: notificationContent,
        secondaryContent,
        student: accountInput.accountType === 'student' ? user : null,
        instructor: accountInput.accountType === 'instructor' ? user : null,
        condition:emailCondition,
        userType: 'instructor',
        userTypeSender: accountInput.accountType,
        buttonText: 'userDetails',
        buttonUrl: `users/${accountInput.accountType}s/${createdUser._id}`,
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
    return { ...createdUser._doc, _id: createdUser._id.toString(), isPassword: !!createdUser.password };
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
    // io.getIO().emit("updateStudents", {
    //   userType: "all",
    // });
    return "Account updated successfully";
  },

  verifyAccount: async function ({ token, password }) {
    const decodedToken = jwt.verify(token, process.env.VERIFICATION_SECRET);
    console.log('decodedToken in account verify', decodedToken)
    let accountType;
    if (decodedToken.studentId) {
      accountType = 'student'
    }
    if (decodedToken.instructorId) {
      accountType = 'instructor'
    }
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

    const expirationTime = process.env.LONG_SESSION_REFRESH_TIME_LIMIT;
    const loginInToken = createToken(accountType, user._id, user.email, expirationTime);

    return {
      token: loginInToken,
      userId: user._id.toString(),
      expiresIn: process.env.LONG_SESSION_REFRESH_TIME_LIMIT,
      firstName: user.firstName,
      lastName: user.lastName,
      language: user.language,
      refreshTokenExpiration:
        Date.now() + parseInt(process.env.LONG_SESSION_REFRESH_TIME_LIMIT) * 1000,
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
      from: "e-learn@learn.com",
      to: email,
      subject: i18n.__("verifyAccountEmailSubject"),
      html: emailTemplate(primaryText, secondaryText, tertiaryText, buttonText, buttonUrl)
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
    const config = await Configuration.findOne({
      user: user._id,
    });
    const expirationTime = config.isStayLoggedIn ? process.env.LONG_SESSION_REFRESH_TIME_LIMIT : process.env.SESSION_EXPIRATION_TIME
    const token = createToken(userType, user._id, user.email, expirationTime);

    return {
      token: token,
      expiresIn: expirationTime,
    };
  },
};
