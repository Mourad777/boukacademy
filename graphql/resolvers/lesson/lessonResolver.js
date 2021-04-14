const createLesson = require("./createLesson");
const deleteLesson = require("./deleteLesson");
const lesson = require("./lesson");
const markSlideAsSeen = require("./markSlideAsSeen");
const updateLesson = require("./updateLesson");

module.exports = {
  createLesson,
  updateLesson,
  deleteLesson,
  lesson,
  markSlideAsSeen,
};
