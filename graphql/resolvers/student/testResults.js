const Test = require("../../../models/test");
const Student = require("../../../models/student");
const Result = require("../../../models/result");
require("dotenv").config();
const { updateResultUrls } = require("../../../util/updateResultUrls");

module.exports = async function ({ }, req) {
    if (!req.studentIsAuth) {
        const error = new Error("No student logged in");
        error.code = 401;
        throw error;
    }

    const studentId = req.userId;
    const student = await Student.findOne({ _id: studentId });
    if (!student) {
        const error = new Error("No student found");
        error.code = 401;
        throw error;
    }

    if (studentId.toString() !== req.userId.toString()) {
        const error = new Error("Not authorized!");
        error.code = 403;
        throw error;
    }
    const results = await Result.find({ student: studentId });

    const tests = await Test.find();
    const fixedTestResults = await Promise.all(
        (results || []).map(async (result) => {
            //check if grades can be released according to the date
            const foundTest = tests.find(
                (test) => test._id.toString() === result.test.toString()
            );
            const gradeReleaseDate = new Date(
                (foundTest.gradeReleaseDate || "").toString()
            ).getTime();
            const gradeCanBeReleased =
                Date.now() > gradeReleaseDate || !gradeReleaseDate;
            if (!gradeCanBeReleased) {
                return {
                    ...result._doc,
                    multiplechoiceSection: {},
                    essaySection: {},
                    speakingSection: {},
                    fillInBlanksSection: {},
                    grade: null,
                    gradeAdjustmentExplanation: null,
                    latePenalty: null,
                };
            } else {
                return await updateResultUrls(result);
            }
        })
    );
    return {
        testResults: fixedTestResults,
        testInSession: student.testInSession,
        assignmentsInSession: student.assignmentsInSession,
    };
}