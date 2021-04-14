const Course = require("../../../models/course");
const Instructor = require("../../../models/instructor");
const { getObjectUrl } = require("../../../s3");
const { updateUrls } = require("../../../util/getUpdatedUrls");

module.exports = async function ({ id }, req) {
    if (!req.instructorIsAuth) {
        const error = new Error("Not authenticated!");
        error.code = 403;
        throw error;
    }
    const instructor = await Instructor.findById(req.userId);
    // .cache({
    //   key: id,
    // });
    if (!instructor) {
        const error = new Error("No instructor found");
        error.code = 401;
        throw error;
    }
    if (
        !(instructor.coursesTeaching || []).includes(id.toString()) &&
        req.instructorIsAuth
    ) {
        const error = new Error("Not authorized!");
        error.code = 403;
        throw error;
    }
    const course = await Course.findById(id).populate("prerequisites");
    // .cache({ key: req.userId });
    if (!course) {
        const error = new Error("No course found");
        error.code = 401;
        throw error;
    }
    const tempCourseImageUrl = await getObjectUrl(course.courseImage);
    const fixedSyllabus = await updateUrls(course.syllabus);
    return {
        ...course._doc,
        courseImage: tempCourseImageUrl,
        syllabus: fixedSyllabus,
        _id: course._id.toString(),
    };
}