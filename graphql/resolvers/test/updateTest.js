const Test = require("../../../models/test");
const Notification = require("../../../models/notification");
const Course = require("../../../models/course");
const Result = require("../../../models/result");
const Instructor = require("../../../models/instructor");
const Configuration = require("../../../models/configuration");
const io = require("../../../socket");
const { validateTest } = require("./validate");
const xss = require("xss");
const { noHtmlTags, textEditorWhitelist } = require("../validation/xssWhitelist");
const moment = require("moment");
const { sendEmailsToStudents } = require("../../../util/email-students");
const { pushNotify } = require("../../../util/pushNotification");

module.exports = async function (
    {
        testInput,
        multipleChoiceQuestionsInput,
        essayQuestionsInput,
        speakingQuestionsInput,
        fillBlankQuestionsInput,
    },
    req
) {
    if (!req.instructorIsAuth) {
        const error = new Error("Not authenticated!");
        error.code = 401;
        throw error;
    }
    const instructor = await Instructor.findById(req.userId);
    if (!instructor) {
        const error = new Error("No instructor found");
        error.code = 401;
        throw error;
    }
    const course = await Course.findById(testInput.course);
    if (!course) {
        const error = new Error("No associated course found");
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

    //block the request if a student has or is already
    //taking the test/assignment
    const results = await Result.find({ test: testInput.testId });

    if (results.length > 0) {
        const error = new Error(
            "Can't edit the test because one or more students has already taken or started to take the test."
        );
        error.code = 403;
        throw error;
    }

    if (
        !(instructor.coursesTeaching || []).includes(testInput.course.toString())
    ) {
        const error = new Error("Not authorized!");
        error.code = 403;
        throw error;
    }
    const errors = await validateTest(
        testInput,
        multipleChoiceQuestionsInput,
        essayQuestionsInput,
        speakingQuestionsInput,
        fillBlankQuestionsInput,
        req
    );
    if (errors.length > 0) {
        const error = new Error("Invalid input.");
        error.data = errors;
        error.code = 422;
        throw error;
    }
    const test = await Test.findById(testInput.testId);
    if (!test) {
        const error = new Error("No test found");
        error.code = 401;
        throw error;
    }
    const sectionWeights = {
        mcSection: testInput.testSections.includes("mc")
            ? testInput.sectionWeights[0]
            : null,
        essaySection: testInput.testSections.includes("essay")
            ? testInput.sectionWeights[1]
            : null,
        speakingSection: testInput.testSections.includes("speaking")
            ? testInput.sectionWeights[2]
            : null,
        fillBlankSection: testInput.testSections.includes("fillblanks")
            ? testInput.sectionWeights[3]
            : null,
    };

    const sanitizedMcInput = (multipleChoiceQuestionsInput || []).map((q) => {
        return {
            ...q,
            question: xss(q.question, textEditorWhitelist),
            solution: xss(q.solution, noHtmlTags),
            answerOptions: q.answerOptions.map((option) => xss(option, noHtmlTags)),
        };
    });
    const sanitizedEssayInput = (essayQuestionsInput || []).map((q) => {
        return {
            ...q,
            question: xss(q.question, textEditorWhitelist),
            solution: xss(q.solution, noHtmlTags),
        };
    });
    const sanitizedSpeakingInput = (speakingQuestionsInput || []).map((q) => {
        return {
            ...q,
            question: xss(q.question, textEditorWhitelist),
            questionAudio: xss(q.questionAudio, noHtmlTags),
            audio: xss(q.audio, noHtmlTags),
        };
    });
    const sanitizedBlanks = ((fillBlankQuestionsInput || {}).blanks || []).map(
        (blank) => {
            return {
                ...blank,
                audio: xss(blank.audio, noHtmlTags),
                correctAnswer: xss(blank.correctAnswer, noHtmlTags),
                incorrectAnswers: (blank.incorrectAnswers || []).map((option) =>
                    xss(option, noHtmlTags)
                ),
                selectableAnswer: blank.selectableAnswer,
            };
        }
    );
    const sanitizedReadingMaterials = (testInput.readingMaterials || []).map(
        (material) => {
            return {
                ...material,
                content: xss(
                    material.content,
                    material.fileUpload ? noHtmlTags : textEditorWhitelist
                ),
            };
        }
    );
    const sanitizedAudioMaterials = (testInput.audioMaterials || []).map(
        (material) => {
            return {
                ...material,
                audio: xss(material.audio, noHtmlTags),
            };
        }
    );
    const sanitizedVideoMaterials = (testInput.videoMaterials || []).map(
        (material) => {
            return {
                ...material,
                video: xss(material.video, noHtmlTags),
            };
        }
    );

    const fillBlankQuestionSections = {
        text: fillBlankQuestionsInput.fillBlankContent,
        blanks: sanitizedBlanks,
    };
    let notification;

    const closeDateTS = new Date(
        (testInput.dueDate || "").toString()
    ).getTime();
    const readableCloseDate = moment(parseInt(closeDateTS)).format(
        "dddd, MMMM Do YYYY, HH:mm"
    );
    const availableOnDateTS = new Date(
        (testInput.availableOnDate || "").toString()
    ).getTime();
    const readableAvailableOnDate = moment(parseInt(availableOnDateTS)).format(
        "dddd, MMMM Do YYYY, HH:mm"
    );

    const content = [];
    let testPostedContent;
    if (!test.published)
        testPostedContent = `A new ${test.assignment ? "assignment" : "test"
            } was posted`;

    if (
        test.published &&
        (new Date(testInput.dueDate).getTime() || "").toString() !==
        (new Date(test.dueDate).getTime() || "").toString()
    ) {
        if (testInput.dueDate) {
            content.push("changeWorkDueDate");
        } else {
            content.push("removeWorkDueDate");
        }
    }

    if (
        test.published &&
        (new Date(testInput.availableOnDate).getTime() || "").toString() !==
        (new Date(test.availableOnDate).getTime() || "").toString()
    ) {
        if (testInput.availableOnDate) {
            content.push("changeWorkAvailableOnDate");
        } else {
            content.push("removeWorkAvailableOnDate");
        }
    }

    if (
        test.published &&
        !testInput.allowLateSubmission &&
        (testInput.allowLateSubmission || "").toString() !==
        (test.allowLateSubmission || "").toString() &&
        testInput.dueDate
    )
        content.push(`assignmentLateSubmissionRemoved`);
    if (
        test.published &&
        testInput.allowLateSubmission &&
        (testInput.allowLateSubmission || "").toString() !==
        (test.allowLateSubmission || "").toString()
    )
        content.push("assignmentLateSubmissionAllowed");

    if (
        test.published &&
        testInput.allowLateSubmission &&
        test.allowLateSubmission &&
        (testInput.lateDaysAllowed || "").toString() !==
        (test.lateDaysAllowed || "").toString()
    )
        content.push("assignmentMaxLateDaysChanged");
    if (
        test.published &&
        testInput.allowLateSubmission &&
        test.allowLateSubmission &&
        (testInput.latePenalty || "").toString() !==
        (test.latePenalty || "").toString()
    )
        content.push("assignmentDailyPenaltyChanged");

    const isSendNotifications = (instructorConfig.isSendTestNotifications && !testInput.assignment) || (instructorConfig.isSendAssignmentNotifications && testInput.assignment)
    if ((content.length > 0 || testPostedContent) && testInput.published && isSendNotifications) {
        //if test is switched to published, notify students
        await Notification.findOneAndDelete({
            documentId: test._id,
            documentType: test.assignment ? "assignment" : "test",
        });

        notification = new Notification({
            toUserType: "student",
            fromUser: req.userId,
            content: testPostedContent ? ["newWorkPosted"] : content,
            documentType: test.assignment ? "assignment" : "test",
            documentId: test._id,
            course: testInput.course,
        });
    }

    test.testName = xss(testInput.testName, noHtmlTags);
    test.published = testInput.published;
    test.course = testInput.course;
    test.instructor = testInput.instructor;
    test.testType = xss(testInput.testType, noHtmlTags);
    test.weight = testInput.testWeight;
    test.timer = testInput.timer;
    test.passingGrade = testInput.assignment ? null : testInput.passingGrade;
    test.passingRequired = testInput.assignment
        ? null
        : testInput.passingRequired;
    test.availableOnDate = testInput.availableOnDate;
    test.dueDate = testInput.dueDate;
    test.gradeReleaseDate = testInput.gradeReleaseDate;
    test.isGradeIncluded = testInput.isGradeIncluded;
    test.allowLateSubmission = testInput.allowLateSubmission;
    test.lateDaysAllowed = testInput.lateDaysAllowed;
    test.latePenalty = testInput.latePenalty;
    test.sectionWeights = sectionWeights;

    test.readingMaterials = sanitizedReadingMaterials;
    test.audioMaterials = sanitizedAudioMaterials;
    test.videoMaterials = sanitizedVideoMaterials;

    test.multipleChoiceQuestions = testInput.testSections.includes("mc")
        ? sanitizedMcInput
        : null;
    test.essayQuestions = testInput.testSections.includes("essay")
        ? sanitizedEssayInput
        : null;
    test.speakingQuestions = testInput.testSections.includes("speaking")
        ? sanitizedSpeakingInput
        : null;
    test.fillInBlanksQuestions = testInput.testSections.includes("fillblanks")
        ? fillBlankQuestionSections
        : null;
    test.assignment = testInput.assignment;
    test.blockedNotes = testInput.blockedNotes;
    test.notes = xss(testInput.notes, noHtmlTags);
    const updatedTest = await test.save();
    if ((testPostedContent || content.length > 0) && notification && isSendNotifications) {
        const result = await notification.save();
    }
    const isSendTestEmails = instructorConfig.isSendTestEmails;
    const isSendAssignmentEmails = instructorConfig.isSendAssignmentEmails;

    const isSendTestPushNotifications = instructorConfig.isSendTestPushNotifications;
    const isSendAssignmentPushNotifications = instructorConfig.isSendAssignmentPushNotifications;

    let subject = "workUpdatedSubject";
    const studentIdsEnrolled = course.studentsEnrollRequests.map((rq) => {
        if (rq.approved) {
            return rq.student;
        }
    });
    const docUrl = `student-panel/course/${test.course}/tests/confirm/${testInput.testId}`
    const emailsCondition = updatedTest.assignment ? "isAssignmentEmails" : "isTestEmails";
    const pushCondition = updatedTest.assignment ? "isAssignmentPushNotifications" : "isTestPushNotifications";
    //push notifications
    const notificationOptions = {
        multipleUsers: true,
        users: studentIdsEnrolled,
        content: testPostedContent ? "newWorkPosted" : "workUpdated",
        course: course,
        test: updatedTest,
        url: docUrl,
        condition: pushCondition,
    }
    if (testInput.published) {
        if (
            (isSendTestPushNotifications && !testInput.assignment) ||
            (isSendAssignmentPushNotifications && testInput.assignment)
        ) {
            await pushNotify(notificationOptions)
        }

        if (
            (isSendTestEmails && !testInput.assignment) ||
            (isSendAssignmentEmails && testInput.assignment)
        ) {
            await sendEmailsToStudents({
                studentIdsEnrolled,
                course,
                content: testPostedContent ? "newWorkPosted" : content.length > 0 ? content : "workUpdated",
                subject: testPostedContent ? "newWorkPosted" : subject,
                date: test.availableOnDate,
                dateSecondary: test.dueDate,
                test: updatedTest,
                condition: emailsCondition,
                buttonText: 'viewTest',
                buttonUrl: docUrl,
            });
        }

    }
    io.getIO().emit("updateCourses", {
        userType: "student",
        // _id:(notification||'')._id,
        // documentType:test.assignment ? 'assignment' : 'test',
    });

    return {
        ...updatedTest._doc,
        _id: updatedTest._id.toString(),
    };
}