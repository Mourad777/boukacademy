const mongoose = require("mongoose");
const Category = require("../../../models/category");
const Instructor = require("../../../models/instructor");
const xss = require("xss");
const { noHtmlTags } = require("../validation/xssWhitelist");
const io = require("../../../socket");

module.exports = async function ({ categoryInput, courseId }, req) {

    if (!req.instructorIsAuth) {
        const error = new Error("Not authenticated!");
        error.code = 403;
        throw error;
    }
    const instructor = await Instructor.findById(req.userId);
    if (!(instructor.coursesTeaching || []).includes(courseId.toString())) {
        const error = new Error("Not authorized!");
        error.code = 403;
        throw error;
    }
    const foundCategory = await Category.findOneAndDelete({ course: courseId });
    if (!foundCategory) {
        const error = new Error("No category found");
        error.code = 401;
        throw error;
    }
    const formattedModules = categoryInput.map((module) => {
        return {
            _id:
                module._id !== "undefined" ? module._id : mongoose.Types.ObjectId(),
            moduleName: xss(module.moduleName, noHtmlTags),
            tests: module.tests,
            assignments: module.assignments,
            lessons: module.lessons,
            subjects: module.subjects.map((subject) => {
                return {
                    _id:
                        subject._id !== "undefined"
                            ? subject._id
                            : mongoose.Types.ObjectId(),
                    subjectName: xss(subject.subjectName, noHtmlTags),
                    tests: subject.tests,
                    assignments: subject.assignments,
                    lessons: subject.lessons,
                    topics: subject.topics.map((topic) => {
                        return {
                            _id:
                                topic._id !== "undefined"
                                    ? topic._id
                                    : mongoose.Types.ObjectId(),
                            topicName: xss(topic.topicName, noHtmlTags),
                            tests: topic.tests,
                            assignments: topic.assignments,
                            lessons: topic.lessons,
                        };
                    }),
                };
            }),
        };
    });
    const category = new Category({
        course: courseId,
        modules: formattedModules,
    });
    await category.save();
    io.getIO().emit("updateModules", {
        userType: "student",
        courseId,
    });
    return "successfully updated the category";
}