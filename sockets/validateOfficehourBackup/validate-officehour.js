const moment = require("moment");
const getDayIndex = require("../util/getDayIndex");

const validateOfficehour = (course, instructor, student,timezoneOffset) => {
  let isValid = false;
  const studentIsEnrolled = (student.coursesEnrolled || []).includes(
    course._id.toString()
  );
  if (!studentIsEnrolled) {
    isValid = false;
  }
  //check if the course is a course that the instructor is teaching
  const instructorIsTeaching = (instructor.coursesTeaching || "").includes(
    course._id.toString()
  );
  if (!instructorIsTeaching) {
    console.log("instructor is not teaching that course");
    isValid = false;
  }
  //check if course has office hours
  //if no office hours return from function
  const regularOfficeHours = course.regularOfficeHours;
  const irregularOfficeHours = course.irregularOfficeHours;
  if (regularOfficeHours.length === 0 && irregularOfficeHours.length === 0) {
    console.log("no office hours so return");
    isValid = false;
  }
  const oneHour = 3600000;
  const currentTime = `${moment()
    .add(1, "hours")
    .hour()}:${moment().minutes()}`;
  console.log("currentTime", currentTime);
  const currentTimeStamp = new Date(`01/01/2020 ${currentTime}`).getTime();
  console.log(" current date time: ", new Date(`01/01/2020 ${currentTime}`));

  
  //regular office hours validation
  if (regularOfficeHours.length > 0) {
    //check day of week
    const currentDay = new Date(
      new Date().setHours(new Date().getHours() - 4)
    ).getDay();
    console.log(
      "new date adjusted by 4 hours: ",
      new Date(new Date().setHours(new Date().getHours() - 4))
    );
    console.log("currentDay", currentDay);
    console.log("new Date()", new Date());
    const foundTodaysOfficehour = regularOfficeHours.find((roh) => {
      console.log("getDayIndex(roh.day)", getDayIndex(roh.day));
      return getDayIndex(roh.day) === currentDay;
    });
    //check to see if the time is within the allowed interval set by the instructor
    const ohStartTimeStamp =
      new Date(
        `01/01/2020 ${(foundTodaysOfficehour || {}).startTime}`
      ).getTime() +
      oneHour * 5;
    const ohEndTimeStamp =
      new Date(
        `01/01/2020 ${(foundTodaysOfficehour || {}).endTime}`
      ).getTime() +
      oneHour * 5;
    console.log(
      "offset end: ",
      new Date(
        `01/01/2020 ${(foundTodaysOfficehour || {}).endTime}`
      ).getTimezoneOffset()
    );

    console.log("foundTodaysOfficehour", foundTodaysOfficehour);
    console.log("ohStartTimeStamp", ohStartTimeStamp);
    console.log("currentTimeStamp", currentTimeStamp);
    console.log("ohEndTimeStamp", ohEndTimeStamp);
    console.log("ohEndTimeStamp adjusted", ohEndTimeStamp);
    if (
      foundTodaysOfficehour &&
      ohStartTimeStamp < currentTimeStamp &&
      ohEndTimeStamp > currentTimeStamp &&
      ohStartTimeStamp &&
      ohEndTimeStamp
    ) {
      console.log("chat is allowed");
      isValid = true;
    } else {
      console.log("chat block in regular office hours");
      isValid = false;
    }
  }

  //irregular office hours validation
  if (irregularOfficeHours.length > 0) {
    const foundValidIrregularOh = irregularOfficeHours.find((oh) => {
      const ohStartTimeStamp =
        new Date(`01/01/2020 ${(oh || {}).startTime}`).getTime() + oneHour * 5;
      const ohEndTimeStamp =
        new Date(`01/01/2020 ${(oh || {}).endTime}`).getTime() + oneHour * 5;
      console.log("irreg endtime", ohEndTimeStamp);
      console.log("irreg current", currentTimeStamp);
      const isTime =
        ohStartTimeStamp < currentTimeStamp &&
        ohEndTimeStamp > currentTimeStamp;
      console.log("is time irreg:", isTime);
      console.log(
        "new Date(Date.now()).setHours(0, 0, 0, 0) adjusted",
        new Date(Date.now()).setHours(0, 0, 0, 0)+ oneHour * 4
      );
      console.log("new Date(oh.date).getTime()", new Date(oh.date).getTime());

      if (
        new Date(Date.now()).setHours(0, 0, 0, 0) + oneHour * 4 ===
          new Date(oh.date).getTime() &&
        isTime
      ) {
        return oh;
      }
    });
    if (foundValidIrregularOh) {
      console.log("chat allowed irrgular office hour");
      isValid = true;
    } else {
      isValid = false;
      console.log("chat blocked for irregular office hour");
    }
  }
  return isValid;
};

exports.validateOfficehour = validateOfficehour;
