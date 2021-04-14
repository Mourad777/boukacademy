const Test = require("../../../models/test");
const Question = require("../../../models/question");
const Instructor = require("../../../models/instructor");
const { getKeysFromString } = require("../../../util/extractURL");
const { deleteFiles } = require("../../../s3");
const { getTestUrls } = require("./util/getTestUrls");

module.exports = async function ({ id }, req) {
    if (!req.instructorIsAuth) {
        const error = new Error("Not authenticated!");
        error.code = 401;
        throw error;
    }
    const question = await Question.findById(id);
    if (!question) {
        const error = new Error("No question found");
        error.code = 401;
        throw error;
    }
    const instructor = await Instructor.findById(req.userId);
    if (!instructor) {
        const error = new Error("No instructor found");
        error.code = 401;
        throw error;
    }
    if (
        !(instructor.coursesTeaching || []).includes(question.course.toString())
    ) {
        const error = new Error("Not authorized!");
        error.code = 403;
        throw error;
    }
    const tests = await Test.find();
    //DELETE FILES ASSOCIATED WITH QUESTION
    const filesToDelete = [];

    const addItemsToDeleteList = (keys) => {
        if (!keys || keys.length === 0) return;
        keys.forEach((key) => {
            if (key) filesToDelete.push(key);
        });
    };

    const questionString = question.question;
    const questionImageUrls = getKeysFromString(questionString);
    addItemsToDeleteList(questionImageUrls);

    if (question.type === "speaking") {
        const audioQuestion = question.questionAudio;
        //putting the audio question in array because the image urls will come in an array
        addItemsToDeleteList([audioQuestion]);

        const audioAnswer = question.audio;
        addItemsToDeleteList([audioAnswer]);
    }

    if (question.type === "fillInBlank") {
        const audio = question.blanks.map((item) => item.audio);
        addItemsToDeleteList(audio);
    }

    //CHECK TO SEE IF THE FILES ARENT BEING USED IN THE TEST MODEL
    const filesToNotDelete = getTestUrls(tests);

    const filesToDeleteFiltered = filesToDelete.filter((item) => {
        if (!filesToNotDelete.includes(item)) {
            return item;
        }
    });
    if (filesToDeleteFiltered.length > 0) deleteFiles(filesToDeleteFiltered);
    await question.remove();
    return true;
}