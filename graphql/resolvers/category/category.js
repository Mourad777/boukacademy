const Category = require("../../../models/category");
const Instructor = require("../../../models/instructor");
const Student = require("../../../models/student");

module.exports = async function ({ courseId }, req) {

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
}