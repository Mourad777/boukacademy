const validator = require("validator");
const { checkDuplicates } = require("../../../util/checkDuplicates");

const validateQuestion = async (
  questionInput,
  multipleChoiceQuestionInput,
  essayQuestionInput,
  speakingQuestionInput,
  fillBlankQuestionsInput,
  req
) => {
  const errors = [];
  //sanitize language, tags and difficulty
  const difficulties = ['easy','medium','hard']
  if(!difficulties.includes(questionInput.difficulty)){
    errors.push({
        message: "Difficulty  must be easy, medium or hard",
    });
  }
  if(validator.isEmpty(questionInput.language)){
    errors.push({
        message: "Language is required",
    });
  }

  //multiple-choice section validation
  if (questionInput.type === "mc") {
    //sanitize question answerOptions solution
    if (validator.isEmpty(multipleChoiceQuestionInput.question)) {
      errors.push({
        message: "[Multiple-choice question error] question is empty",
      });
    }
    const numberOfAnswerOptions = (
      multipleChoiceQuestionInput.answerOptions || []
    ).length;
    const numberOfCorrectAnswers = (
      multipleChoiceQuestionInput.correctAnswers || []
    ).length;
    if (numberOfAnswerOptions === numberOfCorrectAnswers) {
      errors.push({
        message:
          "[Multiple-choice section error] At least 1 answer option must remain unchecked",
      });
    }
    if (numberOfCorrectAnswers === 0) {
      errors.push({
        message:
          "[Multiple-choice section error] You must select at least 1 correct answer",
      });
    }
    if (numberOfAnswerOptions < 2) {
      errors.push({
        message:
          "[Multiple-choice section error] There must be at least 2 answer options",
      });
    }
    multipleChoiceQuestionInput.answerOptions.forEach((option, answerIndex) => {
      if (validator.isEmpty(option)) {
        errors.push({
          message: `[Multiple-choice section error] Answer option ${
            answerIndex + 1
          } is empty`,
        });
      }
    });

    const duplicateCorrectAnswers =
      checkDuplicates(multipleChoiceQuestionInput.correctAnswers) || [];
    if (duplicateCorrectAnswers.length > 0) {
      errors.push({
        message:
          "[Multiple-choice section error] The correct answers cannot repeat themselves",
      });
    }
    const trimmedAnswerOptions = (
      multipleChoiceQuestionInput.answerOptions || []
    ).map((answer) => answer.trim());
    const duplicateAnswerOptions = checkDuplicates(trimmedAnswerOptions) || [];
    if (duplicateAnswerOptions.length > 0) {
      errors.push({
        message:
          "[Multiple-choice section error] The answer options cannot repeat themselves",
      });
    }
    multipleChoiceQuestionInput.correctAnswers.forEach((answer) => {
      if (!validator.isInt(answer + "") || !(parseInt(answer) > 0)) {
        errors.push({
          message:
            "[Multiple-choice section error] The correct answer must be an integer greater than 0",
        });
      }
      if (!(parseInt(answer) <= numberOfAnswerOptions)) {
        errors.push({
          message: `[Multiple-choice section error] Their is no correct answer ${answer}, the total amount of answers is ${numberOfAnswerOptions}`,
        });
      }
    });
  }
  //essay question validation
  if (questionInput.type === "essay") {
    //sanitize question and solution
    if (validator.isEmpty(essayQuestionInput.question)) {
      errors.push({
        message: `[Essay question error] Question is empty`,
      });
    }
  }
  //speaking question validation
  if (questionInput.type === "speaking") {
    //sanitize question, audioQuestion, audioAnswer
    if (
      validator.isEmpty(speakingQuestionInput.question) &&
      validator.isEmpty(speakingQuestionInput.questionAudio)
    ) {
      errors.push({
        message:
          "[Speaking section error] Must provide a text question or audio question",
      });
    }
    if (
        !validator.isEmpty(speakingQuestionInput.question) &&
        !validator.isEmpty(speakingQuestionInput.questionAudio)
      ) {
        errors.push({
          message:
            "[Speaking section error] Can't have both text question and audio question",
        });
      }
  }
  //fill-in-the-blanks question validation
  if (questionInput.type === "fillInBlank") {
    //sanitize the content
    //sanitize incorrect answers
    //sanitize the correct answer
    //sanitize audio
    if (validator.isEmpty((fillBlankQuestionsInput || {}).fillBlankContent)) {
      errors.push({
        message: `[Fill-in-the-blanks section error] There is no content`,
      });
    }
    if (
      ((fillBlankQuestionsInput || {}).fillBlankContent || "").includes(
        "-BLANK-"
      )
    ) {
      errors.push({
        message: `[Fill-in-the-blanks section error] -BLANK- is a reserved keyword and cannot be used`,
      });
    }
    if (((fillBlankQuestionsInput || {}).blanks || []).length === 0) {
      errors.push({
        message: `[Fill-in-the-blanks section error] Must create at least 1 blank`,
      });
    }
    ((fillBlankQuestionsInput || {}).blanks || []).forEach((blank, index) => {
      if (!validator.isBoolean(blank.selectableAnswer + "")) {
        errors.push({
          message: `[Fill-in-the-blanks section error] Selectable answer in blank ${
            index + 1
          } needs to be true or false`,
        });
      }
      (blank.incorrectAnswers || []).forEach((answer) => {
        if (!validator.isEmpty(answer) && !blank.selectableAnswer) {
          errors.push({
            message: `[Fill-in-the-blanks section error] Blank ${
              index + 1
            } is not a selectable answer therefore should not have incorrect answers to choose from`,
          });
        }
      });
      const trimmedIncorrectAnswers =
        (blank.incorrectAnswers || []).map((item) => item.trim()) || [];
      if (
        (blank.incorrectAnswers || []).length === 0 &&
        blank.selectableAnswer
      ) {
        errors.push({
          message: `[Fill-in-the-blanks section error] Blank ${
            index + 1
          } is a selectable answer therefore you must make at least 1 incorrect answer to choose from`,
        });
      }
      const duplicateIncorrectAnswers = checkDuplicates(
        trimmedIncorrectAnswers
      );
      if (
        (duplicateIncorrectAnswers || []).length > 0 &&
        blank.selectableAnswer
      ) {
        errors.push({
          message: `[Fill-in-the-blanks section error] Blank ${
            index + 1
          } has duplicate incorrect answers`,
        });
      }
      if (
        trimmedIncorrectAnswers.includes(blank.correctAnswer.trim()) &&
        blank.selectableAnswer
      ) {
        errors.push({
          message: `[Fill-in-the-blanks section error] Blank ${
            index + 1
          } has an incorrect answer that is the same as the correct answer`,
        });
      }
    });
  }
  return errors;
};

exports.validateQuestion = validateQuestion;
