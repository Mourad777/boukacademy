const Course = require("../../../models/course");
const Student = require("../../../models/student");
const Test = require("../../../models/test");
const Result = require("../../../models/result");
const io = require("../../../socket");
const { emptyS3Directory } = require("../../../s3");
const { clearHash } = require("../../../util/cache");

module.exports = async function ({ courseId }, req) {
    const course = await Course.findById(courseId);
    if (!course) {
        const error = new Error("No course found!");
        error.code = 404;
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

    const courseTests = await Test.find({ course: courseId });
    const courseTestIds = courseTests
        .filter((t) => !t.assignment)
        .map((t) => t._id);
    const results = await Result.find({ test: { $in: courseTestIds } });
    const openResults = (results || []).filter((r) => !r.closed);
    const openResultsIds = (openResults || []).map((r) => r._id);
    const studentsTakingTest = await Student.find({
        "testInSession.test": { $in: courseTestIds },
    });
    const filteredStudentsTakingTest = studentsTakingTest.filter((i) => i);

    //step 1 find all test ids that are in that course
    //step 2 find all students with a test in session that matches one of the test ids
    //step 3 if there is a match set the test in session to null
    await Student.updateMany(
        {
            "testInSession.test": { $in: courseTestIds },
        },
        { testInSession: null, $pullAll: { testResults: openResultsIds } }
    );

    //step 1 find all students who have a test in session before setting the test in session to null
    //step 2 find and delete all results that match the student and the test that they are taking
    //step 3 delete the results
    await Promise.all(
        filteredStudentsTakingTest.map(async (s) => {
            const result = await Result.findOne({
                test: s.testInSession.test,
                student: s._id,
            });
            const resultDirectory = `courses/${courseId}/tests/${s.testInSession.test}/results/${result._id}`;
            await emptyS3Directory(resultDirectory);
            await result.remove();
        })
    );

    course.courseActive = !course.courseActive;
    const updatedCourse = await course.save();
    clearHash(courseId);

    if (!course.courseActive) {
        io.getIO().emit("mainMenu", {
            userType: "student",
            courseId,
            action: "deactivateCourse",
            message: "The course has been de-activated",
        });
    }

    io.getIO().emit("updateCourses", {
        courseId,
        userType: "student",
        action: "exitCourse",
    });

    return {
        ...updatedCourse._doc,
        _id: updatedCourse._id.toString(),
    };
}