const Instructor = require("../../../models/instructor");
const Student = require("../../../models/student");
const io = require("../../../socket");
const { sendEmailToOneUser } = require("../../../util/email-user");
const { noHtmlTags } = require("../validation/xssWhitelist");
require("dotenv").config();
const xss = require("xss");
const { pushNotify } = require("../../../util/pushNotification");

module.exports = {
    activateAccount: async function ({ userId }, req) {
        const userMakingRequest = await Instructor.findById(req.userId)
        if (!userMakingRequest.admin) {
            const error = new Error("Unauthorized access, only admin is allowed to suspend or activate a new account");
            error.code = 403;
            throw error;
        }

        let user, userType;
        const instructor = await Instructor.findById(userId)
        const student = await Student.findById(userId)
        if (instructor) {
            user = instructor
            userType = 'instructor'
        }
        if (student) {
            user = student
            userType = 'student'
        }
        const url = `${userType}-panel/courses`
        if (!user) {
            const error = new Error("No user found");
            error.code = 401;
            throw error;
        }
        if (user.isAccountApproved) {
            const error = new Error("The account has already been activated");
            error.code = 401;
            throw error;
        } else {
            user.isAccountApproved = true
            await user.save()
            await sendEmailToOneUser({
                userId,
                course: null,
                subject: "accountActivatedSubject",
                content: "accountActivated",
                student,
                instructor,
                condition: null,
                userType,
                buttonText:"yourAccount",
                buttonUrl:url,
            });

            const notificationOptions = {
                multipleUsers: false,
                content: 'accountActivated',
                userId,
                isStudentRecieving: userType ==='student',
                isInstructorRecieving: userType ==='instructor',
                instructor,
                student,
                url,
                condition: null,
            }
            await pushNotify(notificationOptions)
            io.getIO().emit("activateAccount", {
                userId,
            });
            return "account activated"
        }
    },

    //function runs also for reversing account suspension
    suspendAccount: async function (
        { userId, reason },
        req
    ) {
        const reasonClean = xss(reason, noHtmlTags);
        //verify that admin is making the request
        const userMakingRequest = await Instructor.findById(req.userId);
        if (!userMakingRequest.admin) {
            const error = new Error("Unauthorized access, only admin is allowed to suspend or re-activate accounts");
            error.code = 403;
            throw error;
        }
        let user, userType;
        const instructor = await Instructor.findById(userId)
        const student = await Student.findById(userId)
        if (instructor) {
            userType = 'instructor'
            user = instructor
        }
        if (student) {
            userType = 'student'
            user = student
        }
        if (!user) {
            const error = new Error("No user found");
            error.code = 401;
            throw error;
        }
        let content;
        if (user.isAccountSuspended) {
            content = "accountReactivated"
            user.isAccountSuspended = false;
        } else {
            content = "accountSuspended"
            user.isAccountSuspended = true;
        }
        await user.save()

        const url = `${userType}-panel/courses`
        await sendEmailToOneUser({
            userId,
            course: null,
            subject: content + 'Subject',
            content,
            secondaryContent: reasonClean || '',
            student,
            instructor,
            condition: null,
            userType,
            buttonText:content === "accountReactivated" ? "yourAccount" : "",
            buttonUrl:url,
        });

        const notificationOptions = {
            multipleUsers: false,
            content,
            userId,
            isStudentRecieving: userType === 'student',
            isInstructorRecieving: userType === 'instructor',
            instructor,
            student,
            url,
            condition: null,
        }
        await pushNotify(notificationOptions)
        if (user.isAccountSuspended) {
            io.getIO().emit("suspendAccount", {
                userId,
            });
        }
        return user.isAccountSuspended ? "account suspended" : "account reactivated"
    },
};