const Student = require("../../../models/student");
const Instructor = require("../../../models/instructor");
require("dotenv").config();
const { updateResultUrls } = require("../../../util/updateResultUrls");
const { getObjectUrl } = require("../../../s3");

module.exports = async function ({ courseId }, req) {
    //give different student info depending
    //on whether the instructor is logged in
    //or student is logged in
    //if student logged in only give info on
    //student firstname last name and id, hide
    //everything else
    if (!req.instructorIsAuth && !req.studentIsAuth) {
        const error = new Error("No instructor or student logged in!");
        error.code = 401;
        throw error;
    }
    const students = await Student.find({ coursesEnrolled: courseId }).populate(
        "testResults"
    );

    if (req.studentIsAuth) {
        const fixedStudents = await Promise.all(
            students
                .map(async (student) => {
                    if (!student.coursesEnrolled.includes(courseId.toString()))
                        return null;
                    return {
                        _id: student._id.toString(),
                        firstName: student.firstName,
                        lastName: student.lastName,
                        profilePicture: await getObjectUrl(student.profilePicture),
                        lastLogin: null,
                    };
                })
                .filter((item) => item)
        ); //filter out null items
        return fixedStudents;
    }
    if (req.instructorIsAuth) {
        const instructor = await Instructor.findById(req.userId);
        if (!instructor) {
            const error = new Error("no instructor found");
            error.code = 401;
            throw error;
        }
        const fixedStudents = await Promise.all(
            students.map(async (student) => {
                const fixedTestResults = student.testResults.map(
                    async (result) => await updateResultUrls(result)
                );
                const documents = await Promise.all(
                    student.documents.map(async (d) => {
                        return {
                            documentType: d.documentType,
                            document: await getObjectUrl(d.document),
                        };
                    })
                );

                return {
                    ...student._doc,
                    _id: student._id.toString(),
                    testResults: fixedTestResults,
                    profilePicture: await getObjectUrl(student.profilePicture),
                    documents,
                };
            })
        );
        return fixedStudents;
    }
}