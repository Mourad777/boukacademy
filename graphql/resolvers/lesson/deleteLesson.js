const Lesson = require("../../../models/lesson");
const Category = require("../../../models/category");
const Course = require("../../../models/course");
const Instructor = require("../../../models/instructor");
const Notification = require("../../../models/notification");
const io = require("../../../socket");
const { emptyS3Directory } = require("../../../s3");

module.exports = async function ({ id }, req) {
    if (!req.instructorIsAuth) {
        const error = new Error("Not authenticated!");
        error.code = 401;
        throw error;
    }
    const lesson = await Lesson.findById(id);
    if (!lesson) {
        const error = new Error("No lesson found");
        error.code = 401;
        throw error;
    }
    const course = await Course.findById(lesson.course);
    if (!course) {
        const error = new Error("No course found");
        error.code = 401;
        throw error;
    }
    const instructor = await Instructor.findById(req.userId);
    if (!instructor) {
        const error = new Error("No instructor found");
        error.code = 401;
        throw error;
    }
    if (course.courseInstructor.toString() !== req.userId.toString()) {
        const error = new Error("Not authorized!");
        error.code = 403;
        throw error;
    }
    //remove lesson from category model
    const categories = await Category.findOne({ course: lesson.course });
    if (categories) {
        categories.modules.forEach((module) => {
            module.lessons.pull(id);
            module.subjects.forEach((subject) => {
                subject.lessons.pull(id);
                subject.topics.forEach((topic) => {
                    topic.lessons.pull(id);
                });
            });
        });
        await categories.save();
    }

    course.lessons.pull(id);
    course.save();
    await lesson.remove();
    const lessonDirectory = `courses/${lesson.course}/lessons/${id}`;
    await Notification.deleteMany({ documentId: id });
    await emptyS3Directory(lessonDirectory);
    io.getIO().emit("updateCourses", {
        userType: "student",
        action: 'deleteLesson',
        lessonId: id,
    });
    return true;
}