const Question = require("../../../models/question");
const Instructor = require("../../../models/instructor");
const { validateQuestion } = require("./validate");
const xss = require("xss");
const {noHtmlTags,textEditorWhitelist,} = require("../validation/xssWhitelist");

module.exports = async function (
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
}