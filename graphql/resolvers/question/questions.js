const Question = require("../../../models/question");
const Instructor = require("../../../models/instructor");
const { updateUrls } = require("../../../util/getUpdatedUrls");
const { getObjectUrl } = require("../../../s3");

module.exports = async function ({ courseId }, req) {
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
}