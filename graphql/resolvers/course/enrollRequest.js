const Course = require("../../../models/course");
const Student = require("../../../models/student");
const Instructor = require("../../../models/instructor");
const Notification = require("../../../models/notification");
const Transaction = require("../../../models/transaction");
const io = require("../../../socket");
const { clearHash } = require("../../../util/cache");
const { sendEmailToOneUser } = require("../../../util/email-user");
const { pushNotify } = require("../../../util/pushNotification");

module.exports = async function ({ studentId, courseId }, req) {

    const student = await Student.findById(studentId);
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

    if (course.cost) {
        const transaction = await Transaction.findOne({ userId: studentId, isSuccess: true, courseId: courseId });
        if (!transaction) {
            const error = new Error("The course has not been paid for yet");
            error.code = 403;
            throw error;
        }
    }

    const previousRequest = course.studentsEnrollRequests.find(
        (r) => r.student.toString() === student._id.toString()
    );
    //check if the course was graded
    const isGrade = !!((course.studentGrades || []).find(sg => sg.student._id.toString() === studentId.toString()) || {}).grade
    if (isGrade) {
        const error = new Error("The course has already been graded!");
        error.code = 403;
        throw error;
    }
    //check to see if enrollment is allowed after course drop and
    //check to see if the course was dropped
    const admin = await Instructor.findOne({ admin: true }).populate(
        "configuration"
    );
    const adminSettings = admin._doc.configuration;
    const isEnrollmentAllowedAfterCourseDrop = adminSettings.isEnrollAllowedAfterDropCourse;
    const courseDropDeadline = new Date(
        (course.courseDropDeadline || "").toString()
    ).getTime();

    if (!isEnrollmentAllowedAfterCourseDrop && previousRequest.droppedOut) {
        const error = new Error("Re-enrollment after dropping the course has been disabled by the admin");
        error.code = 403;
        throw error;
    }
    //check to see if the request has already been sent
    if (
        course.studentsEnrollRequests.findIndex(
            (r) =>
                r.student.toString() === studentId.toString() &&
                !r.droppedOut &&
                !r.resubmissionAllowed
        ) > -1
    ) {
        const error = new Error(
            "You already sent a request to enroll in this course!"
        );
        error.code = 403;
        throw error;
    }

    //if there is a course drop deadline and deadline has not yet been passed allow enroll
    //if the deadline has been passed do not allow enrollment under any circumstance
    const courseDropDeadlinePassed = courseDropDeadline < Date.now()
    if (course.courseDropDeadline && courseDropDeadlinePassed && previousRequest.droppedOut) {
        const error = new Error(
            "Since the course drop deadline has passed you can no longer enroll"
        );
        error.code = 403;
        throw error;
    }


    // //check to see if the course was dropped
    // if (course.studentsDropped.includes(studentId.toString())) {
    //   const error = new Error(
    //     "You dropped the course and therefore cannot enroll again!"
    //   );
    //   error.code = 403;
    //   throw error;
    // }

    //check if prereqs were completed
    const incompletePrerequisite = (course.prerequisites || []).findIndex(
        (item) => {
            if (!student.completedCourses.includes(item.toString())) return item;
        }
    );

    if (incompletePrerequisite > -1) {
        const error = new Error("Did not complete all course prerequisites!");
        error.code = 403;
        throw error;
    }
    //check if date falls within the enrollment period
    const enrollmentStartDate = new Date(
        (course.enrollmentStartDate || "").toString()
    ).getTime();
    const enrollmentEndDate = new Date(
        (course.enrollmentEndDate || "").toString()
    ).getTime();
    if (Date.now() < enrollmentStartDate || Date.now() > enrollmentEndDate) {
        const error = new Error("Not within enrollment period");
        error.code = 403;
        throw error;
    }
    await Notification.findOneAndDelete({
        documentType: "courseEnrollRequest",
        fromUser: req.userId,
        course: courseId,
    });

    const notification = new Notification({
        toUserType: "unique",
        toSpecificUser: course.courseInstructor,
        fromUser: req.userId,
        content: ["courseEnrollRequest"],
        documentType: "courseEnrollRequest",
        documentId: courseId,
        course: courseId,
    });


    if (previousRequest)
        course.studentsEnrollRequests.pull(previousRequest._id);

    course.studentsEnrollRequests.push({
        student: student._id,
        approved: false,
        denied: false,
        droppedOut: false,
        resubmissionAllowed: false,
    });
    // student.coursesEnrolled.push(course);
    // await student.save();
    await course.save();
    await notification.save();
    const docUrl = `instructor-panel/course/${course._id}/students/requested/${student._id}`
    const notificationOptions = {
        multipleUsers: false,
        course: course,
        userId: course.courseInstructor,
        isInstructorRecieving: true,
        student,
        url: docUrl,
        condition: 'isEnrollPushNotifications',
    }
    await pushNotify({ ...notificationOptions, content: "courseEnrollRequest" })
    await sendEmailToOneUser({
        userId: course.courseInstructor,
        course,
        subject: 'courseEnrollRequestSubject',
        content: 'courseEnrollRequest',
        student,
        condition: 'isEnrollEmails',
        userType: 'instructor',
        buttonText: 'userDetails',
        buttonUrl: docUrl,
    });
    clearHash(course._id);
    io.getIO().emit("updateCourses", {
        userType: "instructor",
    });
    io.getIO().emit("updateStudents", {
        userType: "all",
        courseId: course._id,
    });
    return "student enrolled";
}