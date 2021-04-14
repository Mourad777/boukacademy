const { emptyS3Directory } = require("../../../s3");
const Test = require("../../../models/test");
const Notification = require("../../../models/notification");
const Course = require("../../../models/course");
const Student = require("../../../models/student");
const Result = require("../../../models/result");
const Configuration = require("../../../models/configuration");
const io = require("../../../socket");
const { sendEmailsToStudents } = require("../../../util/email-students");
const { sendEmailToOneUser } = require("../../../util/email-user");
const { updateClassAverage } = require("../../../util/updateClassAverage");
const { pushNotify } = require("../../../util/pushNotification");

module.exports = async function ({ testId, studentId, message }, req) {
    if (!req.instructorIsAuth) {
        const error = new Error("Not authenticated!");
        error.code = 401;
        throw error;
    }

    const test = await Test.findById(testId);
    if (!test) {
        const error = new Error("No test found");
        error.code = 401;
        throw error;
    }
    const course = await Course.findById(test.course);
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
    const isSendNotifications = (instructorConfig.isSendTestNotifications && !test.assignment) || (instructorConfig.isSendAssignmentNotifications && test.assignment)
    const isSendTestEmails = instructorConfig.isSendTestEmails;
    const isSendAssignmentEmails = instructorConfig.isSendAssignmentEmails;
    const isSendTestPushNotifications = instructorConfig.isSendTestPushNotifications;
    const isSendAssignmentPushNotifications = instructorConfig.isSendAssignmentPushNotifications;

    const student = await Student.findById(studentId);
    ////////////////Case for reseting test for 1 student/////////////////////
    const docUrl = `student-panel/course/${test.course}/tests/confirm/${test._id}`;
    if (student) {
        //1. find the one test result
        const result = await Result.findOne({ test: testId, student: studentId });
        //2. pull the test result id from student model
        student.testResults.pull(result._id);
        //3. delete the test result
        await result.remove();

        if (test.assignment) {
            //4. if assignmentinsession pull the assignment from student model
            const assignmentInSession = (student.assignmentsInSession || []).find(
                (a) => a.assignment.toString() === testId.toString()
            );
            if (assignmentInSession) {
                student.assignmentsInSession.pull(assignmentInSession._id);
            }
        } else {
            //5. if testinsession reset property to null
            student.testInSession = null;
        }
        //6. delete appropriate notifications
        await Notification.findOneAndDelete({
            documentId: testId,
            documentType: test.assignment ? "assignmentReview" : "testReview",
            toSpecificUser: studentId,
        }); //delete student graded notifications
        await Notification.findOneAndDelete({
            documentId: testId,
            documentType: test.assignment ? "assignmentSubmitted" : "testSubmitted",
            fromUser: studentId,
        }); //delete instructor test submitted notifications

        //7. create notification
        const notification = new Notification({
            toUserType: "unique",
            fromUser: req.userId,
            toSpecificUser: studentId,
            content: ["workReset"],
            documentType: test.assignment ? "resetAssignment" : "resetTest",
            documentId: test._id,
            course: test.course,
            message,
        });

        const emailCondition = test.assignment ? "isAssignmentEmails" : "isTestEmails";
        const pushCondition = test.assignment ? "isAssignmentPushNotifications" : "isTestPushNotifications";
        //8. push notification
        const notificationOptions = {
            multipleUsers: false,
            // users:studentIdsEnrolled,
            userId: studentId,
            content: 'workReset',
            course: course,
            test: test,
            isStudentRecieving: true,
            student: student,
            url: docUrl,
            condition: pushCondition,
        }
        if (
            (isSendTestPushNotifications && !test.assignment) ||
            (isSendAssignmentPushNotifications && test.assignment)
        ) {
            await pushNotify(notificationOptions)
        }
        //9. delete appropriate s3 directory
        const resultDirectory = `courses/${test.course}/tests/${testId}/results/${result._id}`;
        await emptyS3Directory(resultDirectory);
        await student.save();
        if (isSendNotifications) await notification.save();

        //9. email student
        if (
            (isSendTestEmails && !test.assignment) ||
            (isSendAssignmentEmails && test.assignment)
        ) {
            await sendEmailToOneUser({
                userId: studentId,
                course,
                subject: "workResetSubject",
                content: "workReset",
                secondaryContent: message,
                student,
                condition: emailCondition,
                userType: "student",
                test,
                message,
                buttonText: 'viewTest',
                buttonUrl: docUrl
            });
        }
        const ave = await updateClassAverage(test)
        test.classAverage = Number.isNaN(ave) ? 0 : ave;
        await test.save();

        //10. notify student in real-time
        io.getIO().emit("mainMenu", {
            //to exit test if test is in session
            userId: studentId,
            testId,
            action: "resetTest",
            message: "The test was reset",
        });
        io.getIO().emit("updateResults", {
            //to update the ui of test so that it appears available
            userId: studentId,
        });
        return true;
    }
    ////////////////Case for reseting test for all students/////////////////////

    //1. delete all test results from the provided test
    const resultsToDelete = await Result.find({ test: testId }); //needed to pull from student model
    const resultsIdsToDelete = resultsToDelete.map((r) => r._id);
    await Result.deleteMany({ test: testId });
    //2. find the students who are taking this test
    //3. pull the result id from the testresults property
    // if (test.assignment) {
    //4a. pull the appropriate assignment in session from student model
    //if is assignment
    const students = await Student.find();
    const assignmentSessionIdsToDelete = [];
    (students || []).forEach((student) => {
        (student.assignmentsInSession || []).forEach((session) => {
            if (session.assignment.toString() === testId.toString()) {
                assignmentSessionIdsToDelete.push({ _id: session._id });
            }
        });
    });
    const areAssignmentsInSessionToDelete =
        assignmentSessionIdsToDelete.length > 0;

    const foundstudents = await Student.find({
        testResults: { $in: resultsIdsToDelete },
    });
    const operationResult = await Student.updateMany(
        { testResults: { $in: resultsIdsToDelete } },
        {
            $pullAll: { testResults: resultsIdsToDelete },
            $pull: {
                assignmentsInSession: areAssignmentsInSessionToDelete
                    ? {
                        $or: assignmentSessionIdsToDelete,
                    }
                    : {},
            },
            $unset: {
                testInSession: {
                    "testInSession.test": testId,
                },
            },
        }
    );
    let resultDirectory;
    if (!student) {
        resultDirectory = `courses/${test.course}/tests/${testId}/results`;
    }
    await Notification.deleteMany({
        documentId: testId,
        documentType: test.assignment ? "assignmentReview" : "testReview",
    }); //delete student graded notifications
    await Notification.deleteMany({
        documentId: testId,
        documentType: test.assignment ? "assignmentSubmitted" : "testSubmitted",
    }); //delete instructor test submitted notifications
    const deletedOp = await Notification.findOneAndDelete({
        documentId: testId,
        documentType: test.assignment ? "resetAssignment" : "resetTest",
    }); //delete the previous test reset notification
    //check if the student has attempted the assignment or started the test

    const notification = new Notification({
        toUserType: "student",
        fromUser: req.userId,
        content: ["workResetCanTakeAgain"],
        documentType: test.assignment ? "resetAssignment" : "resetTest",
        documentId: test._id,
        course: test.course,
    });
    if (isSendNotifications) await notification.save();

    await emptyS3Directory(resultDirectory);
    const studentIdsEnrolled = course.studentsEnrollRequests.map((rq) => {
        if (rq.approved) {
            return rq.student;
        }
    });
    const emailCondition = test.assignment ? "isAssignmentEmails" : "isTestEmails";
    const pushCondition = test.assignment ? "isAssignmentPushNotifications" : "isTestPushNotifications";
    const notificationOptions = {
        multipleUsers: true,
        users: studentIdsEnrolled,
        content: 'workResetSubject',
        course: course,
        test: test,
        url: docUrl,
        condition: pushCondition,
    }
    if (
        (isSendTestPushNotifications && !test.assignment) ||
        (isSendAssignmentPushNotifications && test.assignment)
    ) {
        await pushNotify(notificationOptions)
    }
    if (
        (isSendTestEmails && !test.assignment) ||
        (isSendAssignmentEmails && test.assignment)
    ) {
        await sendEmailsToStudents({
            studentIdsEnrolled,
            course,
            content: "workResetCanTakeAgain",
            subject: "workResetSubject",
            test,
            condition: emailCondition,
            buttonUrl: docUrl,
            buttonText: 'viewTest'
        });
    }

    test.classAverage = 0
    await test.save();

    io.getIO().emit("mainMenu", {
        //to exit test if test is in session
        userType: "student",
        testId,
        action: "resetTest",
        message: "The test was reset",
    });
    io.getIO().emit("updateResults", {
        //to update the ui of test so that it appears available
        userType: "student",
        id: studentId,
    });

    //reset class average in test document
    return true;
}