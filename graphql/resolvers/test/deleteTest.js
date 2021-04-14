const { deleteFiles } = require("../../../s3");
const { getKeysFromString } = require("../../../util/extractURL");
const Test = require("../../../models/test");
const Notification = require("../../../models/notification");
const Course = require("../../../models/course");
const Category = require("../../../models/category");
const Student = require("../../../models/student");
const Question = require("../../../models/question");
const Result = require("../../../models/result");
const Instructor = require("../../../models/instructor");
const io = require("../../../socket");
const { getQuestionsUrls } = require("./util/getQuestionsUrls");
const { getTestUrls } = require("../question/util/getTestUrls");

module.exports = async function ({ id }, req) {
    if (!req.instructorIsAuth) {
        const error = new Error("Not authenticated!");
        error.code = 401;
        throw error;
    }
    const test = await Test.findById(id);
    if (!test) {
        const error = new Error("No test found");
        error.code = 401;
        throw error;
    }
    const instructor = await Instructor.findById(req.userId);
    if (!instructor) {
        const error = new Error("No instructor found");
        error.code = 401;
        throw error;
    }
    if (!(instructor.coursesTeaching || []).includes(test.course.toString())) {
        const error = new Error("Not authorized!");
        error.code = 403;
        throw error;
    }
    const course = await Course.findById(test.course);
    if (!course) {
        const error = new Error("No course found");
        error.code = 401;
        throw error;
    }
    const categories = await Category.findOne({ course: test.course });
    const questions = await Question.find();
    const tests = await Test.find();
    const students = await Student.find();
    const results = await Result.find({ test: test._id });

    if (!test.assignment && categories) {
        categories.modules.forEach((module) => {
            module.tests.pull(id);
            module.subjects.forEach((subject) => {
                subject.tests.pull(id);
                subject.topics.forEach((topic) => {
                    topic.tests.pull(id);
                });
            });
        });
    }

    if (test.assignment && categories) {
        categories.modules.forEach((module) => {
            module.assignments.pull(id);
            module.subjects.forEach((subject) => {
                subject.assignments.pull(id);
                subject.topics.forEach((topic) => {
                    topic.assignments.pull(id);
                });
            });
        });
    }

    //DELETE FILES ASSOCIATED WITH TEST
    const filesToDelete = [];
    const addItemsToDeleteList = (items) => {
        items.forEach((item) => {
            if (item) filesToDelete.push(item);
        });
    };
    //delete test reading materials
    const readingMaterials = test.readingMaterials;
    readingMaterials.forEach((item) => {
        if (item.fileUpload && item.content) {
            //delete item.content
            addItemsToDeleteList([item.content]);
        }
        if (!item.fileUpload && item.content) {
            const urls = getKeysFromString(item.content);
            addItemsToDeleteList(urls);
        }
    });
    //delete test audio materials
    const audioMaterials = (test.audioMaterials || []).map((item) => {
        if (item.audio) return item.audio;
    });
    addItemsToDeleteList(audioMaterials);
    //delete test video materials
    const videoMaterials = (test.videoMaterials || []).map((item) => {
        if (item.video) return item.video;
    });
    addItemsToDeleteList(videoMaterials);

    if (test.sectionWeights.mcSection) {
        const imagesStrings = test.multipleChoiceQuestions.map(
            (item) => item.question
        );
        const imageUrls = getKeysFromString(imagesStrings);
        addItemsToDeleteList(imageUrls);
    }
    if (test.sectionWeights.essaySection) {
        const imagesStrings = test.essayQuestions.map((item) => item.question);
        const imageUrls = getKeysFromString(imagesStrings);
        addItemsToDeleteList(imageUrls);
    }
    if (test.sectionWeights.speakingSection) {
        const imagesStrings = test.speakingQuestions.map((item) => item.question);
        const imageUrls = getKeysFromString(imagesStrings);
        addItemsToDeleteList(imageUrls);
        const audioQuestions = test.speakingQuestions.map(
            (item) => item.questionAudio
        );
        addItemsToDeleteList(audioQuestions);
        const audioAnswers = test.speakingQuestions.map((item) => item.audio);
        addItemsToDeleteList(audioAnswers);
    }
    if (test.sectionWeights.fillBlankSection) {
        const imagesString = test.fillInBlanksQuestions.text;
        const imageUrls = getKeysFromString(imagesString);
        addItemsToDeleteList(imageUrls);
        const audio = test.fillInBlanksQuestions.blanks.map((item) => item.audio);
        addItemsToDeleteList(audio);
    }

    results.forEach((result) => {
        //GET ESSAY SECTION FILES
        if (result.essaySection.answers.length > 0) {
            //students answers
            const studentImagesStrings = result.essaySection.answers.map(
                (item) => item.answer
            );
            const answerImageUrls = getKeysFromString(studentImagesStrings);
            addItemsToDeleteList(answerImageUrls);
            //instructors corrections
            const instructorImagesStrings = result.essaySection.answers.map(
                (item) => item.instructorCorrection
            );
            const correctionImageUrls = getKeysFromString(instructorImagesStrings);
            const filteredCorrectionImageUrls = correctionImageUrls.filter(
                (item) => !answerImageUrls.includes(item)
            ); //eliminate duplicates between student answer and instructors corrections
            addItemsToDeleteList(filteredCorrectionImageUrls);
        }
        //GET SPEAKING SECTION FILES
        if (result.speakingSection.answers.length > 0) {
            //students answers
            const studentAudio = result.speakingSection.answers.map(
                (item) => item.answer
            );
            addItemsToDeleteList(studentAudio);
            //instructors corrections
            const instructorAudio = result.speakingSection.answers.map(
                (item) => item.feedbackAudio
            );
            addItemsToDeleteList(instructorAudio);
        }
    });

    const studentIdsToUpdate =
        (results || []).map((result) => result.student.toString()) || [];

    const resultsToPull = (results || []).map((item) => item._id) || [];

    const assignmentSessionIdsToDelete = [];
    (students || []).forEach((student) => {
        (student.assignmentsInSession || []).forEach((session) => {
            if (session.assignment.toString() === id.toString()) {
                assignmentSessionIdsToDelete.push({ _id: session._id });
            }
        });
    });
    const areAssignmentsInSessionToDelete =
        assignmentSessionIdsToDelete.length > 0;

    //CHECK TO SEE IF THE FILES ARENT BEING USED IN THE QUESTION MODEL
    const otherTests = tests.filter(t => t._id.toString() !== id.toString());
    const filesToNotDelete = [...getQuestionsUrls(questions), ...getTestUrls(otherTests)];

    const filesToDeleteFiltered = filesToDelete
        .filter((item) => {
            if (!filesToNotDelete.includes(item)) {
                return item;
            }
        })
        .filter((item) => item);
    const resultsDelete = (await Result.find({ test: id })) || [];
    const resultIds = resultsDelete.map((r) => r._id);
    await Student.updateMany(
        { _id: { $in: studentIdsToUpdate } },
        {
            $unset: { testInSession: { test: id } },
            $pull: areAssignmentsInSessionToDelete
                ? {
                    assignmentsInSession: {
                        $or: assignmentSessionIdsToDelete,
                    },
                }
                : {},
            $pullAll: { testResults: resultsToPull },
        },
        { multi: true }
    );
    course.tests.pull(id);
    await course.save();
    await test.remove();
    await Result.deleteMany({ test: id });
    await Notification.deleteMany({ documentId: { $in: [...resultIds, id] } });
    if (categories) await categories.save();
    io.getIO().emit("updateCourses", {
        userType: "student",
    });

    io.getIO().emit("mainMenu", {
        userType: "student",
        testId: id,
        action: "deleteTest",
        message: "The test was deleted",
    });

    if (filesToDeleteFiltered.length > 0) deleteFiles(filesToDeleteFiltered);

    //I can't simply delete the test directory in s3 bc if a question from the question bank
    //is used in a test, than I delete the question from the question bank, the file directory
    //for the question will persist as expected bc the files are shared with the test, however
    //the problem comes when I delete the test by only specifying the test directory, since
    //the files are in the questions directory they won't be deleted even if the test and question
    //document has been removed
    return true;
}