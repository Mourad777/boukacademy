const moment = require("moment");
const getDayIndex = require("../util/getDayIndex");
const momentTZ = require("moment-timezone");

const validateOfficehour = (course, instructor, student) => {
  // const allTimezones = momentTZ.tz.names();

  let isValid = true;
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
    isValid = false;
  }
  //check if course has office hours
  //if no office hours return from function
  const regularOfficeHours = course.regularOfficeHours;
  const irregularOfficeHours = course.irregularOfficeHours;
  if (regularOfficeHours.length === 0 && irregularOfficeHours.length === 0) {
    isValid = false;
  }

  const currentTime = `${moment().hour()}:${moment().minutes()}`;

  const currentTimeStamp =
    new Date(`01/01/2020 ${currentTime}`).getTime() + 60 * 60 * 1000;

  let isRegularOfficehoursTime;
  //regular office hours validation
  if (regularOfficeHours.length > 0) {
    //check day of week
    const foundTodaysOfficehour = regularOfficeHours.find((roh) => {
      const offset =
        momentTZ.tz.zone(roh.timezoneRegion).utcOffset(Date.now()) * 60 * 1000;
      const currentDay = new Date(new Date().getTime() - offset).getDay();
      return getDayIndex(roh.day) === currentDay;
    });
    //check to see if the time is within the allowed interval set by the instructor
    const ohStartTimeStamp = new Date(
      `01/01/2020 ${(foundTodaysOfficehour || {}).startTime}`
    ).getTime();
    const ohEndTimeStamp = new Date(
      `01/01/2020 ${(foundTodaysOfficehour || {}).endTime}`
    ).getTime();

    const region = (foundTodaysOfficehour || {}).timezoneRegion;

    const ohStartTimeStampAdjusted =
      momentTZ.tz.zone(region).utcOffset(ohStartTimeStamp) * 60 * 1000 +
      ohStartTimeStamp;
    const ohEndTimeStampAdjusted =
      momentTZ.tz.zone(region).utcOffset(ohEndTimeStamp) * 60 * 1000 +
      ohEndTimeStamp;
    console.log(
      "regular is time: ",
      ohStartTimeStampAdjusted < currentTimeStamp &&
        ohEndTimeStampAdjusted > currentTimeStamp
    );
    if (
      foundTodaysOfficehour &&
      ohStartTimeStampAdjusted < currentTimeStamp &&
      ohEndTimeStampAdjusted > currentTimeStamp &&
      ohStartTimeStampAdjusted &&
      ohEndTimeStampAdjusted
    ) {
      console.log("reg chat is allowed");
      isRegularOfficehoursTime = true;
    } else {
      console.log("chat block in regular office hours");
      isRegularOfficehoursTime = false;
    }
  }

  let isIrregularOfficehoursTime;
  //irregular office hours validation
  if (irregularOfficeHours.length > 0) {
    const foundValidIrregularOh = irregularOfficeHours.find((oh) => {
      const region = (oh || {}).timezoneRegion;
      // const timezoneOffset = oh.timezoneOffset * 60 * 1000;
      // console.log("ireg timezone offset: ", timezoneOffset);
      const currentIrregTimeMoment = `${momentTZ().hour()}:${momentTZ().minutes()}`;
      const currentIrregTime = `${new Date().getHours()}:${new Date().getMinutes()}`;
      const irregCurrentTimeStamp = new Date(
        `01/01/2020 ${currentIrregTime}`
      ).getTime();

      const irregCurrentTimeStampAdjusted =
        irregCurrentTimeStamp + 60 * 60 * 1000; // + 1 hour
      // irregCurrentTimeStamp - momentTZ.tz.zone(region).utcOffset(irregCurrentTimeStamp) * 60 * 1000;
      const ohStartTimeStamp = new Date(
        `01/01/2020 ${(oh || {}).startTime}`
      ).getTime();
      const ohEndTimeStamp = new Date(
        `01/01/2020 ${(oh || {}).endTime}`
      ).getTime();

      const ohStartTimeStampAdjusted =
        momentTZ.tz.zone(region).utcOffset(ohStartTimeStamp) * 60 * 1000 +
        ohStartTimeStamp;
      const ohEndTimeStampAdjusted =
        momentTZ.tz.zone(region).utcOffset(ohEndTimeStamp) * 60 * 1000 +
        ohEndTimeStamp;
      //timestamps are being compared by keep the date constant (jan 1st 2020)
      //however the timezone offset may make the day go to jan 2nd therefore
      //need to setDate(1) to make sure it never goes outside of jan 1st
      const isTime =
        new Date(ohStartTimeStampAdjusted).setDate(1) <
          irregCurrentTimeStampAdjusted &&
        new Date(ohEndTimeStampAdjusted).setDate(1) >
          irregCurrentTimeStampAdjusted;
      console.log("isTime: ", isTime);
      const dateZeroHours = new Date(Date.now()).setHours(0, 0, 0, 0);
      const dateZeroHoursAdjusted = new Date(
        Date.now() - momentTZ.tz.zone(region).utcOffset(Date.now()) * 60 * 1000
      ).setHours(0, 0, 0, 0);
      const ohDateTimeStamp = new Date(oh.date).getTime();
      const ohDateTimeStampAdjusted =
        ohDateTimeStamp -
        momentTZ.tz.zone(region).utcOffset(ohDateTimeStamp) * 60 * 1000;

      const isDate =
        // new Date(dateZeroHours).setDate(new Date().getDate())
        dateZeroHoursAdjusted === ohDateTimeStampAdjusted;
      console.log("isDate: ", isDate);
      if (isDate && isTime) {
        return oh;
      }
    });
    if (foundValidIrregularOh) {
      console.log("chat allowed irregular office hour");
      isIrregularOfficehoursTime = true;
    } else {
      isIrregularOfficehoursTime = false;
      console.log("chat blocked for irregular office hour");
    }
  }
  if ((isIrregularOfficehoursTime || isRegularOfficehoursTime) && isValid) {
    console.log("returning true");
    return true;
  } else {
    console.log("returning false");
    return false;
  }
};

exports.validateOfficehour = validateOfficehour;
