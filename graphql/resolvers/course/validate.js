const validator = require("validator");
const moment = require("moment");
const momentTZ = require("moment-timezone");
const Course = require("../../../models/course");
const Lesson = require("../../../models/lesson");
const Test = require("../../../models/test");
const { checkDuplicates } = require("../../../util/checkDuplicates");

const validateCourse = async (courseInput, req) => {
  const errors = [];
  const instructorCourses = await Course.find({ courseInstructor: req.userId });
  Array.from(instructorCourses || []).forEach((course) => {
    if (
      (courseInput.courseId || "").toString() !==
        (course._id || "").toString() &&
      course.courseName.toLowerCase().trim() ===
        courseInput.courseName.toLowerCase().trim()
    ) {
      errors.push({ message: "You already have a course with that name." });
    }
  });

  if (!validator.isLength(courseInput.courseName, { min: 1 }) || !(courseInput.courseName.trim())) {
    errors.push({ message: "Course must be atleast 1 character." });
  }

  if (courseInput.language) {
    if (!validator.isAlpha(courseInput.language)) {
      errors.push({
        message:
          "If you specify a language for the course it must be in alpha characters",
      });
    }
  }

  if (
    courseInput.studentCapacity &&
    !validator.isInt(courseInput.studentCapacity + "")
  ) {
    errors.push({ message: "Student capacity must be an integer" });
  }
  const course =
    instructorCourses.find(
      (c) => c._id.toString() === courseInput.courseId.toString()
    ) || {};
  //prevent decreasing capacity below the number of students enrolled
  const numberOfStudentsEnrolled = (course.studentsEnrollRequests || []).filter(
    (e) => e.approved
  ).length;
  const courseCapacity = courseInput.studentCapacity;

  if (
    courseCapacity < numberOfStudentsEnrolled &&
    courseInput.studentCapacity &&
    numberOfStudentsEnrolled > 0
  ) {
    errors.push({
      message:
        "You cannot decrease capacity below the number of students that are already enrolled",
    });
  }

  if (
    courseInput.enrollmentStartDate &&
    !moment(courseInput.enrollmentStartDate).isValid()
  ) {
    errors.push({ message: "enrollmentStartDate capacity must be a date" });
  }
  if (
    courseInput.enrollmentEndDate &&
    !moment(courseInput.enrollmentEndDate).isValid()
  ) {
    errors.push({ message: "enrollmentEndDate must be a date" });
  }
  if (
    courseInput.courseStartDate &&
    !moment(courseInput.courseStartDate).isValid()
  ) {
    errors.push({ message: "courseStartDate must be a date" });
  }
  if (
    courseInput.courseEndDate &&
    !moment(courseInput.courseEndDate).isValid()
  ) {
    errors.push({ message: "courseEndDate must be a date" });
  }
  if (
    courseInput.courseDropDeadline &&
    !moment(courseInput.courseDropDeadline).isValid()
  ) {
    errors.push({ message: "courseEndDate must be a date" });
  }
  if (
    (courseInput.courseStartDate && !courseInput.courseEndDate) ||
    (!courseInput.courseStartDate && courseInput.courseEndDate)
  ) {
    errors.push({
      message: "provide a complete course timeline or remove it completely",
    });
  }

  if (
    (courseInput.enrollmentStartDate && !courseInput.enrollmentEndDate) ||
    (!courseInput.enrollmentStartDate && courseInput.enrollmentEndDate)
  ) {
    errors.push({
      message: "provide a complete enrollment period or remove it completely",
    });
  }

  const enrollStart = new Date(courseInput.enrollmentStartDate).getTime();
  const enrollEnd = new Date(courseInput.enrollmentEndDate).getTime();
  const courseStart = new Date(courseInput.courseStartDate).getTime();
  const courseEnd = new Date(courseInput.courseEndDate).getTime();
  const courseDrop = new Date(courseInput.courseDropDeadline).getTime();
  if (courseInput.enrollmentStartDate && courseInput.courseStartDate) {
    //enrollment start date and end date cannot be after course end date
    if (enrollStart > courseEnd || enrollEnd > courseEnd) {
      errors.push({
        message:
          "Enrollment start and end date cannot be after course end date",
      });
    }
    if (
      courseStart.toString() === courseEnd.toString() &&
      courseEnd &&
      courseStart
    ) {
      errors.push({
        message: "Course start date and course end date must be different",
      });
    }
    //course cannot start before enrollment start date
    if (courseStart < enrollStart) {
      errors.push({
        message: "Course cannot start before enrollment date",
      });
    }
  }
  if (courseInput.courseDropDeadline && courseInput.courseStartDate) {
    if (courseDrop > courseEnd) {
      errors.push({
        message: "Course drop date cannot be after course end date",
      });
    }
  }
  if (courseInput.courseDropDeadline && courseInput.courseStartDate) {
    //course drop date cannot be before enrollment start date
    if (courseDrop < enrollStart) {
      errors.push({
        message: "Course drop date cannot be before enrollment start date",
      });
    }
  }

  if (
    enrollStart.toString() === enrollEnd.toString() &&
    enrollStart &&
    enrollEnd
  ) {
    errors.push({
      message: "Enroll start date and enroll end date must be different",
    });
  }
  const daysOfWeek = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  //timezone
  if ((courseInput.regularOfficeHours || []).length > 0) {
    courseInput.regularOfficeHours.forEach((officehour) => {
      if (!daysOfWeek.includes(officehour.day)) {
        errors.push({
          message:
            "Day must be a valid day of the week,first letter capitalized",
        });
      }
      if (
        !officehour.startTime ||
        !officehour.endTime ||
        officehour.startTime === "undefined" ||
        officehour.endTime === "undefined"
      ) {
        errors.push({
          message:
            "Must include a start time and end time for regular officehour",
        });
      }
      const startTime = Date.parse(`01/01/2000 ${officehour.startTime}`);
      const endTime = Date.parse(`01/01/2000 ${officehour.endTime}`);
      if (!(startTime < endTime)) {
        errors.push({
          message: "Regular office hour start time must be before end time",
        });
      }
      if (startTime === endTime) {
        errors.push({
          message:
            "Regular office hour start time and end time cannot be equal",
        });
      }
      if (!momentTZ.tz.names().includes(officehour.timezoneRegion)) {
        errors.push({
          message: "Time zone region is not valid",
        });
      }
    });
    const officeHourDays = courseInput.regularOfficeHours.map(
      (officehour) => officehour.day
    );
    const duplicates = checkDuplicates(officeHourDays);
    if ((duplicates || []).length > 0) {
      errors.push({
        message: "The days of the week cannot repeat",
      });
    }
  }
  if ((courseInput.irregularOfficeHours || []).length > 0) {
    courseInput.irregularOfficeHours.forEach((officehour) => {
      if (!momentTZ.tz.names().includes(officehour.timezoneRegion)) {
        errors.push({
          message: "Time zone region is not valid",
        });
      }
      if (officehour.date && !moment(officehour.date).isValid()) {
        errors.push({
          message: "The irregular office hour date is invalid",
        });
      }
      //The date must fall within the course duration
      const officehourDate = new Date(officehour.date).getTime();
      if (
        courseStart &&
        courseEnd &&
        (officehourDate > courseEnd || officehourDate < courseStart)
      ) {
        errors.push({
          message:
            "The office hour date must fall within the course duration period",
        });
      }
      if (
        !officehour.startTime ||
        !officehour.endTime ||
        officehour.startTime === "undefined" ||
        officehour.endTime === "undefined"
      ) {
        errors.push({
          message:
            "Must include a start time and end time for irregular officehour",
        });
      }
      const startTime = Date.parse(`01/01/2000 ${officehour.startTime}`);
      const endTime = Date.parse(`01/01/2000 ${officehour.endTime}`);
      if (!(startTime < endTime)) {
        errors.push({
          message: "Irregular office hour start time must be before end time",
        });
      }
      if (startTime === endTime) {
        errors.push({
          message:
            "Irregular office hour start time and end time cannot be equal",
        });
      }
    });
  }
  //validate prerequisites by checking if the selected courses are in the database
  const courses = await Course.find();
  const courseIds = (courses || []).map((course) => course._id.toString());
  if ((courseInput.prerequisites || []).length > 0) {
    courseInput.prerequisites.forEach((prereq) => {
      if (!courseIds.includes(prereq.toString())) {
        errors.push({
          message: "Prerequisite course not found",
        });
      }
    });
  }
  const tests = await Test.find({ course: courseInput.courseId });
  if ((tests || []).length > 0) {
    //check to see if any of the tests dates go outside of the boundaries of the coursetimeline
    tests.forEach((test) => {
      const availableOn = new Date(test.availableOnDate).getTime();
      const dueOn = new Date(test.dueDate).getTime();
      const gradeRelease = new Date(test.gradeReleaseDate).getTime();
      if (
        availableOn &&
        courseStart &&
        courseEnd &&
        (!(availableOn > courseStart) || !(availableOn < courseEnd))
      ) {
        errors.push({
          message:
            "Changing the course duration failed because there is one or more tests in this course with a available on date that will go outside of the course duration period.",
        });
      }
      if (
        dueOn &&
        (!(dueOn > courseStart) || !(dueOn < courseEnd)) &&
        courseStart &&
        courseEnd
      ) {
        errors.push({
          message:
            "Changing the course duration failed because there is one or more tests in this course with a due date that will go outside of the course duration period.",
        });
      }
      if (gradeRelease && courseStart && !(gradeRelease > courseStart)) {
        errors.push({
          message:
            "Changing the course duration failed because there is one or more tests in this course with a grade release date that will go before the start date of the course.",
        });
      }
    });
  }
  const lessons = await Lesson.find({ course: courseInput.courseId });
  if ((lessons || []).length > 0) {
    lessons.forEach((lesson) => {
      const availableOn = new Date(lesson.availableOnDate).getTime();
      if (
        availableOn &&
        courseStart &&
        courseEnd &&
        (!(availableOn > courseStart) || !(availableOn < courseEnd))
      ) {
        errors.push({
          message:
            "Changing the course duration failed because there are one or more lessons in this course with an available on date that will go outside of the course duration period.",
        });
      }
    });
  }
  return errors;
};

const validateFinalGrade = async (finalGradeInput) => {
  const errors = [];
  const isDropCoursePenalty = finalGradeInput.isDropCoursePenalty;
  const dropCourseGrade = finalGradeInput.dropCourseGrade;
  if (
    finalGradeInput.grade &&
    (!validator.isFloat(finalGradeInput.grade + "") ||
      !(finalGradeInput.grade >= 0) ||
      !(finalGradeInput.grade <= 100))
  ) {
    errors.push({ message: "Grade must be a Float between 0 and 100" });
  }
  if(isDropCoursePenalty && finalGradeInput.grade < dropCourseGrade){
    errors.push({ message: `The final grade cannot be less than the minimum grade which is ${dropCourseGrade}%` });
  }
  if (!validator.isBoolean(finalGradeInput.gradeOverride + "")) {
    errors.push({ message: "Grade override must be true or false" });
  }

  return errors;
};

const validateUpdateCourseResources = async (resources) => {
  const errors = [];

  const allowedExtensions = [
    "jpeg",
    "jfif",
    "jpg",
    "docx",
    "doc",
    "pdf",
    "mp4",
    "avi",
  ];
  (resources || []).forEach((r) => {
    if (!r.resourceName || r.resourceName === "undefined") {
      errors.push({ message: "Must give your resource a name" });
    }
    const docExtension = (r.resource || "").toString().split(".").pop();
    if (!allowedExtensions.includes(docExtension)) {
      errors.push({ message: "Must provide a resource in a valid format" });
    }
  });

  return errors;
};

exports.validateFinalGrade = validateFinalGrade;
exports.validateCourse = validateCourse;
exports.validateUpdateCourseResources = validateUpdateCourseResources;
