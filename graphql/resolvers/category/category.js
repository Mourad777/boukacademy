const mongoose = require("mongoose");
const Category = require("../../../models/category");
const Instructor = require("../../../models/instructor");
const Student = require("../../../models/student");
const xss = require("xss");
const { noHtmlTags } = require("../validation/xssWhitelist");
const io = require("../../../socket");

module.exports = {
  createCategory: async function ({ categoryInput, courseId }, req) {
    
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
  },

  updateCategory: async function ({ categoryInput, courseId }, req) {

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
  },

  category: async function ({ courseId }, req) {

    if (!req.instructorIsAuth && !req.studentIsAuth) {
      const error = new Error("Not authenticated!");
      error.code = 403;
      throw error;
    }
    if (req.studentIsAuth) {
      const student = await Student.findById(req.userId);
      if (!student) {
        const error = new Error("No student found");
        error.code = 401;
        throw error;
      }
      if (!student.coursesEnrolled.includes(courseId.toString())) {
        const error = new Error("Student not authorized!");
        error.code = 403;
        throw error;
      }
    }
    if (req.instructorIsAuth) {
      const instructor = await Instructor.findById(req.userId);
      if (!instructor) {
        const error = new Error("No instructor found");
        error.code = 401;
        throw error;
      }
      if (!instructor.coursesTeaching.includes(courseId.toString())) {
        const error = new Error("Instructor not authorized!");
        error.code = 403;
        throw error;
      }
    }
    const category = await Category.findOne({ course: courseId });
    if (!category) return;
    return category
  },
};
