const Course = require("../../../models/course");
const Student = require("../../../models/student");
const Instructor = require("../../../models/instructor");
const Notification = require("../../../models/notification");
const Configuration = require("../../../models/configuration");
const Transaction = require("../../../models/transaction");
const io = require("../../../socket");
const { clearHash } = require("../../../util/cache");
const { sendEmailToOneUser } = require("../../../util/email-user");
const { pushNotify } = require("../../../util/pushNotification");

module.exports = async function ({ studentId, courseId }, req) {
    const student = await Student.findById(studentId);
    const instructor = await Instructor.findById(req.userId);
    const course = await Course.findById(courseId);
    const admin = await Instructor.findOne({ admin: true }).populate(
        "configuration"
    );
    const adminSettings = admin._doc.configuration;
    const isApproveEnrollments = adminSettings.isApproveEnrollments;

    if (!instructor && isApproveEnrollments) {
        const error = new Error("No instructor authenticated");
        error.code = 403;
        throw error;
    }
    const config = await Configuration.findOne({
        user: req.userId,
    });

    if (!config) {
        const error = new Error("No configuration found!");
        error.code = 404;
        throw error;
    }
    const isSendNotifications = config.isSendCourseNotifications
    const isSendEmails = config.isSendCourseEmails || !instructor
    const isSendPushNotifications = config.isSendCoursePushNotifications || !instructor

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
    //check if the course has been paid for
    if (course.cost) {
        const transaction = await Transaction.findOne({ userId: studentId, isSuccess: true, courseId: courseId });
        if (!transaction) {
            const error = new Error("The course has not been paid for yet");
            error.code = 403;
            throw error;
        }
    }

    //check to see if student is already enrolled ._id
    if (
        student.coursesEnrolled.includes(
            course._id.toString() ||
            course.studentsEnrollRequests.findIndex(
                (r) => r.student._id.toString() === studentId.toString()
            ) > -1
        )
    ) {
        const error = new Error("Student already enrolled");
        error.code = 403;
        throw error;
    }

    //check to see if student has been graded previously
    const gradeToReplace = course.studentGrades.find(
        (g) => g.student.toString() === studentId.toString()
    );
    if (gradeToReplace) {
        course.studentGrades.pull(gradeToReplace._id)
    }

    //check course capacity
    const numberOfStudentsEnrolled = (
        course.studentsEnrollRequests || []
    ).filter((r) => r.approved).length;
    const courseCapacity = course.studentCapacity;
    if (numberOfStudentsEnrolled >= courseCapacity && courseCapacity) {
        const error = new Error("The course is at maximum student capacity");
        error.code = 403;
        throw error;
    }

    await Notification.deleteMany({
        documentType: {
            $in: ["courseEnrollDeny", "courseEnrollApprove", "autoEnroll"],
        },
        fromUser: req.userId,
        course: courseId,
    });

    const notification = new Notification({
        toUserType: instructor ? "unique" : 'instructor',
        fromUser: req.userId,
        toSpecificUser: instructor ? studentId : course.courseInstructor,
        content: instructor ? ["courseEnrollApprove"] : ['autoEnroll'],
        documentType: instructor ? "courseEnrollApprove" : "autoEnroll",
        documentId: courseId,
        course: courseId,
    });

    const requestToReplace = course.studentsEnrollRequests.find(
        (r) => r.student.toString() === student._id.toString()
    );
    if (requestToReplace)
        course.studentsEnrollRequests.pull(requestToReplace._id);
    course.studentsEnrollRequests.push({
        student: student._id,
        approved: true,
        denied: false,
        droppedOut: false,
        resubmissionAllowed: false,
    });

    // course.studentsDropped.pull(student);
    // course.studentsEnrollDenied.pull(student);
    // course.studentsEnrolled.push(student);
    student.coursesEnrolled.push(course);
    await student.save();
    await course.save();
    if (isSendNotifications || !instructor) await notification.save();
    let userId;
    if (!!instructor) userId = student._id
    if (!instructor) userId = course.courseInstructor

    const docUrl = !!instructor ? `student-panel/course/${course._id}/modules` : `instructor-panel/course/${course._id}/students/enrolled/${studentId}`;
    const notificationOptions = {
        multipleUsers: false,
        content: !!instructor ? "courseEnrollApprove" : 'autoEnroll',
        course: course,
        userId,
        student,
        instructor,
        isStudentRecieving: !!instructor,
        isInstructorRecieving: !instructor,
        url: docUrl,
        condition: !!instructor ? 'isCoursePushNotifications' : "isEnrollPushNotifications",
    }
    if (isSendPushNotifications) {
        await pushNotify(notificationOptions)
    }
    if (isSendEmails) {
        await sendEmailToOneUser({
            userId: !!instructor ? studentId : course.courseInstructor,
            course,
            subject: !!instructor ? "courseEnrollApproveSubject" : 'autoEnrollSubject',
            content: !!instructor ? "courseEnrollApprove" : 'autoEnroll',
            student,
            condition: !!instructor ? 'isCourseEmails' : "isEnrollEmails",
            userType: !!instructor ? 'student' : 'instructor',
            buttonUrl: docUrl,
            buttonText: !!instructor ? 'yourAccount' : 'userDetails'
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
    return !!instructor ? "student request approved" : "Enroll success";
}