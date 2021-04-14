const Course = require("../../../models/course");
const Student = require("../../../models/student");
const Instructor = require("../../../models/instructor");
const Notification = require("../../../models/notification");
const Configuration = require("../../../models/configuration");
const io = require("../../../socket");
const { validateFinalGrade } = require("./validate");
const xss = require("xss");
const { noHtmlTags } = require("../validation/xssWhitelist");
const { clearHash } = require("../../../util/cache");
const { sendEmailToOneUser } = require("../../../util/email-user");
const { pushNotify } = require("../../../util/pushNotification");

module.exports = async function (
    {
        gradeCourseInput: {
            studentId,
            courseId,
            grade,
            gradeOverride,
            gradeAdjustmentExplanation,
            passed,
        },
    },
    req
) {
    const student = await Student.findById(studentId);
    const instructor = await Instructor.findById(req.userId);
    const course = await Course.findById(courseId);
    if (!instructor) {
        const error = new Error("No instructor authenticated");
        error.code = 403;
        throw error;
    }
    const instructorConfig = await Configuration.findOne({
        user: req.userId,
    });
    if (!instructorConfig) {
        const error = new Error("No configuration found!");
        error.code = 404;
        throw error;
    };
    const isSendNotifications = instructorConfig.isSendCourseNotifications;
    const isSendEmails = instructorConfig.isSendCourseEmails;
    const isSendPushNotifications = instructorConfig.isSendCoursePushNotifications;
    if (!student) {
        const error = new Error("No student found");
        error.code = 401;
        throw error;
    }
    if (!course) {
        const error = new Error("No course found");
        error.code = 401;
        throw error;
    }
    const admin = await Instructor.findOne({ admin: true }).populate(
        "configuration"
    );
    const adminSettings = admin._doc.configuration;
    const isCourseDropped = course.studentsEnrollRequests.find(er => {
        return !!(er.student._id.toString() === studentId.toString() && er.droppedOut)
    })

    //stop grading if the student dropped out and there is a drop deadline and the deadline has not yet passed
    const courseDropDeadline = new Date(
        (course.courseDropDeadline || "").toString()
    ).getTime();

    //should only be able to grade the course if the student has not possibility of re-enrolling
    //for example if the coursedropdeadline has passed, or if the admin has disabled re-enrollment after
    //the course is dropped
    if ((adminSettings.isEnrollAllowedAfterDropCourse && isCourseDropped && !course.courseDropDeadline) || (isCourseDropped && course.courseDropDeadline && (courseDropDeadline > Date.now()))) {
        const error = new Error("Can't grade the course if their is no drop deadline or the deadline has not yet passed");
        error.code = 401;
        throw error;

    }

    const errors = await validateFinalGrade({
        grade,
        gradeOverride,
        dropCourseGrade: adminSettings.dropCourseGrade,
        isDropCoursePenalty: adminSettings.isDropCoursePenalty
    }, req);
    if (errors.length > 0) {
        const error = new Error("Invalid input.");
        error.data = errors;
        error.code = 422;
        throw error;
    }
    //check to see if the course is dropped, if so prevent grading

    await Notification.findOneAndDelete({
        documentId: courseId,
        toSpecificUser: studentId,
        documentType: "courseGrade",
    });

    const gradeToReplace = course.studentGrades.find(
        (g) => g.student.toString() === student._id.toString()
    );
    const notificationContent = [];
    if (gradeToReplace) {
        course.studentGrades.pull(gradeToReplace._id);
        // notificationContent = `The instructor adjusted your grade for ${course.courseName}. You ${passed ? 'passed' : 'failed'} with a grade of ${grade}%.`
        notificationContent.push("adjustGradeCourse");
    } else {
        // notificationContent = `You ${passed ? "passed" : "failed"} ${
        //   course.courseName
        // } with a grade of ${grade}%.`;
        notificationContent.push("gradeCourse");
    }
    course.studentGrades.push({
        student: studentId,
        passed,
        grade,
        gradeOverride,
        gradeAdjustmentExplanation: xss(gradeAdjustmentExplanation, noHtmlTags),
    });
    if (passed && !student.completedCourses.includes(courseId.toString())) {
        student.completedCourses.push(courseId);
    }
    if (!passed && student.completedCourses.includes(courseId.toString())) {
        student.completedCourses.pull(courseId);
    }
    const notification = new Notification({
        toUserType: "unique",
        fromUser: req.userId,
        toSpecificUser: studentId,
        content: notificationContent,
        documentType: "courseGrade",
        documentId: courseId,
        course: courseId,
    });
    await student.save();
    await course.save();
    if (isSendNotifications) await notification.save();
    const notificationOptions = {
        multipleUsers: false,
        content: notificationContent[0],
        course: course,
        userId: studentId,
        isStudentRecieving: true,
        student,
        passed,
        grade,
        url: 'transcript',
        condition: 'isCoursePushNotifications',
    }
    if (isSendPushNotifications) {
        await pushNotify(notificationOptions)
    }
    if (isSendEmails) {
        await sendEmailToOneUser({
            userId: studentId,
            course,
            subject: `${notificationContent[0]}Subject`,
            content: notificationContent[0],
            student,
            condition: 'isCourseEmails',
            userType: 'student',
            grade,
            passed,
            buttonText: 'transcript',
            buttonUrl: 'transcript'
        });
    }
    clearHash(course._id);
    io.getIO().emit("updateCourses", {
        userType: "student",
        userId: studentId,
    });
    io.getIO().emit("updateStudents", {
        userType: "all",
        courseId: course._id,
    });
    return true;
}