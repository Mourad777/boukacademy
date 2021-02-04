const Test = require("../../../models/test");
const Question = require("../../../models/question");
const Instructor = require("../../../models/instructor");
const io = require("../../../socket");
const { getKeysFromString } = require("../../../util/extractURL");
const { deleteFiles } = require("../../../s3");
const { validateQuestion } = require("./validate");
const xss = require("xss");
const { updateUrls } = require("../../../util/getUpdatedUrls");
const {
  noHtmlTags,
  textEditorWhitelist,
} = require("../validation/xssWhitelist");
const { getObjectUrl } = require("../../../s3");

module.exports = {
  createQuestion: async function (
    {
      questionInput,
      multipleChoiceQuestionInput,
      essayQuestionInput,
      speakingQuestionInput,
      fillBlankQuestionInput,
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
      !(instructor.coursesTeaching || []).includes(
        questionInput.course.toString()
      )
    ) {
      const error = new Error("Not authorized!");
      error.code = 403;
      throw error;
    }
    const errors = await validateQuestion(
      questionInput,
      multipleChoiceQuestionInput,
      essayQuestionInput,
      speakingQuestionInput,
      fillBlankQuestionInput,
      req
    );
    if (errors.length > 0) {
      const error = new Error("Invalid input.");
      error.data = errors;
      error.code = 422;
      throw error;
    }
    let questionText;
    let solution;
    if (questionInput.type === "mc") {
      questionText = multipleChoiceQuestionInput.question;
      solution = multipleChoiceQuestionInput.solution;
    }
    if (questionInput.type === "essay") {
      questionText = essayQuestionInput.question;
      solution = essayQuestionInput.solution;
    }
    if (questionInput.type === "speaking") {
      questionText = speakingQuestionInput.question;
      solution = speakingQuestionInput.solution;
    }
    if (questionInput.type === "fillInBlank") {
      questionText = fillBlankQuestionInput.fillBlankContent;
    }
    const sanitizedTags = (questionInput.tags || []).map((tag) =>
      xss(tag, noHtmlTags)
    );

    const sanitizedMcAnswerOptions = (
      multipleChoiceQuestionInput.answerOptions || []
    ).map((option) => xss(option, noHtmlTags));

    const sanitizedBlanks = ((fillBlankQuestionInput || {}).blanks || []).map(
      (blank) => {
        return {
          audio: xss(blank.audio, noHtmlTags),
          correctAnswer: xss(blank.correctAnswer, noHtmlTags),
          incorrectAnswers: (blank.incorrectAnswers || []).map((option) =>
            xss(option, noHtmlTags)
          ),
          selectableAnswer: blank.selectableAnswer,
        };
      }
    );

    const question = new Question({
      _id: questionInput.id,
      course: questionInput.course,
      type: xss(questionInput.type, noHtmlTags),
      question: xss(questionText, textEditorWhitelist),
      solution: xss(solution, noHtmlTags),
      language: xss(questionInput.language, noHtmlTags),
      tags: sanitizedTags,
      difficulty: xss(questionInput.difficulty, noHtmlTags),

      answerOptions:
        questionInput.type === "mc" ? sanitizedMcAnswerOptions : null,
      correctAnswers:
        questionInput.type === "mc"
          ? multipleChoiceQuestionInput.correctAnswers
          : null,

      questionAudio:
        questionInput.type === "speaking"
          ? xss(speakingQuestionInput.questionAudio, noHtmlTags)
          : null,
      audio:
        questionInput.type === "speaking"
          ? xss(speakingQuestionInput.audio, noHtmlTags)
          : null,

      blanks: questionInput.type === "fillInBlank" ? sanitizedBlanks : null,
    });

    const createdQuestion = await question.save();
    return { ...createdQuestion._doc, _id: createdQuestion._id.toString() };
  },

  questions: async function ({ courseId }, req) {
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
    if (!(instructor.coursesTeaching || []).includes(courseId.toString())) {
      const error = new Error("Not authorized!");
      error.code = 403;
      throw error;
    }
    const questions = await Question.find({ course: courseId });
    //check if user id matches found instructor id on course
    const fixedQuestions = await Promise.all(
      questions.map(async (question) => {
        if (question.type === "mc") {
          const fixedContent = await updateUrls(question.question);
          return {
            ...question._doc,
            mcQuestion: {
              question: fixedContent,
              solution: question.solution,
              correctAnswers: question.correctAnswers,
              answers: question.answerOptions,
            },
          };
        }

        if (question.type === "essay") {
          const fixedContent = await updateUrls(question.question);
          return {
            ...question._doc,
            essayQuestion: {
              question: fixedContent,
              solution: question.solution,
            },
          };
        }
        if (question.type === "speaking") {
          const updatedQuestionAudioUrl = await getObjectUrl(
            question.questionAudio
          );
          const updatedAnswerAudioUrl = await getObjectUrl(question.audio);
          const fixedContent = await updateUrls(question.question);
          return {
            ...question._doc,
            speakingQuestion: {
              question: fixedContent,
              audioQuestion: updatedQuestionAudioUrl,
              audio: updatedAnswerAudioUrl,
            },
          };
        }
        if (question.type === "fillInBlank") {
          const fixedContent = await updateUrls(question.question);
          const fixedBlanks = await Promise.all(
            question.blanks.map(async (blank) => {
              const fixedAudioUrl = await getObjectUrl(blank.audio);
              return {
                ...blank._doc,
                audio: fixedAudioUrl,
              };
            })
          );
          return {
            ...question._doc,
            fillBlankQuestions: {
              question: fixedContent,
              blanks: fixedBlanks,
            },
          };
        }
      })
    );
    return fixedQuestions;
  },

  updateQuestion: async function (
    {
      questionInput,
      multipleChoiceQuestionInput,
      essayQuestionInput,
      speakingQuestionInput,
      fillBlankQuestionInput,
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
      !(instructor.coursesTeaching || []).includes(
        questionInput.course.toString()
      )
    ) {
      const error = new Error("Not authorized!");
      error.code = 403;
      throw error;
    }
    const errors = await validateQuestion(
      questionInput,
      multipleChoiceQuestionInput,
      essayQuestionInput,
      speakingQuestionInput,
      fillBlankQuestionInput,
      req
    );
    if (errors.length > 0) {
      const error = new Error("Invalid input.");
      error.data = errors;
      error.code = 422;
      throw error;
    }
    const question = await Question.findById(questionInput.id);
    if (!question) {
      const error = new Error("No question found");
      error.code = 401;
      throw error;
    }

    const sanitizedTags = (questionInput.tags || []).map((tag) =>
      xss(tag, noHtmlTags)
    );
    const sanitizedMcAnswerOptions = (
      multipleChoiceQuestionInput.answerOptions || []
    ).map((option) => xss(option, noHtmlTags));

    const sanitizedBlanks = ((fillBlankQuestionInput || {}).blanks || []).map(
      (blank) => {
        return {
          audio: xss(blank.audio, noHtmlTags),
          correctAnswer: xss(blank.correctAnswer, noHtmlTags),
          incorrectAnswers: (blank.incorrectAnswers || []).map((option) =>
            xss(option, noHtmlTags)
          ),
          selectableAnswer: blank.selectableAnswer,
        };
      }
    );

    question.course = questionInput.course;
    question.type = xss(questionInput.type, noHtmlTags);
    question.difficulty = xss(questionInput.difficulty, noHtmlTags);
    question.tags = sanitizedTags;
    question.language = xss(questionInput.language, noHtmlTags);

    if (question.type === "mc") {
      question.question = xss(
        multipleChoiceQuestionInput.question,
        textEditorWhitelist
      );
      question.solution = xss(multipleChoiceQuestionInput.solution, noHtmlTags);
      question.answerOptions = sanitizedMcAnswerOptions;
      question.correctAnswers = multipleChoiceQuestionInput.correctAnswers;
    }

    if (question.type === "essay") {
      question.question = xss(essayQuestionInput.question, textEditorWhitelist);
      question.solution = xss(essayQuestionInput.solution, noHtmlTags);
    }

    if (question.type === "speaking") {
      question.question =
        speakingQuestionInput.questionAudio &&
        speakingQuestionInput.questionAudio !== ""
          ? ""
          : xss(speakingQuestionInput.question, textEditorWhitelist);
      question.questionAudio = xss(
        speakingQuestionInput.questionAudio,
        noHtmlTags
      );
      question.audio = xss(speakingQuestionInput.audio, noHtmlTags);
    }

    if (question.type === "fillInBlank") {
      question.question = xss(
        fillBlankQuestionInput.fillBlankContent,
        textEditorWhitelist
      );
      question.blanks = sanitizedBlanks;
    }

    await question.save();
    return;
  },

  deleteQuestion: async function ({ id }, req) {
    if (!req.instructorIsAuth) {
      const error = new Error("Not authenticated!");
      error.code = 401;
      throw error;
    }
    const question = await Question.findById(id);
    if (!question) {
      const error = new Error("No question found");
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
      !(instructor.coursesTeaching || []).includes(question.course.toString())
    ) {
      const error = new Error("Not authorized!");
      error.code = 403;
      throw error;
    }
    const tests = await Test.find();
    //DELETE FILES ASSOCIATED WITH QUESTION
    const filesToDelete = [];

    const addItemsToDeleteList = (keys) => {
      if (!keys || keys.length === 0) return;
      keys.forEach((key) => {
        if (key) filesToDelete.push(key);
      });
    };

    const questionString = question.question;
    const questionImageUrls = getKeysFromString(questionString);
    addItemsToDeleteList(questionImageUrls);

    if (question.type === "speaking") {
      const audioQuestion = question.questionAudio;
      //putting the audio question in array because the image urls will come in an array
      addItemsToDeleteList([audioQuestion]);

      const audioAnswer = question.audio;
      addItemsToDeleteList([audioAnswer]);
    }

    if (question.type === "fillInBlank") {
      const audio = question.blanks.map((item) => item.audio);
      addItemsToDeleteList(audio);
    }

    //CHECK TO SEE IF THE FILES ARENT BEING USED IN THE TEST MODEL
    const filesToNotDelete = [];
    const addItemsToNotDeleteList = (keys) => {
      if (!keys || keys.length === 0) return;
      keys.forEach((key) => {
        if (key) filesToNotDelete.push(key);
      });
    };
    tests.forEach((test) => {
      if (test.sectionWeights.mcSection) {
        const imagesStrings = test.multipleChoiceQuestions.map(
          (item) => item.question
        );
        const imageUrls = getKeysFromString(imagesStrings);
        addItemsToNotDeleteList(imageUrls);
      }
      if (test.sectionWeights.essaySection) {
        const imagesStrings = test.essayQuestions.map((item) => item.question);
        const imageUrls = getKeysFromString(imagesStrings);
        addItemsToNotDeleteList(imageUrls);
      }
      if (test.sectionWeights.speakingSection) {
        const imagesStrings = test.speakingQuestions.map(
          (item) => item.question
        );
        const imageUrls = getKeysFromString(imagesStrings);

        addItemsToNotDeleteList(imageUrls);
        const audioQuestions = test.speakingQuestions.map(
          (item) => item.questionAudio
        );
        addItemsToNotDeleteList(audioQuestions);
        const audioAnswers = test.speakingQuestions.map((item) => item.audio);
        addItemsToNotDeleteList(audioAnswers);
      }
      if (test.sectionWeights.fillBlankSection) {
        const imagesString = test.fillInBlanksQuestions.text;
        const imageUrls = getKeysFromString(imagesString);
        addItemsToNotDeleteList(imageUrls);
        const audio = test.fillInBlanksQuestions.blanks.map(
          (item) => item.audio
        );
        addItemsToNotDeleteList(audio);
      }
    });

    const filesToDeleteFiltered = filesToDelete.filter((item) => {
      if (!filesToNotDelete.includes(item)) {
        return item;
      }
    });
    if (filesToDeleteFiltered.length > 0) deleteFiles(filesToDeleteFiltered);
    await question.remove();
    return true;
  },
};
