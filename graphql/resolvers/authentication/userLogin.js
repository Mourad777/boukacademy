const bcrypt = require("bcryptjs");
const { getObjectUrl } = require("../../../s3");
require("dotenv").config();
const xss = require("xss");
const { noHtmlTags } = require("../validation/xssWhitelist");
const Configuration = require("../../../models/configuration");
const Notification = require("../../../models/notification");
const Instructor = require("../../../models/instructor");
const { sendEmailToOneUser } = require("../../../util/email-user");
const io = require("../../../socket");
const { i18n } = require("../../../i18n.config");
const { pushNotify } = require("../../../util/pushNotification");
const { getDefaultAdminSettings, getDefaultInstructorSettings, getDefaultStudentSettings, createToken } = require("./util");
const bson = require('bson');

module.exports = async function ({ email, password, userType, notificationSubscription }, req) {
    //check if user has account userId
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
            //   from: "boukacademy@learn.com",
            //   to: accountInput.email,
            //   subject: i18n.__("verifyAccountEmailSubject"),
            //   html: emailTemplate(subject, primaryText, null, buttonText, buttonUrl),
            // });

            const notificationOptions = {
                multipleUsers: false,
                userId: admin._id,
                isInstructorRecieving: true,
                student: userType === 'student' ? createdUser : "",
                instructor: userType === 'instructor' ? createdUser : "",
                url: `users/${userType}s/${createdUser._id}`,
                content: notificationContent,
                condition: pushCondition,
            }

            await pushNotify(notificationOptions);

            await sendEmailToOneUser({
                userId: foundAdmin._id,
                course: null,
                subject: notificationContent + 'Subject',
                content: notificationContent,
                secondaryContent,
                student: userType === 'student' ? user : null,
                instructor: userType === 'instructor' ? user : null,
                condition: emailCondition,
                userType: 'instructor',
                userTypeSender: userType,
                buttonText: 'userDetails',
                buttonUrl: `users/${userType}s/${createdUser._id}`,
            });

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
}