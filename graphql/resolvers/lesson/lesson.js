const Lesson = require("../../../models/lesson");
const Course = require("../../../models/course");
const { updateUrls } = require("../../../util/getUpdatedUrls");
const { getObjectUrl } = require("../../../s3");

module.exports = async function ({ id }, req) {
    if (!req.instructorIsAuth && !req.studentIsAuth) {
        const error = new Error("Not authenticated!");
        error.code = 401;
        throw error;
    }
    const lesson = await Lesson.findById(id);
    const course = await Course.findById(lesson.course);
    if (!lesson) {
        const error = new Error("No lesson found");
        error.code = 401;
        throw error;
    }
    if (!course) {
        const error = new Error("No course found");
        error.code = 401;
        throw error;
    }
    if (course.courseInstructor.toString() !== req.userId.toString()) {
        const error = new Error("Not authorized!");
        error.code = 403;
        throw error;
    }
    //check if user id matches found instructor id on course
    return {
        ...lesson._doc,
        _id: lesson._id.toString(),
        lessonSlides: await Promise.all(
            lesson.lessonSlides.map(async (slide) => {
                const fixedContent = await updateUrls(slide.slideContent);
                return {
                    ...slide._doc,
                    slideContent: fixedContent,
                    audio: await getObjectUrl(slide.audio),
                    video: await getObjectUrl(slide.video),
                };
            })
        ),
    };
}