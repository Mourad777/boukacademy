const { i18n } = require("../i18n.config");
const { transporter } = require("../util/transporter");
const Instructor = require("../models/instructor");
const Configuration = require("../models/configuration");
const Student = require("../models/student");
const moment = require("moment");
const momentTZ = require("moment-timezone");
const { emailTemplate } = require("./email-template");
// list-style: none;
//     background-color: grey;
//     padding: 5px;


const getOfficehourTemplate = (course, language) => {
  let weeklyOfficeHours = "";
  let otherOfficeHours = "";
  (course.irregularOfficeHours || []).forEach((item, index) => {
    const tz = momentTZ(new Date(Date.now()))
      .tz(item.timezoneRegion)
      .format("z");
    otherOfficeHours += ` <li style="list-style:none;background-color:${
      index % 2 === 0 ? "#fafafa" : "white"
    }; padding:20px;font-family:sans-serif;font-weight:400;color:black;">
            <p>${moment(parseInt(new Date(item.date).getTime()))
              .locale(language)
              .format("MMMM DD YYYY")}
            </p>
            <p>${i18n.__("from")} ${item.startTime} ${i18n.__("to")} ${
      item.endTime
    } ${tz}
            </p>
          </li>`;
  });

  (course.regularOfficeHours || []).forEach((item, index) => {
    const tz = momentTZ(new Date(Date.now()))
      .tz(item.timezoneRegion)
      .format("z");
    weeklyOfficeHours += ` <li style="list-style:none;background-color:${
      index % 2 === 0 ? "#fafafa" : "white"
    }; padding:20px;font-family:sans-serif;font-weight:400;color:black;">
            <p>${i18n.__(`${item.day.toLowerCase()}`)}
            </p>
            <p>${i18n.__("from")} ${item.startTime} ${i18n.__("to")} ${
      item.endTime
    } ${tz}
            </p>
          </li>`;
  });
  let officehourTemplate = `
  <div>
  <h3 style="font-family:sans-serif;font-weight:400;color:black;">${
    weeklyOfficeHours ? i18n.__("weeklyOfficeHours") : ""
  }</h3>
  <ul style="padding-left:0;">
  ${weeklyOfficeHours}
  </ul>
  <h3 style="font-family:sans-serif;font-weight:400;color:black;">${
    weeklyOfficeHours ? i18n.__("specificDateOfficeHours") : ""
  }</h3>
  <ul style="padding-left:0;">
      ${otherOfficeHours}
  </ul>
  </div>
  `;
  return officehourTemplate;
};

const getReadableDate = (date, language) => {
  const readableDate = date
    ? momentTZ(date).locale(language).format("MMMM DD YYYY HH:mm z")
    : "";
  return readableDate;
};

const getEmailContent = (
  content,
  course,
  lesson,
  test,
  date,
  dateSecondary,
  grade,
  language
) => {
  const emailContent = i18n.__(content, {
    courseName: course.courseName,
    lessonName: lesson.lessonName,
    workName: test.testName,
    testOrAssignment: test.assignment ? i18n.__("assignment") : i18n.__("test"),
    date: date ? getReadableDate(date, language) : "",
    dateSecondary: dateSecondary
      ? getReadableDate(dateSecondary, language)
      : "",
    grade,
    dueDateOrCloseDate: test.assignment
      ? i18n.__("dueDate")
      : i18n.__("closeDate"),
    latePenalty: test.latePenalty,
    lateDaysAllowed: test.lateDaysAllowed,
  });
  return emailContent;
};

const sendEmailsToStudents = async ({
  subject,
  content,
  studentIdsEnrolled,
  course = {},
  date,
  dateSecondary,
  lesson = {},
  test = {},
  condition,
}) => {
  await Promise.all(
    studentIdsEnrolled.map(async (st) => {
      const studentConfig = await Configuration.findOne({ user: st });
      const student = await Student.findById(st);
      if(!student)return null;
      const language = student.language;
      const email = student.email;
      //check to see if student has allowed this type of email notification
      const isRecieveEmails = studentConfig[condition];
      if (isRecieveEmails) {
        i18n.setLocale(language);
        let subContent = "",
          grade = "";
        if (subject === "officeHoursUpdated") {
          subContent = getOfficehourTemplate(course, language);
        }
        if (subject === "courseDropDeadlineChanged") {
          content = course.courseDropDeadline
            ? content
            : "noCourseDropDeadline";
          grade = course.courseDropGrade;
          const admin = await Instructor.findOne({ admin: true }).populate(
            "configuration"
          );
          const adminSettings = admin._doc.configuration;
          grade = adminSettings.dropCourseGrade;
        }
        let emailData = "";
        if (!Array.isArray(content)) {
          emailData = `<h2 style="font-family:sans-serif;font-weight:400;color:black;">
          ${getEmailContent(
            content,
            course,
            lesson,
            test,
            date,
            dateSecondary,
            grade,
            language
          )}
          </h2>`;
        }
        if (Array.isArray(content)) {
          content.forEach((item) => {
            emailData += `
            <p style="font-family:sans-serif;font-weight:400;color:black;">

            ${getEmailContent(
              item,
              course,
              lesson,
              test,
              date,
              dateSecondary,
              grade,
              language
            )}
            </p>`;
          });
        }

        const primaryText = `
        ${
          Array.isArray(content)
            ? 
           i18n.__(subject, {
            courseName: course.courseName,
            testOrAssignment: test.assignment
            ? i18n.__("assignment")
            : i18n.__("test"),
            workName:test.testName
        })
            : ""
        }
        `
        const secondaryText = emailData
        const tertiaryText = subContent

        const html = emailTemplate(primaryText,secondaryText,tertiaryText);

        transporter.sendMail({
          from: "e-learn@learn.com",
          to: email,
          subject: i18n.__(subject, {
            courseName: course.courseName,
            testOrAssignment: test.assignment
              ? i18n.__("assignment")
              : i18n.__("test"),
            workName:test.testName
          }),
          html,
        });
      }
    })
  );
};

exports.sendEmailsToStudents = sendEmailsToStudents;