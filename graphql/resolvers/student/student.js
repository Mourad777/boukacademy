const bcrypt = require("bcryptjs");
const { validateSubmitTest } = require("./validate");
const Test = require("../../../models/test");
const Student = require("../../../models/student");
const Course = require("../../../models/course");
const Result = require("../../../models/result");
const Instructor = require("../../../models/instructor");
const Notification = require("../../../models/notification");
const Configuration = require("../../../models/configuration");
const io = require("../../../socket");
require("dotenv").config();
const xss = require("xss");
const {
  noHtmlTags,
  textEditorWhitelist,
} = require("../validation/xssWhitelist");
const { updateTestUrls } = require("../../../util/updateTestUrls");
const { updateUrls } = require("../../../util/getUpdatedUrls");
const { updateResultUrls } = require("../../../util/updateResultUrls");
const { getObjectUrl } = require("../../../s3");
const { sendEmailToOneUser } = require("../../../util/email-user");

module.exports = {
  testResults: async function ({ }, req) {
    if (!req.studentIsAuth) {
      const error = new Error("No student logged in");
      error.code = 401;
      throw error;
    }

    const studentId = req.userId;
    const student = await Student.findOne({ _id: studentId });
    if (!student) {
      const error = new Error("No student found");
      error.code = 401;
      throw error;
    }

    if (studentId.toString() !== req.userId.toString()) {
      const error = new Error("Not authorized!");
      error.code = 403;
      throw error;
    }
    const results = await Result.find({ student: studentId });

    const tests = await Test.find();
    const fixedTestResults = await Promise.all(
      (results || []).map(async (result) => {
        //check if grades can be released according to the date
        const foundTest = tests.find(
          (test) => test._id.toString() === result.test.toString()
        );
        const gradeReleaseDate = new Date(
          (foundTest.gradeReleaseDate || "").toString()
        ).getTime();
        const gradeCanBeReleased =
          Date.now() > gradeReleaseDate || !gradeReleaseDate;
        if (!gradeCanBeReleased) {
          return {
            ...result._doc,
            multiplechoiceSection: {},
            essaySection: {},
            speakingSection: {},
            fillInBlanksSection: {},
            grade: null,
            gradeAdjustmentExplanation: null,
            latePenalty: null,
          };
        } else {
          return await updateResultUrls(result);
        }
      })
    );
    return {
      testResults: fixedTestResults,
      testInSession: student.testInSession,
      assignmentsInSession: student.assignmentsInSession,
    };
  },

  fetchTest: async function ({ testId, password }, req) {
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
      !((foundTestResult || {}).closed === true)
    ) {
      //case for closed test or assignment, no late submission allowed
      const error = new Error("Test or assignment past due");
      error.code = 500;
      throw error;
    }
    if (
      isPastDue &&
      test.allowLateSubmission &&
      !((foundTestResult || {}).closed === true)
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
        courseId: test.course,
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
  },

  submitTest: async function (
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

    const isSendTestEmails = instructorConfig.isSendTestEmails;
    const isSendAssignmentEmails = instructorConfig.isSendAssignmentEmails;

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
        await Notification.findOneAndDelete({
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
          workGradedSubject = "workGradedSubject";
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
      if (content) await notification.save();
      //update test class average
      const allResults = await Result.find({
        test: test._id,
        graded: true,
        closed: true,
      });
      const gradeSum = allResults.reduce((prev, curr) => prev + curr.grade, 0);
      const classAverage = parseFloat(
        (gradeSum / allResults.length).toFixed(2)
      );
      test.classAverage = classAverage;
      if (graded) await test.save();
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
          student,
          condition: test.assignment ? "isAssignmentEmails" : "isTestEmails",
          userType: "student",
          test,
          grade,
          passed:
            (test.passingGrade && test.passingGrade <= grade),
        });
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
    if (testClosed) await notification.save();
    // if (
    //   ((isSendTestEmails && !test.assignment) ||
    //     (isSendAssignmentEmails && test.assignment)) &&
    //   req.studentIsAuth
    // ) {
    if (testClosed) {
      await sendEmailToOneUser({
        userId: course.courseInstructor,
        course,
        subject: "workSubmittedSubject",
        content: "workSubmitted",
        student,
        condition: test.assignment
          ? "isAssignmentEmails"
          : "isTestEmails",
        userType: "instructor",
        test,
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
  },

  closeTest: async function ({ test, student }, req) {
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
    if (!result) {
      const result = new Result({
        student: student,
        course: instructorTest.course,
        graded: false,
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
      await result.save();
      io.getIO().emit("mainMenu", {
        userId: student,
        testId: test,
        action: "closeTest",
        message: "The instructor closed the test",
      });

      return result;
    }
    //testresults
  },

  students: async function ({ courseId }, req) {
    //give different student info depending
    //on whether the instructor is logged in
    //or student is logged in
    //if student logged in only give info on
    //student firstname last name and id, hide
    //everything else
    if (!req.instructorIsAuth && !req.studentIsAuth) {
      const error = new Error("No instructor or student logged in!");
      error.code = 401;
      throw error;
    }
    const students = await Student.find({ coursesEnrolled: courseId }).populate(
      "testResults"
    );

    if (req.studentIsAuth) {
      const fixedStudents = await Promise.all(
        students
          .map(async (student) => {
            if (!student.coursesEnrolled.includes(courseId.toString()))
              return null;
            return {
              _id: student._id.toString(),
              firstName: student.firstName,
              lastName: student.lastName,
              profilePicture: await getObjectUrl(student.profilePicture),
              lastLogin: null,
            };
          })
          .filter((item) => item)
      ); //filter out null items
      return fixedStudents;
    }
    if (req.instructorIsAuth) {
      const instructor = await Instructor.findById(req.userId);
      if (!instructor) {
        const error = new Error("no instructor found");
        error.code = 401;
        throw error;
      }
      const fixedStudents = await Promise.all(
        students.map(async (student) => {
          const fixedTestResults = student.testResults.map(
            async (result) => await updateResultUrls(result)
          );
          const documents = await Promise.all(
            student.documents.map(async (d) => {
              return {
                documentType: d.documentType,
                document: await getObjectUrl(d.document),
              };
            })
          );
          return {
            ...student._doc,
            _id: student._id.toString(),
            testResults: fixedTestResults,
            profilePicture: await getObjectUrl(student.profilePicture),
            documents,
          };
        })
      );
      return fixedStudents;
    }
  },
};
