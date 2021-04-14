const Lesson = require("../../../models/lesson");

module.exports = async function ({ lessonId, slideNumber }, req) {
    if (!req.studentIsAuth) {
        const error = new Error("Not authenticated!");
        error.code = 401;
        throw error;
    }
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
        const error = new Error("No lesson found");
        error.code = 401;
        throw error;
    }
    if (
        !((lesson.lessonSlides[slideNumber] || {}).studentsSeen || []).includes(
            req.userId.toString()
        )
    ) {
        lesson.lessonSlides[slideNumber].studentsSeen.push(req.userId);
        await lesson.save();
    }
    return true;
}