const Course = require("../../../models/course");
const Student = require("../../../models/student");
const Instructor = require("../../../models/instructor");
const Result = require("../../../models/result");
const Notification = require("../../../models/notification");
const Configuration = require("../../../models/configuration");
const io = require("../../../socket");
const { emptyS3Directory } = require("../../../s3");
const { clearHash } = require("../../../util/cache");
const { sendEmailToOneUser } = require("../../../util/email-user");
const { pushNotify } = require("../../../util/pushNotification");

module.exports = async function (
    { studentId, courseId, reason, allowResubmission },
    req
) {
    const student = await Student.findById(studentId);

    const instructor = await Instructor.findById(req.userId);
    const course = await Course.findById(courseId);
    if (!instructor) {
        const error = new Error("No instructor authenticated");
        error.code = 401;
        throw error;
    }
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
    const instructorConfig = await Configuration.findOne({
        user: req.userId,
    });
    if (!instructorConfig) {
        const error = new Error("No configuration found!");
        error.code = 404;
        throw error;
    }
    const isSendNotifications = instructorConfig.isSendCourseNotifications
    const isSendEmails = instructorConfig.isSendCourseEmails
    const isSendPushNotifications = instructorConfig.isSendCoursePushNotifications;
    await Notification.deleteMany({
        documentType: {
            $in: ["courseEnrollDeny", "courseEnrollApprove"],
        },
        fromUser: req.userId,
        course: courseId,
    });

    const content = ["courseEnrollDeny"];
    if (allowResubmission) {
        content.push("allowResubmission");
    }

    const requestToReplace = course.studentsEnrollRequests.find(
        (r) => r.student.toString() === student._id.toString()
    );
    if (requestToReplace)
        course.studentsEnrollRequests.pull(requestToReplace._id);

    course.studentsEnrollRequests.push({
        student: student._id,
        approved: false,
        denied: true,
        deniedReason: reason,
        droppedOut: false,
        resubmissionAllowed: allowResubmission,
    });

    student.coursesEnrolled.pull(courseId);
    const notification = new Notification({
        toUserType: "unique",
        fromUser: req.userId,
        toSpecificUser: student._id,
        content,
        documentType: "courseEnrollDeny",
        documentId: courseId,
        course: courseId,
        message: reason,
    });
    //step 1 check if student is taking a test
    if (student._doc.testInSession) {
        //step 2 find the testResult
        const result = await Result.findOne({
            student: student._id,
            test: student.testInSession.test,
        });
        if (result) {
            //step 3 pull the test result from student array
            student.testResults.pull(result._id);
            //step 4 delete test result
            await Result.findByIdAndDelete(result._id);
            //step 5 set test in session to null
            student.testInSession = null;
            //step 6 delete result file directory
            const resultDirectory = `courses/${courseId}/tests/${student.testInSession.test}/results/${result._id}`;
            await emptyS3Directory(resultDirectory);
        }
    }

    await course.save();
    await student.save();
    if (isSendNotifications) await notification.save();
    clearHash(course._id);
    const docUrl = 'student-panel/courses';
    const notificationOptions = {
        multipleUsers: false,
        content: 'courseEnrollDeny',
        course: course,
        userId: studentId,
        isStudentRecieving: true,
        url: docUrl,
        condition: 'isCoursePushNotifications',
    }
    if (isSendPushNotifications) {
        await pushNotify(notificationOptions)
    }
    if (isSendEmails) {
        await sendEmailToOneUser({
            userId: studentId,
            course,
            subject: 'courseEnrollDenySubject',
            content: 'courseEnrollDeny',
            student,
            condition: 'isCourseEmails',
            userType: 'student',
            buttonText: "yourAccount",
            buttonUrl: docUrl,
        });
    }

    io.getIO().emit("updateCourses", {
        userId: student._id,
        courseId: courseId,
        action: "exitCourse",
    });

    return "student request denied";
}