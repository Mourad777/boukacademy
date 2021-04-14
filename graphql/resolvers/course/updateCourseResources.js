const Course = require("../../../models/course");
const {validateUpdateCourseResources} = require("./validate");

module.exports = async function ({ resources, courseId }, req) {
    const course = await Course.findById(courseId);
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
    if (!req.instructorIsAuth) {
        const error = new Error("No instructor authenticated");
        error.code = 404;
        throw error;
    }

    const errors = await validateUpdateCourseResources(resources);
    if (errors.length > 0) {
        const error = new Error("Invalid input.");
        error.data = errors;
        error.code = 422;
        throw error;
    }

    course.resources = resources;

    const updatedCourse = await course.save();
    return updatedCourse;
}