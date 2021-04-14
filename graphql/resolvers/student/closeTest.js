const Test = require("../../../models/test");
const Student = require("../../../models/student");
const Course = require("../../../models/course");
const Result = require("../../../models/result");
const Notification = require("../../../models/notification");
const Configuration = require("../../../models/configuration");
const io = require("../../../socket");
require("dotenv").config();
const { sendEmailToOneUser } = require("../../../util/email-user");
const { updateClassAverage } = require("../../../util/updateClassAverage");
const { pushNotify } = require("../../../util/pushNotification");

module.exports = async function ({ test, student, isExcused }, req) {
    if (!req.instructorIsAuth) {
        const error = new Error("No instructor logged in!");
        error.code = 401;
        throw error;
    }
    const instructorTest = await Test.findById(test);
    if (!instructorTest) {
        const error = new Error("no test found");
        error.code = 401;
        throw error;
    }

    const studentToUpdate = await Student.findById(student);
    if (!studentToUpdate) {
        const error = new Error("no student found");
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

    const isSendTestEmails = instructorConfig.isSendTestEmails;
    const isSendAssignmentEmails = instructorConfig.isSendAssignmentEmails;

    const isSendTestPushNotifications = instructorConfig.isSendTestPushNotifications;
    const isSendAssignmentPushNotifications = instructorConfig.isSendAssignmentPushNotifications;

    const isSendNotifications = (instructorConfig.isSendTestNotifications && !instructorTest.assignment) || (instructorConfig.isSendAssignmentNotifications && instructorTest.assignment)

    const result = await Result.findOne({ test: test, student });

    const instructorCourses = await Course.find({
        courseInstructor: req.userId,
    });
    const foundCourse = instructorCourses.find((course) =>
        course.tests.includes(test.toString())
    );
    if (!foundCourse) {
        const error = new Error(
            "Not authorized! The test is in a course that you are not teaching."
        );
        error.code = 403;
        throw error;
    }

    const sectionGrades = [
        "multipleChoiceQuestions",
        "essayQuestions",
        "speakingQuestions",
        "fillInBlanksQuestions",
    ].map((section, index) => {
        let answers = [];
        if (index !== 3) {
            answers = (instructorTest[section] || []).map((answer, index) => {
                return {
                    marks: 0,
                    questionNumber: index + 1,
                };
            });
        } else {
            answers = ((instructorTest[section] || {}).blanks || []).map(
                (answer, index) => {
                    return {
                        marks: 0,
                        questionNumber: index + 1,
                    };
                }
            );
        }
        return {
            grade: 0,
            answers: answers,
        };
    });
    const isMcSection = instructorTest.sectionWeights.mcSection;
    const isEssaySection = instructorTest.sectionWeights.essaySection;
    const isSpeakingSection = instructorTest.sectionWeights.speakingSection;
    const isFillBlankSection = instructorTest.sectionWeights.fillBlankSection;
    if (instructorTest.assignment) {
        const assignmentSessionToPull = studentToUpdate.assignmentsInSession.find(
            (item) => item.assignment.toString() === test.toString()
        );
        if (assignmentSessionToPull) {
            studentToUpdate.assignmentsInSession.pull(assignmentSessionToPull._id);
        }
    }
    if (!instructorTest.assignment) {
        studentToUpdate.testInSession = null;
    }
    //check to see if test or assignment has been initialized
    //if not push a test result object with 0 grades
    //update class average

    //if test is closed update class average



    if (isExcused) {
        const notification = new Notification({
            toUserType: "unique",
            toSpecificUser: student,
            fromUser: req.userId,
            content: ["workExcused"],
            documentType: instructorTest.assignment ? "assignmentExcused" : "testExcused",
            documentId: test,
            course: instructorTest.course,
        });
        if (isSendNotifications) notification.save();
        const docUrl = `student-panel/course/${instructorTest.course}/tests/confirm/${instructorTest._id}`;
        const emailCondition = instructorTest.assignment ? "isAssignmentEmails" : "isTestEmails";
        const pushCondition = instructorTest.assignment ? "isAssignmentPushNotifications" : "isTestPushNotifications";
        //push notification
        const notificationOptions = {
            multipleUsers: false,
            content: 'workExcused',
            test: instructorTest,
            userId: student,
            isStudentRecieving: true,
            url: docUrl,
            condition: pushCondition,
        }

        if (
            ((isSendTestPushNotifications && !instructorTest.assignment) ||
                (isSendAssignmentPushNotifications && instructorTest.assignment)) &&
            req.instructorIsAuth
        ) {

            await pushNotify(notificationOptions)
        }

        if (
            ((isSendTestEmails && !instructorTest.assignment) ||
                (isSendAssignmentEmails && instructorTest.assignment))
        ) {
            await sendEmailToOneUser({
                userId: student,
                course: foundCourse,
                subject: "workExcusedSubject",
                content: "workExcused",
                student: studentToUpdate,
                condition: emailCondition,
                userType: "student",
                test: instructorTest,
                buttonUrl: docUrl,
                buttonText: "viewTest"
                // message,
            });
        }
    }


    if (!result) {
        const result = new Result({
            student: student,
            course: instructorTest.course,
            graded: false,
            isExcused,
            grade: 0,
            test: test,
            gradingInProgress: false,
            gradeOverride: false,
            closed: true,
            multiplechoiceSection: isMcSection ? sectionGrades[0] : null,
            essaySection: isEssaySection ? sectionGrades[1] : null,
            speakingSection: isSpeakingSection ? sectionGrades[2] : null,
            fillInBlanksSection: isFillBlankSection ? sectionGrades[3] : null,
        });
        const newResult = await result.save();
        studentToUpdate.testResults.push(newResult._id);
        studentToUpdate.save();
        io.getIO().emit("updateResults", {
            //to update the ui of test so that it appears available
            userId: student,
        });

        return result;
    }
    //if result, close it
    if (result) {
        await studentToUpdate.save();
        result.closed = true;
        result.graded = false;
        if (isExcused) {
            result.isExcused = true;
            // result.graded = true;

            //to update progress report in real-time for student
            io.getIO().emit("updateResults", {
                userType: "student",
                userId: student,
            });
            //to update progress report in real-time for instructor
            io.getIO().emit("updateCourses", {
                //to update the class average
                userType: "all",
                courseId: foundCourse._id,
                enrollmentRequired: true,
            });
        }
        await result.save();
        const updatedClassAverage = await updateClassAverage(instructorTest);
        const ave = isNaN(updatedClassAverage) ? 0 : updatedClassAverage;

        instructorTest.classAverage = Number.isNaN(ave) ? 0 : ave;
        if (!isExcused) await instructorTest.save();
        io.getIO().emit("mainMenu", {
            userId: student,
            testId: test,
            action: isExcused ? "excuseTest" : "closeTest",
            message: isExcused ? "The instructor excused the test" : "The instructor closed the test",
        });
        //if test is excused email the student
        return result;
    }
    //testresults
}