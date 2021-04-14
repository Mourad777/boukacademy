const Course = require("../../../models/course");
const Student = require("../../../models/student");
const Instructor = require("../../../models/instructor");
const Category = require("../../../models/category");
const Test = require("../../../models/test");
const Question = require("../../../models/question");
const Result = require("../../../models/result");
const Lesson = require("../../../models/lesson");
const Notification = require("../../../models/notification");
const io = require("../../../socket");
const { emptyS3Directory } = require("../../../s3");
const { clearHash } = require("../../../util/cache");

module.exports = async function ({ id }, req) {
    if (!req.instructorIsAuth && !req.adminIsAuth) {
        const error = new Error("Not authenticated!");
        error.code = 401;
        throw error;
    }
    const course = await Course.findById(id);
    // .cache({ key: id });
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

    const tests = await Test.find({ course: id });
    // .cache({ key: id });
    const instructor = await Instructor.findById(req.userId);
    const students = await Student.find();
    // .cache({ key: id });
    const results = await Result.find({ course: id });
    // .cache({
    //   key: id,
    // });

    if (!instructor) {
        const error = new Error("No course instructor found");
        error.code = 404;
        throw error;
    }

    const studentIds = students.map((s) => s._id);

    const resultsToPull = (results || []).map((item) => item._id) || [];
    const testIds = (tests || []).map((test) => test._id.toString());

    const assignmentSessionIdsToDelete = [];
    const testSessionIdsToDelete = [];

    (students || []).forEach((student) => {
        (student.assignmentsInSession || []).forEach((session) => {
            if ((testIds || []).includes(session.assignment.toString())) {
                assignmentSessionIdsToDelete.push({ _id: session._id });
            }
        });

        if (
            (testIds || [])
                .includes((student.testInSession || {}).test || "")
                .toString() &&
            (student.testInSession || {}).test
        ) {
            testSessionIdsToDelete.push({ test: student.testInSession.test });
        }
    });
    const areAssignmentsInSessionToDelete =
        assignmentSessionIdsToDelete.length > 0;
    const areTestsInSessionToDelete = testSessionIdsToDelete.length > 0;

    await Student.updateMany(
        { _id: { $in: studentIds } },
        {
            $unset: areTestsInSessionToDelete
                ? {
                    testInSession: {
                        // $or doesn't accept empty array, hense the condition
                        $or: testSessionIdsToDelete,
                    },
                }
                : {},
            $pull: areAssignmentsInSessionToDelete
                ? {
                    assignmentsInSession: {
                        $or: assignmentSessionIdsToDelete,
                    },
                    coursesEnrolled: id,
                }
                : {
                    coursesEnrolled: id,
                },
            $pullAll: { testResults: resultsToPull },
        },
        { multi: true }
    );

    instructor.coursesTeaching.pull(id);
    await Category.findOneAndDelete({ course: id });
    await Lesson.deleteMany({ course: id });
    await Result.deleteMany({ course: id });
    await instructor.save();
    await Test.deleteMany({ course: id });
    await Question.deleteMany({ course: id });
    await Course.findByIdAndRemove(id);
    await Notification.deleteMany({ course: id });
    clearHash(id);

    io.getIO().emit("updateCourses", {
        userType: "all",
        action: "exitCourse",
        courseId: id,
        message: "The course was deleted",
    });


    const courseDirectory = `courses/${id}`;
    await emptyS3Directory(courseDirectory);
    return true;
}