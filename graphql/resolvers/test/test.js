const { deleteFiles, emptyS3Directory } = require("../../../s3");
const { getKeysFromString } = require("../../../util/extractURL");
const Test = require("../../../models/test");
const Notification = require("../../../models/notification");
const Course = require("../../../models/course");
const Category = require("../../../models/category");
const Student = require("../../../models/student");
const Question = require("../../../models/question");
const Result = require("../../../models/result");
const Instructor = require("../../../models/instructor");
const Configuration = require("../../../models/configuration");
const io = require("../../../socket");
const { validateTest } = require("./validate");
const xss = require("xss");
const {
  noHtmlTags,
  textEditorWhitelist,
} = require("../validation/xssWhitelist");
const moment = require("moment");
const { sendEmailsToStudents } = require("../../../util/email-students");
const { sendEmailToOneUser } = require("../../../util/email-user");
const { updateClassAverage } = require("../../../util/updateClassAverage");
const { pushNotify } = require("../../../util/pushNotification");
const { getQuestionsUrls } = require("./util/getQuestionsUrls");
const { getTestUrls } = require("../question/util/getTestUrls");

module.exports = {
  createTest: async function (
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
  },

  updateTest: async function (
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
  },

  deleteTest: async function ({ id }, req) {
    if (!req.instructorIsAuth) {
      const error = new Error("Not authenticated!");
      error.code = 401;
      throw error;
    }
    const test = await Test.findById(id);
    if (!test) {
      const error = new Error("No test found");
      error.code = 401;
      throw error;
    }
    const instructor = await Instructor.findById(req.userId);
    if (!instructor) {
      const error = new Error("No instructor found");
      error.code = 401;
      throw error;
    }
    if (!(instructor.coursesTeaching || []).includes(test.course.toString())) {
      const error = new Error("Not authorized!");
      error.code = 403;
      throw error;
    }
    const course = await Course.findById(test.course);
    if (!course) {
      const error = new Error("No course found");
      error.code = 401;
      throw error;
    }
    const categories = await Category.findOne({ course: test.course });
    const questions = await Question.find();
    const tests = await Test.find();
    const students = await Student.find();
    const results = await Result.find({ test: test._id });

    if (!test.assignment && categories) {
      categories.modules.forEach((module) => {
        module.tests.pull(id);
        module.subjects.forEach((subject) => {
          subject.tests.pull(id);
          subject.topics.forEach((topic) => {
            topic.tests.pull(id);
          });
        });
      });
    }

    if (test.assignment && categories) {
      categories.modules.forEach((module) => {
        module.assignments.pull(id);
        module.subjects.forEach((subject) => {
          subject.assignments.pull(id);
          subject.topics.forEach((topic) => {
            topic.assignments.pull(id);
          });
        });
      });
    }

    //DELETE FILES ASSOCIATED WITH TEST
    const filesToDelete = [];
    const addItemsToDeleteList = (items) => {
      items.forEach((item) => {
        if (item) filesToDelete.push(item);
      });
    };
    //delete test reading materials
    const readingMaterials = test.readingMaterials;
    readingMaterials.forEach((item) => {
      if (item.fileUpload && item.content) {
        //delete item.content
        addItemsToDeleteList([item.content]);
      }
      if (!item.fileUpload && item.content) {
        const urls = getKeysFromString(item.content);
        addItemsToDeleteList(urls);
      }
    });
    //delete test audio materials
    const audioMaterials = (test.audioMaterials || []).map((item) => {
      if (item.audio) return item.audio;
    });
    addItemsToDeleteList(audioMaterials);
    //delete test video materials
    const videoMaterials = (test.videoMaterials || []).map((item) => {
      if (item.video) return item.video;
    });
    addItemsToDeleteList(videoMaterials);

    if (test.sectionWeights.mcSection) {
      const imagesStrings = test.multipleChoiceQuestions.map(
        (item) => item.question
      );
      const imageUrls = getKeysFromString(imagesStrings);
      addItemsToDeleteList(imageUrls);
    }
    if (test.sectionWeights.essaySection) {
      const imagesStrings = test.essayQuestions.map((item) => item.question);
      const imageUrls = getKeysFromString(imagesStrings);
      addItemsToDeleteList(imageUrls);
    }
    if (test.sectionWeights.speakingSection) {
      const imagesStrings = test.speakingQuestions.map((item) => item.question);
      const imageUrls = getKeysFromString(imagesStrings);
      addItemsToDeleteList(imageUrls);
      const audioQuestions = test.speakingQuestions.map(
        (item) => item.questionAudio
      );
      addItemsToDeleteList(audioQuestions);
      const audioAnswers = test.speakingQuestions.map((item) => item.audio);
      addItemsToDeleteList(audioAnswers);
    }
    if (test.sectionWeights.fillBlankSection) {
      const imagesString = test.fillInBlanksQuestions.text;
      const imageUrls = getKeysFromString(imagesString);
      addItemsToDeleteList(imageUrls);
      const audio = test.fillInBlanksQuestions.blanks.map((item) => item.audio);
      addItemsToDeleteList(audio);
    }

    results.forEach((result) => {
      //GET ESSAY SECTION FILES
      if (result.essaySection.answers.length > 0) {
        //students answers
        const studentImagesStrings = result.essaySection.answers.map(
          (item) => item.answer
        );
        const answerImageUrls = getKeysFromString(studentImagesStrings);
        addItemsToDeleteList(answerImageUrls);
        //instructors corrections
        const instructorImagesStrings = result.essaySection.answers.map(
          (item) => item.instructorCorrection
        );
        const correctionImageUrls = getKeysFromString(instructorImagesStrings);
        const filteredCorrectionImageUrls = correctionImageUrls.filter(
          (item) => !answerImageUrls.includes(item)
        ); //eliminate duplicates between student answer and instructors corrections
        addItemsToDeleteList(filteredCorrectionImageUrls);
      }
      //GET SPEAKING SECTION FILES
      if (result.speakingSection.answers.length > 0) {
        //students answers
        const studentAudio = result.speakingSection.answers.map(
          (item) => item.answer
        );
        addItemsToDeleteList(studentAudio);
        //instructors corrections
        const instructorAudio = result.speakingSection.answers.map(
          (item) => item.feedbackAudio
        );
        addItemsToDeleteList(instructorAudio);
      }
    });

    const studentIdsToUpdate =
      (results || []).map((result) => result.student.toString()) || [];

    const resultsToPull = (results || []).map((item) => item._id) || [];

    const assignmentSessionIdsToDelete = [];
    (students || []).forEach((student) => {
      (student.assignmentsInSession || []).forEach((session) => {
        if (session.assignment.toString() === id.toString()) {
          assignmentSessionIdsToDelete.push({ _id: session._id });
        }
      });
    });
    const areAssignmentsInSessionToDelete =
      assignmentSessionIdsToDelete.length > 0;

    //CHECK TO SEE IF THE FILES ARENT BEING USED IN THE QUESTION MODEL
    const otherTests = tests.filter(t => t._id.toString() !== id.toString());
    const filesToNotDelete = [...getQuestionsUrls(questions), ...getTestUrls(otherTests)];

    const filesToDeleteFiltered = filesToDelete
      .filter((item) => {
        if (!filesToNotDelete.includes(item)) {
          return item;
        }
      })
      .filter((item) => item);
    const resultsDelete = (await Result.find({ test: id })) || [];
    const resultIds = resultsDelete.map((r) => r._id);
    await Student.updateMany(
      { _id: { $in: studentIdsToUpdate } },
      {
        $unset: { testInSession: { test: id } },
        $pull: areAssignmentsInSessionToDelete
          ? {
            assignmentsInSession: {
              $or: assignmentSessionIdsToDelete,
            },
          }
          : {},
        $pullAll: { testResults: resultsToPull },
      },
      { multi: true }
    );
    course.tests.pull(id);
    await course.save();
    await test.remove();
    await Result.deleteMany({ test: id });
    await Notification.deleteMany({ documentId: { $in: [...resultIds, id] } });
    if (categories) await categories.save();
    io.getIO().emit("updateCourses", {
      userType: "student",
    });

    io.getIO().emit("mainMenu", {
      userType: "student",
      testId: id,
      action: "deleteTest",
      message: "The test was deleted",
    });

    if (filesToDeleteFiltered.length > 0) deleteFiles(filesToDeleteFiltered);

    //I can't simply delete the test directory in s3 bc if a question from the question bank
    //is used in a test, than I delete the question from the question bank, the file directory
    //for the question will persist as expected bc the files are shared with the test, however
    //the problem comes when I delete the test by only specifying the test directory, since
    //the files are in the questions directory they won't be deleted even if the test and question
    //document has been removed
    return true;
  },

  resetTest: async function ({ testId, studentId, message }, req) {
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
  },
};
