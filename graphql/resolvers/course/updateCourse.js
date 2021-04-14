const Course = require("../../../models/course");
const Instructor = require("../../../models/instructor");
const Notification = require("../../../models/notification");
const Configuration = require("../../../models/configuration");
const {validateCourse} = require("./validate");
const xss = require("xss");
const {textEditorWhitelist,noHtmlTags} = require("../validation/xssWhitelist");
const { clearHash } = require("../../../util/cache");
const lodash = require("lodash");
const { sendEmailsToStudents } = require("../../../util/email-students");
const { pushNotify } = require("../../../util/pushNotification");

module.exports = async function ({ courseInput }, req) {
    const errors = await validateCourse(courseInput, req);
    if (errors.length > 0) {
        const error = new Error("Invalid input.");
        error.data = errors;
        error.code = 422;
        throw error;
    }
    if (!req.instructorIsAuth) {
        const error = new Error("Not authenticated!");
        error.code = 401;
        throw error;
    }
    const course = await Course.findById(courseInput.courseId);
    if (!course) {
        const error = new Error("No course found!");
        error.code = 404;
        throw error;
    }
    if (course.courseInstructor.toString() !== req.userId.toString()) {
        const error = new Error("Not authorized!");
        error.code = 403;
        throw error;
    }
    const instructorConfig = await Configuration.findOne({
        user: course.courseInstructor,
    });
    if (!instructorConfig) {
        const error = new Error("No configuration found!");
        error.code = 404;
        throw error;
    }
    const isSendNotifications = instructorConfig.isSendCourseNotifications

    const studentIdsEnrolled = course.studentsEnrollRequests.map((rq) => {
        if (rq.approved) {
            return rq.student;
        }
    });

    const isSendEmails = instructorConfig.isSendCourseEmails;
    const isSendPushNotifications = instructorConfig.isSendCoursePushNotifications;
    const prevRegOfficeHours = course.regularOfficeHours.map((o) => {
        return { day: o.day, startTime: o.startTime, endTime: o.endTime };
    });
    const currRegOfficeHourse = courseInput.regularOfficeHours.map((o) => {
        return { day: o.day, startTime: o.startTime, endTime: o.endTime };
    });

    const prevIrregOfficeHours = course.irregularOfficeHours.map((o) => {
        return {
            date: new Date(o.date),
            startTime: o.startTime,
            endTime: o.endTime,
        };
    });

    const currIrregOfficeHours = courseInput.irregularOfficeHours.map((o) => {
        return {
            date: new Date(o.date),
            startTime: o.startTime,
            endTime: o.endTime,
        };
    });

    const prevDropDeadline = course.courseDropDeadline
        ? new Date(course.courseDropDeadline)
        : null;
    const currDropDeadline = courseInput.courseDropDeadline
        ? new Date(courseInput.courseDropDeadline)
        : null;

    let language;
    if (courseInput.language) {
        language =
            courseInput.language[0].toUpperCase() + courseInput.language.slice(1);
    }

    course.courseName = xss(courseInput.courseName, noHtmlTags);
    course.courseActive = courseInput.courseActive;
    course.studentCapacity = courseInput.studentCapacity;
    course.language = xss(language, noHtmlTags);
    course.enrollmentStartDate = courseInput.enrollmentStartDate;
    course.enrollmentEndDate = courseInput.enrollmentEndDate;
    course.courseStartDate = courseInput.courseStartDate;
    course.courseEndDate = courseInput.courseEndDate;
    course.courseDropDeadline = courseInput.courseDropDeadline;
    course.syllabus = xss(courseInput.syllabus, textEditorWhitelist);
    course.courseImage = xss(courseInput.courseImage, noHtmlTags);
    course.prerequisites = courseInput.prerequisites;
    course.regularOfficeHours = courseInput.regularOfficeHours;
    course.irregularOfficeHours = courseInput.irregularOfficeHours;
    course.cost = courseInput.cost;
    course.couponCode = xss(courseInput.couponCode, noHtmlTags);
    course.couponExpiration = xss(courseInput.couponExpiration, noHtmlTags);

    const updatedCourse = await course.save();
    let courseDropDeadlineNotification;
    const admin = await Instructor.findOne({ admin: true }).populate(
        "configuration"
    );
    const adminSettings = admin._doc.configuration;
    const grade = adminSettings.dropCourseGrade
    const isDropCoursePenalty = adminSettings.isDropCoursePenalty
    const docUrl = `student-panel/courses/syllabus/${course._id}`
    const notificationOptions = {
        users: studentIdsEnrolled,
        multipleUsers: true,
        course: course,
        grade: grade,
        url: docUrl,
        condition: 'isCoursePushNotifications',
    }
    if (
        (prevDropDeadline || "").toString() !==
        (currDropDeadline || "").toString()
    ) {
        courseDropDeadlineNotification = new Notification({
            toUserType: "student",
            fromUser: req.userId,
            content: ["courseDropDeadline"],
            documentType: "courseDropDeadline",
            documentId: course._id,
            course: course._id,
        });
        //push notifications
        if (isSendPushNotifications) {
            await pushNotify({ ...notificationOptions, content: isDropCoursePenalty ? "courseDropDeadline" : "courseDropDeadlineChanged", })
        }
        if (isSendEmails) {
            const content = "courseDropDeadline";
            const subject = "courseDropDeadlineChanged";
            await sendEmailsToStudents({
                studentIdsEnrolled,
                course: updatedCourse,
                content: isDropCoursePenalty ? content : subject,
                subject,
                condition: 'isCourseEmails',
                buttonText: "courseDetails",
                buttonUrl: docUrl,
            });
        }
    }

    let officeHourNotification;
    if (
        //need to use map to remove the id property since it always changes when you update the course
        !lodash.isEqual(prevRegOfficeHours, currRegOfficeHourse) ||
        !lodash.isEqual(prevIrregOfficeHours, currIrregOfficeHours)
    ) {
        officeHourNotification = new Notification({
            toUserType: "student",
            fromUser: req.userId,
            content: ["officeHoursUpdated"],
            documentType: "courseOfficeHours",
            documentId: course._id,
            course: course._id,
        });
        if (isSendPushNotifications) {
            await pushNotify({ ...notificationOptions, content: "officeHoursUpdatedFor", })
        }
        if (isSendEmails) {
            const content = "officeHoursUpdatedFor";
            const subject = "officeHoursUpdated";
            await sendEmailsToStudents({
                studentIdsEnrolled,
                course: updatedCourse,
                content,
                subject,
                condition: 'isCourseEmails',
                buttonText: "courseDetails",
                buttonUrl: docUrl,
            });
        }
    }

    if (courseDropDeadlineNotification && isSendNotifications) {
        await Notification.findOneAndDelete({
            documentType: "courseDropDeadline",
            course: course._id,
        });
        courseDropDeadlineNotification.save();
    }
    if (officeHourNotification && isSendNotifications) {
        await Notification.findOneAndDelete({
            documentType: "courseOfficeHours",
            course: course._id,
        });
        officeHourNotification.save();
    }
    clearHash(course._id);
    // io.getIO().emit("updateCourses", {
    //   userType: "all",
    // });
    return {
        ...updatedCourse._doc,
        _id: updatedCourse._id.toString(),
    };
}