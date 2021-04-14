const Course = require("../../../models/course");
const Student = require("../../../models/student");
const Result = require("../../../models/result");
const Notification = require("../../../models/notification");
const io = require("../../../socket");
const { clearHash } = require("../../../util/cache");
const { sendEmailToOneUser } = require("../../../util/email-user");
const { pushNotify } = require("../../../util/pushNotification");

module.exports = async function ({ studentId, courseId }, req) {
    const student = await Student.findById(studentId); //can't cache student with course key since a student can take multiple courses
    const course = await Course.findById(courseId);
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
    if (studentId.toString() !== req.userId.toString()) {
        const error = new Error("Not authorized!");
        error.code = 403;
        throw error;
    }
    // const courseDropDeadline = new Date(
    //   (course.courseDropDeadline || "").toString()
    // ).getTime();

    // const admin = await Instructor.findOne({ admin: true }).populate(
    //   "configuration"
    // );
    // const adminSettings = admin._doc.configuration;
    //check to see if course has already been graded, if so prevent drop
    const isGraded = !!(course.studentGrades.find(gr => gr.grade && gr.student.toString() === studentId.toString()));
    if (isGraded) {
        const error = new Error("You can't drop the course since it has been graded");
        error.code = 403;
        throw error;
    }
    // if ((Date.now() > courseDropDeadline) && adminSettings.isDropCoursePenalty) {
    //   course.studentGrades.push({
    //     student: studentId,
    //     passed: false,
    //     grade: adminSettings.dropCourseGrade,
    //     gradeOverride: false,
    //   });

    // }
    //check to see if not already dropped
    if (
        course.studentsEnrollRequests.findIndex(
            (r) => r.student.toString() === studentId.toString() && r.droppedOut
        ) > -1
    ) {
        const error = new Error("You have already dropped the course!");
        error.code = 403;
        throw error;
    }

    await Notification.findOneAndDelete({
        documentType: "courseDrop",
        fromUser: req.userId,
        course: courseId,
    });

    const notification = new Notification({
        toUserType: "instructor",
        fromUser: req.userId,
        content: ["courseDrop"],
        documentType: "courseDrop",
        documentId: courseId,
        course: courseId,
    });
    await notification.save();
    await Result.updateMany(
        { student: studentId },
        {
            $set: {
                closed: true,
            },
        }
    );

    const requestToReplace = course.studentsEnrollRequests.find(
        (r) => r.student.toString() === student._id.toString()
    );
    if (requestToReplace)
        course.studentsEnrollRequests.pull(requestToReplace._id);

    course.studentsEnrollRequests.push({
        student: student._id,
        approved: false,
        denied: false,
        droppedOut: true,
        resubmissionAllowed: false,
    });

    student.coursesEnrolled.pull(course);
    student.testInSession = null;
    student.assignmentsInSession = [];
    const studentWithNewCourse = await student.save();
    await course.save();
    clearHash(course._id);
    const docUrl = `instructor-panel/course/${course._id}/students/enrolled/${student._id}`;
    const notificationOptions = {
        multipleUsers: false,
        content: 'courseDrop',
        course: course,
        userId: course.courseInstructor,
        isInstructorRecieving: true,
        student,
        url: docUrl,
        condition: 'isDropCoursePushNotifications',
    }
    await pushNotify(notificationOptions)
    await sendEmailToOneUser({
        userId: course.courseInstructor,
        course,
        subject: 'courseDropSubject',
        content: 'courseDrop',
        student,
        condition: 'isDropCourseEmails',
        userType: 'instructor',
        buttonText: "userDetails",
        buttonUrl: docUrl,
    });
    io.getIO().emit("updateCourses", {
        userType: "all",
        courseId: course._id,
    });
    io.getIO().emit("updateStudents", {
        userType: "all",
        courseId: course._id,
    });
    return {
        ...studentWithNewCourse._doc,
        _id: studentWithNewCourse._id.toString(),
    };
}
