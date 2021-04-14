const Course = require("../../../models/course");
const Instructor = require("../../../models/instructor");
const io = require("../../../socket");
const {validateCourse} = require("./validate");
const xss = require("xss");
const {noHtmlTags} = require("../validation/xssWhitelist");
const { clearHash } = require("../../../util/cache");

module.exports = async function ({ courseInput }, req) {
    if (!req.instructorIsAuth) {
        const error = new Error("Not authenticated!");
        error.code = 401;
        throw error;
    }
    const errors = await validateCourse(courseInput, req);
    if (errors.length > 0) {
        const error = new Error("Invalid input.");
        error.data = errors;
        error.code = 422;
        throw error;
    }

    const instructor = await Instructor.findById(req.userId);
    // .cache({
    //   key: courseInput.courseId,
    // });
    if (!instructor) {
        const error = new Error("No instructor found");
        error.code = 401;
        throw error;
    }
    const admin = await Instructor.findOne({ admin: true }).populate(
        "configuration"
    );
    const adminSettings = admin._doc.configuration;
    const isCoursesLimit = adminSettings.isInstructorCoursesLimit;
    const coursesLimit = adminSettings.instructorCoursesLimit;
    const numberOfInstructorCourses = await Course.countDocuments({
        courseInstructor: req.userId,
    });
    if (numberOfInstructorCourses >= coursesLimit && isCoursesLimit) {
        const error = new Error("Limit of number of courses reached");
        error.code = 403;
        throw error;
    }
    //get admin config
    //check if limit of courses reached

    let language;
    if (courseInput.language) {
        language =
            courseInput.language[0].toUpperCase() + courseInput.language.slice(1);
    }

    const course = new Course({
        _id: courseInput.courseId,
        courseName: xss(courseInput.courseName, noHtmlTags),
        studentCapacity: courseInput.studentCapacity,
        language: xss(language, noHtmlTags),
        courseInstructor: instructor,
        courseActive: courseInput.courseActive,
        enrollmentStartDate: courseInput.enrollmentStartDate,
        enrollmentEndDate: courseInput.enrollmentEndDate,
        courseStartDate: courseInput.courseStartDate,
        courseEndDate: courseInput.courseEndDate,
        courseDropDeadline: courseInput.courseDropDeadline,
        syllabus: courseInput.syllabus,
        prerequisites: courseInput.prerequisites,
        courseImage: courseInput.courseImage,
        regularOfficeHours: courseInput.regularOfficeHours,
        irregularOfficeHours: courseInput.irregularOfficeHours,
        cost: courseInput.cost,
        couponCode: xss(courseInput.couponCode, noHtmlTags),
        couponExpiration: xss(courseInput.couponExpiration, noHtmlTags),
    });
    const createdCourse = await course.save();
    instructor.coursesTeaching.push(createdCourse);
    await instructor.save();
    clearHash(course._id);
    // clearRedis(); //need to clear the entire redis db bc the course is related not just to the user(instructor)
    //but also to the students
    io.getIO().emit("updateCourses", {
        userType: "all",
    });
    return { ...createdCourse._doc, _id: createdCourse._id.toString() };
}