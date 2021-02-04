const validator = require("validator");
const Lesson = require("../../../models/lesson");
const Course = require("../../../models/course");
const moment = require("moment");

const validateLesson = async (lessonInput) => {
  const errors = [];
  if (!validator.isLength(lessonInput.lessonName, { min: 1 })) {
    errors.push({ message: "Lesson must be atleast 1 character." });
  }
  if (
    lessonInput.availableOnDate &&
    !moment(lessonInput.availableOnDate).isValid()
  ) {
    errors.push({ message: "Available on date is invalid" });
  }

  const course = await Course.findById(lessonInput.course);
  const courseStart = new Date(course.courseStartDate).getTime();
  const courseEnd = new Date(course.courseEndDate).getTime();
  const availableOn = new Date(lessonInput.availableOnDate).getTime();
  if (courseStart && courseEnd) {
    //available on date and due dates must fall between the course start date and course end date
    if (
      availableOn &&
      courseStart &&
      courseEnd &&
      (!(availableOn > courseStart) || !(availableOn < courseEnd))
    ) {
      errors.push({
        message:
          "Available on date must fall within the course period duration",
      });
    }
  }
  if (!validator.isAlphanumeric(lessonInput.course)) {
    errors.push({ message: "Course id must be alphanumeric." });
  }
  (lessonInput.slideContent || []).forEach((slide,index) => {
    const videoKeys = lessonInput.slideVideo
    if (!validator.isLength(slide, { min: 1 }) && !validator.isLength(videoKeys[index], { min: 1 }) ) {
      errors.push({ message: "Slide content can't be empty" });
    }
    //each slide needs to be sanitized for xss
  });

  //validate prerequisites by checking if the selected lessons are in the database
  const lessons = await Lesson.find();
  Array.from(lessons || []).forEach((lesson) => {
    if (
      (lesson._id || "").toString() !== (lessonInput._id || "").toString() &&
      lesson.lessonName.toLowerCase().trim() ===
        lessonInput.lessonName.toLowerCase().trim() &&
      lesson.course.toString() === lessonInput.course
    ) {
      errors.push({
        message: "A lesson with that name already exists in this course.",
      });
    }
  });
  return errors;
};

exports.validateLesson = validateLesson;
