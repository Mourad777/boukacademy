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
  //check to see if a category exists if it does then dont do anything
  const category = await Category.find({ course: courseId });
  if (category.length > 0)
    return "there already is a category created, must send a updateCategory query";

  const formattedModules = categoryInput.map((module) => {
    return {
      moduleName: xss(module.moduleName, noHtmlTags),
      _id: mongoose.Types.ObjectId(),
      subjects: module.subjects.map((subject) => {
        return {
          subjectName: xss(subject.subjectName, noHtmlTags),
          _id: mongoose.Types.ObjectId(),
          topics: subject.topics.map((topic) => {
            return {
              topicName: xss(topic.topicName, noHtmlTags),
              _id: mongoose.Types.ObjectId(),
            };
          }),
        };
      }),
    };
  });
  const createdCategory = new Category({
    course: courseId,
    modules: formattedModules,
  });
  await createdCategory.save();
  io.getIO().emit("updateModules", {
    userType: "student",
    courseId,
  });
  return "successfully created a cateogory";
}