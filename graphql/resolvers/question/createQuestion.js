const Question = require("../../../models/question");
const Instructor = require("../../../models/instructor");
const { validateQuestion } = require("./validate");
const xss = require("xss");
const { noHtmlTags, textEditorWhitelist, } = require("../validation/xssWhitelist");

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
}