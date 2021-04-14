const createCourse = require("./createCourse");
const updateCourse = require("./updateCourse");
const gradeCourse = require("./gradeCourse");
const dropCourse = require("./dropCourse");
const enrollDeny = require("./enrollDeny");
const enrollApprove = require("./enrollApprove");
const enrollRequest = require("./enrollRequest");
const instructorCourses = require("./instructorCourses");
const courses = require("./courses");
const course = require("./course");
const deleteCourse = require("./deleteCourse");
const changeCourseState = require("./changeCourseState");
const updateCourseResources = require("./updateCourseResources");

module.exports = {
  createCourse,
  updateCourse,
  updateCourseResources,
  changeCourseState,
  deleteCourse,
  courses,
  course,
  instructorCourses,
  enrollRequest,
  enrollApprove,
  enrollDeny,
  dropCourse,
  gradeCourse,
};
