const Student = require("../../../models/student");
const Instructor = require("../../../models/instructor");
require("dotenv").config();
const { updateResultUrls } = require("../../../util/updateResultUrls");
const { getObjectUrl } = require("../../../s3");

module.exports = async function ({ }, req) {
    //only admin should be able to access all student accounts
    if (!req.instructorIsAuth) {
        const error = new Error("No instructor!");
        error.code = 401;
        throw error;
    }

    const isAdmin = await Instructor.find({ admin: true });
    if (!isAdmin) {
        const error = new Error("Unauthorized access, only admin allowed!");
        error.code = 403;
        throw error;
    }

    const students = await Student.find().populate(
        "testResults"
    );

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