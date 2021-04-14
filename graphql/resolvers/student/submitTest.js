const { validateSubmitTest } = require("./validate");
const Test = require("../../../models/test");
const Student = require("../../../models/student");
const Course = require("../../../models/course");
const Result = require("../../../models/result");
const Notification = require("../../../models/notification");
const Configuration = require("../../../models/configuration");
const io = require("../../../socket");
require("dotenv").config();
const xss = require("xss");
const { noHtmlTags, textEditorWhitelist } = require("../validation/xssWhitelist");
const { sendEmailToOneUser } = require("../../../util/email-user");
const { updateClassAverage } = require("../../../util/updateClassAverage");
const { i18n } = require("../../../i18n.config");
const { pushNotify } = require("../../../util/pushNotification");
const { getReadableDate } = require("../../../util/getReadableDate");

module.exports = async function (
    {
        studentId,
        testId,
        testClosed,
        submittedOn,
        lastSavedOn,
        graded,
        grade,
        gradeAdjustmentExplanation,
        gradeOverride,
        gradingInProgress,
        marking,
        latePenalty,
        sectionGrades,
        multipleChoiceAnswersInput,
        essayAnswersInput,
        speakingAnswersInput,
        fillBlankAnswersInput,
    },
    req
) {
    //sectionGrades is an array with 4 slots corresponding to
    //mc section,essay section,speaking section, and fillblanksection
    //respectively
    //these grades are not adjusted to there section weights marks
    const student = await Student.findOne({ _id: studentId });
    if (!student) {
        const error = new Error("No student found.");
        error.code = 401;
        throw error;
    }
    const result = await Result.findOne({ test: testId, student: studentId });
    if (!result) {
        const error = new Error("No initialized test found.");
        error.code = 401;
        throw error;
    }
    const test = await Test.findOne({ _id: testId });
    if (!test) {
        const error = new Error("No test found.");
        error.code = 401;
        throw error;
    }
    const course = await Course.findById(test.course);
    if (!course) {
        const error = new Error("No course found.");
        error.code = 401;
        throw error;
    }
    const instructorConfig = await Configuration.findOne({
        user: req.userId,
    });
    if (!instructorConfig && req.instructorIsAuth) {
        const error = new Error("No configuration found!");
        error.code = 404;
        throw error;
    }
    const isSendNotifications = (instructorConfig.isSendTestNotifications && !test.assignment) || (instructorConfig.isSendAssignmentNotifications && test.assignment)
    const isSendTestEmails = instructorConfig.isSendTestEmails;
    const isSendAssignmentEmails = instructorConfig.isSendAssignmentEmails;

    const isSendTestPushNotifications = instructorConfig.isSendTestPushNotifications;
    const isSendAssignmentPushNotifications = instructorConfig.isSendAssignmentPushNotifications;

    if (!req.instructorIsAuth && !req.studentIsAuth) {
        const error = new Error(
            "Not authenticated. There is no instructor or student logged in."
        );
        error.code = 401;
        throw error;
    }
    if (req.studentIsAuth) {
        if (studentId.toString() !== req.userId.toString()) {
            const error = new Error("Not authorized!");
            error.code = 403;
            throw error;
        }
        if (!course.courseActive) {
            const error = new Error("Not authorized. Course not active.");
            error.code = 403;
            throw error;
        }
        if (!student.coursesEnrolled.includes(test.course.toString())) {
            const error = new Error("Not authorized. Not enrolled in the course!");
            error.code = 403;
            throw error;
        }
    }
    if (req.instructorIsAuth) {
        const instructorCourses = await Course.find({
            courseInstructor: req.userId,
        });
        const foundCourse = instructorCourses.find((course) =>
            course.tests.includes(testId.toString())
        );
        if (!foundCourse) {
            const error = new Error(
                "Not authorized! The test is in a course that you are not teaching."
            );
            error.code = 403;
            throw error;
        }
    }

    const errors = await validateSubmitTest(
        testClosed,
        submittedOn,
        lastSavedOn,
        graded,
        grade,
        gradeAdjustmentExplanation,
        gradeOverride,
        gradingInProgress,
        marking,
        latePenalty,
        sectionGrades,
        multipleChoiceAnswersInput,
        essayAnswersInput,
        speakingAnswersInput,
        fillBlankAnswersInput,
        test,
        req
    );

    if (errors.length > 0) {
        const error = new Error("Invalid input.");
        error.data = errors;
        error.code = 422;
        throw error;
    }

    const testInSession = student.testInSession;
    const assignmentInSession = (student.assignmentsInSession || []).find(
        (item) => item.assignment.toString() === testId.toString()
    );

    if (!test.assignment && !testInSession && !req.instructorIsAuth) {
        const error = new Error("Could not find a test in session");
        error.code = 401;
        throw error;
    }
    if (test.assignment && !assignmentInSession && !req.instructorIsAuth) {
        const error = new Error("Could not find the assignment in session");
        error.code = 401;
        throw error;
    }

    if (!req.instructorIsAuth && result.closed) {
        const error = new Error(
            "Student can't submit test if the test has closed."
        );
        error.code = 401;
        throw error;
    }

    //check due date if test does not allow late submission
    if (test.dueDate && !req.instructorIsAuth && !test.allowLateSubmission) {
        const testCloseDate = new Date(test.dueDate).getTime();
        if (Date.now() > testCloseDate + 10000) {
            //allow extra 10 seconds to submit quiz
            const error = new Error(
                "Test or assignment can't be submitted, the due date has passed."
            );
            error.code = 401;
            throw error;
        }
    }
    //check due date if test does allow late submission
    if (!req.instructorIsAuth && test.allowLateSubmission) {
        const testCloseDate =
            new Date(test.dueDate).getTime() + test.lateDaysAllowed * 86400000;
        if (Date.now() > testCloseDate + 10000) {
            //allow extra 10 seconds to submit quiz
            const error = new Error(
                "Test or assignment can't be submitted, you have exceeded the late days allowed."
            );
            error.code = 401;
            throw error;
        }
    }

    //check expiry time
    if (test.timer && req.studentIsAuth) {
        const testEndTime =
            new Date(result.startedOn).getTime() + test.timer * 60 * 1000 + 10000;
        if (Date.now() > testEndTime) {
            //allow extra 10 seconds to submit quiz
            const error = new Error("Test can't be submitted, time has expired.");
            error.code = 401;
            throw error;
        }
    }

    let multiplechoiceSectionAnswers;
    let essaySectionAnswers;
    let speakingSectionAnswers;
    let fillInBlanksSectionAnswers;

    if (!marking) {
        const sanitizedMcAnswers = (multipleChoiceAnswersInput || []).map((q) => {
            return {
                ...q,
                answers: q.answers.map((answer) => xss(answer, noHtmlTags)),
            };
        });
        const sanitizedEssayAnswers = (essayAnswersInput || []).map((q) => {
            return {
                ...q,
                answer: xss(q.answer, textEditorWhitelist),
            };
        });
        const sanitizedSpeakingAnswers = (speakingAnswersInput || []).map((q) => {
            return {
                ...q,
                answer: xss(q.answer, noHtmlTags),
            };
        });
        const sanitizedFillblankAnswers = (fillBlankAnswersInput || []).map(
            (q) => {
                return {
                    ...q,
                    answer: xss(q.answer, noHtmlTags),
                };
            }
        );
        multiplechoiceSectionAnswers = {
            answers: sanitizedMcAnswers,
        };
        essaySectionAnswers = {
            answers: sanitizedEssayAnswers,
        };
        speakingSectionAnswers = {
            answers: sanitizedSpeakingAnswers,
        };
        fillInBlanksSectionAnswers = {
            answers: sanitizedFillblankAnswers,
        };
    }

    //if test is closed update class average
    const gradeReleaseDate = new Date(
        (test.gradeReleaseDate || "").toString()
    ).getTime();
    const isGradeReleaseDate =
        Date.now() > gradeReleaseDate || !gradeReleaseDate;

    // Case for submitting test when instructor is grading
    if (marking) {
        if (!req.instructorIsAuth) {
            const error = new Error("Not authorized.");
            error.data = errors;
            error.code = 401;
            throw error;
        }
        const multiplechoiceSection = {
            grade: sectionGrades[0],
            answers: result.multiplechoiceSection.answers.map((answer, index) => {
                const mcAnswerInput = (multipleChoiceAnswersInput || [])[index] || {};
                return {
                    ...answer._doc,
                    marks: mcAnswerInput.marks,
                    additionalNotes: xss(mcAnswerInput.additionalNotes, noHtmlTags),
                };
            }),
        };

        const essaySection = {
            grade: sectionGrades[1],
            answers: result.essaySection.answers.map((answer, index) => {
                const essayAnswerInput = (essayAnswersInput || [])[index] || {};
                return {
                    ...answer._doc,
                    marks: essayAnswerInput.marks,
                    additionalNotes: xss(essayAnswerInput.additionalNotes, noHtmlTags),
                    instructorCorrection: essayAnswerInput.allowCorrection
                        ? xss(essayAnswerInput.instructorCorrection, textEditorWhitelist)
                        : xss(answer.answer, textEditorWhitelist),
                    allowCorrection: essayAnswerInput.allowCorrection,
                };
            }),
        };

        const speakingSection = {
            grade: sectionGrades[2],
            answers: result.speakingSection.answers.map((answer, index) => {
                const speakingAnswerInput = (speakingAnswersInput || [])[index] || {};
                return {
                    ...answer._doc,
                    marks: speakingAnswerInput.marks,
                    additionalNotes: xss(
                        speakingAnswerInput.additionalNotes,
                        noHtmlTags
                    ),
                    feedbackAudio: xss(speakingAnswerInput.feedbackAudio, noHtmlTags),
                };
            }),
        };

        const fillInBlanksSection = {
            grade: sectionGrades[3],
            answers: result.fillInBlanksSection.answers.map((answer, index) => {
                const fillblankAnswerInput =
                    (fillBlankAnswersInput || [])[index] || {};
                return {
                    ...answer._doc,
                    marks: fillblankAnswerInput.marks,
                    additionalNotes: xss(
                        fillblankAnswerInput.additionalNotes,
                        noHtmlTags
                    ),
                };
            }),
        };

        let notification;
        let content;
        let gradedSubject;
        if (graded) {
            if (isSendNotifications) await Notification.findOneAndDelete({
                documentId: test._id,
                toSpecificUser: studentId,
            });
            if (isGradeReleaseDate) {
                gradedSubject = "workGradedSubject";
                content = "workGraded";
            }
            if (result.graded && isGradeReleaseDate) {
                content = "workReviewed";
                gradedSubject = "workReviewedSubject";
                if (result.grade !== grade) content = "workReviewedGradeChanged";
            }

            if (result.graded && result.grade !== grade && isGradeReleaseDate) {
                content = "workGradeChanged";
                gradedSubject = "workReviewedSubject";
            }
            if (!isGradeReleaseDate && gradeReleaseDate && !result.graded) {
                content = "workGradedLaterDate";
                gradedSubject = "workGradedSubject";
            }

            notification = new Notification({
                toUserType: "unique",
                toSpecificUser: studentId,
                fromUser: req.userId,
                content: [content],
                documentType: test.assignment ? "assignmentReview" : "testReview",
                documentId: test._id,
                course: test.course,
            });
        }

        result.test = test._id;
        result.graded = graded;
        result.grade = grade;
        result.gradeAdjustmentExplanation = xss(
            gradeAdjustmentExplanation,
            noHtmlTags
        );
        result.gradeOverride = gradeOverride;
        result.gradingInProgress = gradingInProgress;
        result.latePenalty = latePenalty;
        result.multiplechoiceSection = multiplechoiceSection;
        result.essaySection = essaySection;
        result.speakingSection = speakingSection;
        result.fillInBlanksSection = fillInBlanksSection;
        await result.save();
        if (content && isSendNotifications) await notification.save();
        //update test class average
        const updatedClassAverage = await updateClassAverage(test);
        test.classAverage = isNaN(updatedClassAverage) ? 0 : updatedClassAverage;
        if (graded) await test.save();
        const date = new Date(test.gradeReleaseDate).getTime();
        const docUrl = isGradeReleaseDate ? `student-panel/course/${test.course}/completed-tests/${test._id}` : `student-panel/course/${test.course}/completed-tests`;
        const emailCondition = test.assignment ? "isAssignmentEmails" : "isTestEmails";
        const pushCondition = test.assignment ? "isAssignmentPushNotifications" : "isTestPushNotifications";
        //push notification
        const notificationOptions = {
            multipleUsers: false,
            content,
            test: test,
            date: getReadableDate(date, student.language),
            grade: result.grade,
            passed: test.passingGrade ? test.passingGrade < result.grade ? true : false : "",
            userId: studentId,
            isStudentRecieving: true,
            url: docUrl,
            condition: pushCondition,
        }

        if (result.graded) {
            if (
                ((isSendTestPushNotifications && !test.assignment) ||
                    (isSendAssignmentPushNotifications && test.assignment)) &&
                req.instructorIsAuth
            ) {
                await pushNotify(notificationOptions)
            }
            if (
                ((isSendTestEmails && !test.assignment) ||
                    (isSendAssignmentEmails && test.assignment)) &&
                req.instructorIsAuth
            ) {
                await sendEmailToOneUser({
                    userId: studentId,
                    course,
                    subject: gradedSubject,
                    content,
                    date: getReadableDate(date, student.language),
                    student,
                    condition: emailCondition,
                    userType: "student",
                    test,
                    grade,
                    passed:
                        (test.passingGrade && test.passingGrade <= grade),
                    buttonUrl: docUrl,
                    buttonText: "viewTest"
                });
            }
        }
        if (req.instructorIsAuth) {
            io.getIO().emit("updateResults", {
                userType: "student",
                userId: studentId,
            });
            io.getIO().emit("updateCourses", {
                //to update the class average
                userType: "all",
                courseId: course._id,
                enrollmentRequired: true,
            });
        }
        return "grading";
    }
    // Case for submitting or saving test when student is taking it
    const notification = new Notification({
        toUserType: "unique",
        toSpecificUser: course.courseInstructor,
        fromUser: req.userId,
        content: ["workSubmitted"],
        documentType: test.assignment ? "assignmentSubmitted" : "testSubmitted",
        documentId: test._id,
        course: test.course,
    });

    result.test = test._id;
    result.closed = testClosed ? true : false;
    result.lastSavedOn = lastSavedOn;
    result.submittedOn = submittedOn;
    result.graded = graded;
    result.gradingInProgress = gradingInProgress;
    result.latePenalty = latePenalty;
    result.multiplechoiceSection = multiplechoiceSectionAnswers;
    result.essaySection = essaySectionAnswers;
    result.speakingSection = speakingSectionAnswers;
    result.fillInBlanksSection = fillInBlanksSectionAnswers;

    if (testClosed && !test.assignment) student.testInSession = null; //if final submission of test, reset testInSession to null
    if (testClosed && test.assignment) {
        //if final submission of assignment, remove the specific assignmentInSession from array
        student.assignmentsInSession.pull(assignmentInSession._id);
    }

    await student.save();
    await result.save();

    if (testClosed) {
        //bell notification
        const docUrl = `instructor-panel/course/${test.course}/grade-tests/student/${student._id}/test/${test._id}`;
        const emailCondition = test.assignment ? "isAssignmentEmails" : "isTestEmails";
        const pushCondition = test.assignment ? "isAssignmentPushNotifications" : "isTestPushNotifications";
        await notification.save();
        //push notification
        const notificationOptions = {
            multipleUsers: false,
            content: 'workSubmitted',
            test: test,
            student: student,
            passOrFail: test.passingGrade ? test.passingGrade < result.grade ? i18n.__("passed") : i18n.__("failed") : "",
            userId: course.courseInstructor,
            isInstructorRecieving: true,
            url: docUrl,
            condition: pushCondition,
        }
        await pushNotify(notificationOptions)
        //email instructor
        await sendEmailToOneUser({
            userId: course.courseInstructor,
            course,
            subject: "workSubmittedSubject",
            content: "workSubmitted",
            student,
            condition: emailCondition,
            userType: "instructor",
            test,
            buttonText: "viewTest",
            buttonUrl: docUrl,
        });
    }

    // }
    if (req.studentIsAuth) {
        io.getIO().emit("updateStudents", {
            userType: "instructor",
            userId: course.courseInstructor,
            fetchNotifications: true,
        });
    }
    return "test submitted successfully!";
}