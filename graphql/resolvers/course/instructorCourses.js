const Instructor = require("../../../models/instructor");
const { getObjectUrl } = require("../../../s3");
const { updateUrls } = require("../../../util/getUpdatedUrls");
const { updateTestUrls } = require("../../../util/updateTestUrls");

module.exports = async function ({ }, req) {
    if (!req.instructorIsAuth) {
        const error = new Error("Not authenticated!");
        error.code = 403;
        throw error;
    }
    const instructor = await Instructor.findById(req.userId)
        .populate({
            path: "coursesTeaching",
            model: "Course",
            populate: {
                path: "tests",
                model: "Test",
            },
        })
        .populate({
            path: "coursesTeaching",
            model: "Course",
            populate: {
                path: "prerequisites",
                model: "Course",
            },
        })
        .populate({
            path: "coursesTeaching",
            model: "Course",
            populate: {
                path: "lessons",
                model: "Lesson",
            },
        });
    // .cache({ key: req.userId });

    if (!instructor) {
        const error = new Error("No instructor found");
        error.code = 401;
        throw error;
    }

    const fixedDocs = await Promise.all(
        instructor.coursesTeaching.map(async (course) => {
            const tempCourseImageUrl = await getObjectUrl(course.courseImage);
            const fixedSyllabus = await updateUrls(course.syllabus);
            return {
                ...course._doc,
                _id: course._id.toString(),
                courseImage: tempCourseImageUrl,
                syllabus: fixedSyllabus,
                lessons: course.lessons.map(async (lesson) => {
                    return {
                        ...lesson._doc,
                        lessonSlides: lesson.lessonSlides.map(async (slide) => {
                            const fixedContent = await updateUrls(slide.slideContent);
                            const audio = await getObjectUrl(slide.audio);
                            const video = await getObjectUrl(slide.video);
                            return { slideContent: fixedContent, audio, video };
                        }),
                    };
                }),
                tests: course.tests.map(async (test) => {
                    return await updateTestUrls(test);
                }),
            };
        })
    );
    return fixedDocs;
}