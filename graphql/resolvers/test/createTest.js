const Test = require("../../../models/test");
const Notification = require("../../../models/notification");
const Course = require("../../../models/course");
const Instructor = require("../../../models/instructor");
const Configuration = require("../../../models/configuration");
const io = require("../../../socket");
const { validateTest } = require("./validate");
const xss = require("xss");
const {noHtmlTags,textEditorWhitelist} = require("../validation/xssWhitelist");
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
    const fillBlankQuestionSections = {
        text: xss(fillBlankQuestionsInput.fillBlankContent, textEditorWhitelist),
        blanks: sanitizedBlanks,
    };

    const test = new Test({
        _id: testInput.testId,
        testName: xss(testInput.testName, noHtmlTags),
        course: testInput.course,
        published: testInput.published,
        instructor: testInput.instructor,
        passingGrade: testInput.assignment ? null : testInput.passingGrade,
        passingRequired: testInput.assignment ? null : testInput.passingRequired,
        testType: xss(testInput.testType, noHtmlTags),
        weight: testInput.testWeight,
        timer: testInput.timer,
        isGradeIncluded: testInput.isGradeIncluded,
        gradeReleaseDate: testInput.gradeReleaseDate,
        availableOnDate: testInput.availableOnDate,
        dueDate: testInput.dueDate,
        notes: xss(testInput.notes, noHtmlTags),
        allowLateSubmission: testInput.allowLateSubmission,
        latePenalty: testInput.latePenalty,
        lateDaysAllowed: testInput.lateDaysAllowed,
        sectionWeights: sectionWeights,
        readingMaterials: sanitizedReadingMaterials,
        audioMaterials: sanitizedAudioMaterials,
        videoMaterials: sanitizedVideoMaterials,
        multipleChoiceQuestions: testInput.testSections.includes("mc")
            ? sanitizedMcInput
            : null,
        essayQuestions: testInput.testSections.includes("essay")
            ? sanitizedEssayInput
            : null,
        speakingQuestions: testInput.testSections.includes("speaking")
            ? sanitizedSpeakingInput
            : null,
        fillInBlanksQuestions: testInput.testSections.includes("fillblanks")
            ? fillBlankQuestionSections
            : null,
        assignment: testInput.assignment,
        blockedNotes: testInput.blockedNotes,
    });
    //function to add test to course model as a reference
    const createdTest = await test.save();
    course.tests.push(createdTest);
    await course.save();
    const isSendNotifications = (instructorConfig.isSendTestNotifications && !testInput.assignment) || (instructorConfig.isSendAssignmentNotifications && testInput.assignment)
    if (isSendNotifications) {
        if (testInput.published) {
            const notification = new Notification({
                toUserType: "student",
                fromUser: req.userId,
                content: ["newWorkPosted"],
                documentType: test.assignment ? "assignment" : "test",
                documentId: test._id,
                course: testInput.course,
            });
            await notification.save();
        }
    }

    const isSendTestEmails = instructorConfig.isSendTestEmails;
    const isSendAssignmentEmails = instructorConfig.isSendAssignmentEmails;

    const isSendTestPushNotifications = instructorConfig.isSendTestPushNotifications;
    const isSendAssignmentPushNotifications = instructorConfig.isSendAssignmentPushNotifications;

    if (testInput.published) {

        let content = "newWorkPosted";
        let subject = "newWorkPostedSubject";
        let date;
        const studentIdsEnrolled = course.studentsEnrollRequests.map((rq) => {
            if (rq.approved) {
                return rq.student;
            }
        });
        const url = `student-panel/course/${course._id}/tests/confirm/${testInput.testId}`;
        const emailsCondition = createdTest.assignment ? "isAssignmentEmails" : "isTestEmails";
        const pushCondition = createdTest.assignment ? "isAssignmentPushNotifications" : "isTestPushNotifications";
        //push notifications
        const notificationOptions = {
            multipleUsers: true,
            users: studentIdsEnrolled,
            content: 'newWorkPosted',
            course: course,
            test: createdTest,
            url: url,
            condition: pushCondition,
        };
        if (
            (isSendTestPushNotifications && !testInput.assignment) ||
            (isSendAssignmentPushNotifications && testInput.assignment)
        ) {
            await pushNotify(notificationOptions);
        }
        if (
            (isSendTestEmails && !testInput.assignment) ||
            (isSendAssignmentEmails && testInput.assignment)
        ) {
            await sendEmailsToStudents({
                studentIdsEnrolled,
                course,
                content,
                subject,
                date,
                test: createdTest,
                condition: emailsCondition,
                buttonText: 'viewTest',
                buttonUrl: url,
            });
        }
    }

    io.getIO().emit("updateCourses", {
        userType: "student",
        // _id:(newNotification||'')._id,
        // documentType:test.assignment ? 'assignment' : 'test',
    });
    return { ...createdTest._doc, _id: createdTest._id.toString() };
}