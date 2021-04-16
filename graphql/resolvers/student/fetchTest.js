const bcrypt = require("bcryptjs");
const Test = require("../../../models/test");
const Student = require("../../../models/student");
const Course = require("../../../models/course");
const Result = require("../../../models/result");
const Instructor = require("../../../models/instructor");
const Notification = require("../../../models/notification");
const io = require("../../../socket");
require("dotenv").config();
const { updateTestUrls } = require("../../../util/updateTestUrls");
const { updateUrls } = require("../../../util/getUpdatedUrls");
const { updateResultUrls } = require("../../../util/updateResultUrls");
const { getObjectUrl } = require("../../../s3");

module.exports = async function ({ testId, password }, req) {
    //resolver called when:
    //starting a test or assignment
    //continuing test or assignment
    //fetching test to be reviewed
    if (!req.studentIsAuth && !req.instructorIsAuth) {
        const error = new Error("Neither student nor instructor authenticated");
        error.code = 401;
        throw error;
    }
    const student = await Student.findOne({ _id: req.userId });
    if (!student && req.studentIsAuth) {
        const error = new Error("No student found");
        error.code = 401;
        throw error;
    }
    const instructor = await Instructor.findOne({ _id: req.userId });
    if (!instructor && req.instructorIsAuth) {
        const error = new Error("No instructor found");
        error.code = 401;
        throw error;
    }
    const test = await Test.findOne({ _id: testId });
    if (!test) {
        const error = new Error("Test not found");
        error.code = 401;
        throw error;
    }
    const course = await Course.findById(test.course);
    if (!course.courseActive && req.studentIsAuth) {
        const error = new Error("Student not authorized. Course not active.");
        error.code = 403;
        throw error;
    }
    //if instructor verify that its his or her course and no one elses course
    if (
        !((instructor || {}).coursesTeaching || []).includes(
            test.course.toString()
        ) &&
        req.instructorIsAuth
    ) {
        const error = new Error("Instructor not authorized!");
        error.code = 403;
        throw error;
    }
    if (req.instructorIsAuth) {
        //if the instructor is requesting the test/assignment, that
        //means that the test will be used for editing
        //block the request if a student has or is already
        //taking the test/assignment
        const results = await Result.find({ test: testId });

        if (results.length > 0) {
            const error = new Error(
                "Can't edit the test because one or more students has already taken or started to take the test."
            );
            error.code = 403;
            throw error;
        }
        const adjustedTest = await updateTestUrls(test);
        return { test: adjustedTest };
    }

    //CASE FOR STUDENT FETCHING TEST TO START IT OR REVIEW IT AFTER ITS BEEN GRADED
    if (!student.coursesEnrolled.includes(test.course.toString())) {
        const error = new Error(
            "Student not authorized. Not enrolled in the course!"
        );
        error.code = 403;
        throw error;
    }
    const studentId = req.userId;
    const foundTestResult = await Result.findOne({
        test: testId,
        student: studentId,
    });
    const dueDate = new Date((test.dueDate || "").toString()).getTime();
    const availableOnDate = new Date(
        (test.availableOnDate || "").toString()
    ).getTime();
    if (availableOnDate > Date.now()) {
        const error = new Error("The test or assignment is not available yet");
        error.code = 403;
        throw error;
    }
    if ((dueDate < Date.now()) && !test.assignment &&
        !((foundTestResult || {}).graded === true)) {
        const error = new Error("The test is past due");
        error.code = 403;
        throw error;
    }
    if (((dueDate + (test.lateDaysAllowed * 86400000)) < Date.now()) && test.assignment &&
        !((foundTestResult || {}).graded === true)) {
        const error = new Error("The assignment is past due");
        error.code = 403;
        throw error;
    }
    const isMcSection = test.sectionWeights.mcSection;
    const isEssaySection = test.sectionWeights.essaySection;
    const isSpeakingSection = test.sectionWeights.speakingSection;
    const isFillBlankSection = test.sectionWeights.fillBlankSection;
    const sectionGrades = [
        "multipleChoiceQuestions",
        "essayQuestions",
        "speakingQuestions",
        "fillInBlanksQuestions",
    ].map((section, index) => {
        let answers = [];
        if (index !== 3) {
            answers = (test[section] || []).map((answer, index) => {
                return {
                    marks: 0,
                    questionNumber: index + 1,
                };
            });
        } else {
            answers = ((test[section] || {}).blanks || []).map((answer, index) => {
                return {
                    marks: 0,
                    questionNumber: index + 1,
                };
            });
        }
        return {
            grade: 0,
            answers: answers,
        };
    });
    //workGradedLaterDate
    //check if there is a test in session and if its past due
    //if thats the case make testInSession null
    //close test
    //this happens when student logsout before the timer expires or before the due date is reached
    //and does not log back in before that time to let the test submit
    const isPastDue =
        new Date((student.testInSession || {}).endTime).getTime() + 15000 <
        Date.now(); //give extra 15 seconds for slow networks
    if (student.testInSession && isPastDue) {
        const notification = new Notification({
            toUserType: "unique",
            toSpecificUser: course.courseInstructor,
            fromUser: req.userId,
            content: ["workSubmitted"],
            documentType: test.assignment ? "assignmentSubmitted" : "testSubmitted",
            documentId: test._id,
            course: test.course,
        });

        foundTestResult.closed = true;
        await foundTestResult.save();
        student.testInSession = null;
        await student.save();
        await notification.save();
        io.getIO().emit("updateStudents", {
            userType: "instructor",
            userId: course.courseInstructor,
        });
        const error = new Error("retrieveTestFailDatePassed");
        error.code = 403;
        throw error;
    }
    //check for test or assignment close date
    if (
        isPastDue &&
        !test.allowLateSubmission &&
        !((foundTestResult || {}).closed === true) &&
        !((foundTestResult || {}).graded === true)
    ) {
        //case for closed test or assignment, no late submission allowed
        const error = new Error("Test or assignment past due");
        error.code = 500;
        throw error;
    }
    if (
        isPastDue &&
        test.allowLateSubmission &&
        !((foundTestResult || {}).closed === true) &&
        !((foundTestResult || {}).graded === true)
    ) {
        //case for closed assignment but allows late submission of a specific amount of days
        //1 day = 86400000
        const daysLate = Math.ceil((Date.now() - dueDate) / 86400000);
        const exceededLateDays = daysLate > test.lateDaysAllowed;
        if (exceededLateDays) {
            const error = new Error(
                "Exceeded late days allowed, assignment can no longer be started"
            );
            error.code = 500;
            throw error;
        }
    }
    const startDate = new Date(
        (test.availableOnDate || "").toString()
    ).getTime();
    if (Date.now() < startDate)
        throw new Error("test or assignment not available yet");
    //check to see if the test has been graded
    //do not start the test if test has been graded or closed
    if (foundTestResult) {
        const testGraded = foundTestResult.graded;
        const testClosed = foundTestResult.closed;
        if (testClosed && testGraded) {
            //Case for returning a graded test to student
            return {
                test: await updateTestUrls(test),
                result: await updateResultUrls(foundTestResult),
            };
        }
        //redundant check: if test is closed no reason to start test
        if (testClosed) {
            return "The test has been submitted and cannot not be modified";
        }
    }

    const fixedMcqs = await Promise.all(
        (test.multipleChoiceQuestions || []).map(async (mcq) => {
            //hide the answer explanation and correct answers
            return {
                ...mcq._doc,
                question: await updateUrls(mcq.question),
                solution: "",
                correctAnswers: [],
            };
        })
    );
    const fixedEssayQuestions = await Promise.all(
        (test.essayQuestions || []).map(async (essayQ) => {
            //hide the answer explanation
            return {
                ...essayQ._doc,
                question: await updateUrls(essayQ.question),
                solution: "",
            };
        })
    );
    const fixedSpeakingQuestions = await Promise.all(
        (test.speakingQuestions || []).map(async (speakingQ) => {
            //hide the audio answer
            return {
                ...speakingQ._doc,
                question: speakingQ.question
                    ? await updateUrls(speakingQ.question)
                    : "",
                questionAudio: speakingQ.questionAudio
                    ? await getObjectUrl(speakingQ.questionAudio)
                    : "",
                audio: "",
            };
        })
    );

    //hide the blank
    const fixedFillBlankText = (
        (test.fillInBlanksQuestions || {}).text || ""
    ).replace(/<mark [^>]+>(.*?)<\/mark>/g, "-BLANK-");
    const fixedFillInBlanksQuestions = await Promise.all(
        ((test.fillInBlanksQuestions || {}).blanks || []).map(async (blank) => {
            let answerOptions = [];
            let numIncAns = 0;
            if (blank.selectableAnswer) {
                (blank.incorrectAnswers || []).forEach((answer) => {
                    if (answer) numIncAns += 1;
                });
                answerOptions = blank.incorrectAnswers;
                const insert = (arr, index, newItem) => [
                    ...arr.slice(0, index),
                    newItem,
                    ...arr.slice(index),
                ];
                let randomIndex = Math.floor(Math.random() * (numIncAns + 1));
                // if(numIncAns === 1) randomIndex = Math.random() > .5 ? 0 : 1 //special case need is only 1 incorrect answer,
                //or else the random index is always 0
                //merge the correct answer with the incorrect answers at a random index
                //into a new array - answerOptions
                //the random index is based on the number of incorrect answers
                answerOptions = insert(
                    answerOptions,
                    randomIndex,
                    blank.correctAnswer
                );
            }
            //hide incorrect and correct answers
            return {
                ...blank._doc,
                correctAnswer: "",
                answerOptions,
                incorrectAnswers: [],
                audio: blank.audio ? await getObjectUrl(blank.audio) : "",
            };
        })
    );

    const testStartTime = Date.now();
    const testEndTime = Date.now() + test.timer * 1000 * 60;
    const testCloseDate = new Date((test.dueDate || "").toString()).getTime();
    const result = new Result({
        student: studentId,
        course: test.course,
        test: testId,
        grade: 0,
        graded: false,
        isExcused: false,
        gradeOverride: false,
        gradingInProgress: false,
        closed: false,
        multiplechoiceSection: isMcSection ? sectionGrades[0] : null,
        essaySection: isEssaySection ? sectionGrades[1] : null,
        speakingSection: isSpeakingSection ? sectionGrades[2] : null,
        fillInBlanksSection: isFillBlankSection ? sectionGrades[3] : null,
        startedOn: Date.now(),
    });
    let createdResult;
    if (!student.testInSession.test && !test.assignment) {
        //if the test has not been attempted yet
        //verify password if test and not assignment

        const admin = await Instructor.findOne({ admin: true }).populate(
            "configuration"
        );

        const adminSettings = admin._doc.configuration;
        if (adminSettings.isPasswordRequiredStartTest && !student.password) {
            const error = new Error("You must create a login password before starting the test");
            error.code = 401;
            throw error;
        }
        if (adminSettings.isPasswordRequiredStartTest) {
            //if admin requires password check
            const isEqual = await bcrypt.compare(password, student.password);
            if (!isEqual && !test.assignment) {
                const error = new Error("wrongPassword");
                error.code = 401;
                throw error;
            }
        }

        createdResult = await result.save();
        student.testResults.push(createdResult._id);
        student.testInSession.test = testId;
        student.testInSession.startTime = testStartTime;
        if (test.timer && test.dueDate) {
            student.testInSession.endTime =
                testCloseDate < testEndTime ? testCloseDate : testEndTime;
        }
        if (test.dueDate && !test.timer) {
            student.testInSession.endTime = testCloseDate;
        }
        if (test.timer && !test.dueDate) {
            student.testInSession.endTime = testEndTime;
        }
        //if the due date is sooner than Date.now() + timer use the due date
        await student.save();

        io.getIO().emit("updateStudents", {
            userType: "instructor",
            // courseId: test.course,
            userId: course.courseInstructor,
        });
    }

    const foundAssignment = student.assignmentsInSession.find(
        (item) => item.assignment.toString() === testId.toString()
    );

    if (!foundAssignment && test.assignment) {
        //if the assignment has not been attempted yet
        const assignmentInSession = {
            assignment: testId,
            startTime: testStartTime,
        };
        createdResult = await result.save();
        student.testResults.push(createdResult._id);
        student.assignmentsInSession.push(assignmentInSession);
        await student.save();
    }

    //notify the instructor in real-time that the test has started
    const fixedTest = await updateTestUrls(test);
    //giving the student a test with hidden answers
    if (test.assignment) {
        io.getIO().emit("updateStudents", {
            userType: "instructor",
            // courseId: test.course,
            userId: course.courseInstructor,
        });
    }

    return {
        test: {
            ...fixedTest,
            _id: test._id.toString(),
            multipleChoiceQuestions: fixedMcqs,
            essayQuestions: fixedEssayQuestions,
            speakingQuestions: fixedSpeakingQuestions,
            fillInBlanksQuestions: {
                text: await updateUrls(fixedFillBlankText),
                blanks: fixedFillInBlanksQuestions,
            },
            startTime: student.testInSession.startTime,
            endTime: student.testInSession.endTime,
            course: test.course.toString(),
        },
        result: foundTestResult
            ? await updateResultUrls(foundTestResult)
            : createdResult,
    };
}