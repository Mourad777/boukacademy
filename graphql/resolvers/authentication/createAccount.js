const bcrypt = require("bcryptjs");
const { validateCreateAccount } = require("./validate");
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

module.exports = async function ({ accountInput }, req) {
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

    //if an instructor is opening an account, check to see if
    //there is already an instructor with admin privelages, if there
    //isn't than the instructor will also be an admin
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
    //send e-mail to new user to verify account
    const primaryText = i18n.__("verifyAccountEmail")
    const buttonUrl = `${process.env.APP_URL}verify-account/${accountInput.accountType}/${token}`
    const buttonText = i18n.__("confirm");
    const subject = i18n.__("verifyAccountEmailSubject")
    transporter.sendMail({
        from: "boukacademy@learn.com",
        to: accountInput.email,
        subject: subject,
        html: emailTemplate(subject, primaryText, null, buttonText, buttonUrl),
    });


    if (!shouldCreateAdmin) {
        i18n.setLocale(admin.language);
        //send e-mail notifying admin
        let pushCondition, emailCondition, notificationContent;
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

        const notificationOptions = {
            multipleUsers: false,
            userId: admin._id,
            isInstructorRecieving: true,
            student: accountInput.accountType === 'student' ? createdUser : "",
            instructor: accountInput.accountType === 'instructor' ? createdUser : "",
            url: `users/${accountInput.accountType}s/${createdUser._id}`,
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
            student: accountInput.accountType === 'student' ? user : null,
            instructor: accountInput.accountType === 'instructor' ? user : null,
            condition: emailCondition,
            userType: 'instructor',
            userTypeSender: accountInput.accountType,
            buttonText: 'userDetails',
            buttonUrl: `users/${accountInput.accountType}s/${createdUser._id}`,
        });

        const notification = new Notification({
            toUserType: "instructor",
            toSpecificUser: foundAdmin._id,
            fromUser: createdUser._id,
            content: [notificationContent],
            documentType: notificationContent,
        });

        await notification.save();
        io.getIO().emit("newAccount", {
            userType: "admin",
        });

        return { ...createdUser._doc, _id: createdUser._id.toString() };
    }
    const createdUser = await user.save();
    return { ...createdUser._doc, _id: createdUser._id.toString(), isPassword: !!createdUser.password };
}