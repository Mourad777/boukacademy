const { i18n } = require("../i18n.config");
const { transporter } = require("./transporter");
const Configuration = require("../models/configuration");
const { emailTemplate } = require("./email-template");

const sendEmailToOneUser = async ({
  subject,
  content,
  secondaryContent,
  userId,
  course = {},
  student = {},
  condition,
  userType: userTypeReciever,//usertype that will be recieving the email
  userTypeSender,
  grade,
  passed,
  date,
  test = {},
  message,
  instructor,
  buttonText,
  buttonUrl,
}) => {

  if (!content) return
  const User = require(`../models/${userTypeReciever}`);
  const user = await User.findById(userId);
  const userConfig = await Configuration.findOne({ user: userId });
  const language = user.language;
  //check to see if student has allowed this type of email notification
  let isRecieveEmails, primaryText, secondaryText, translatedButtonText, url;
  if (condition) {
    isRecieveEmails = userConfig[condition];
  }
  if (isRecieveEmails || !condition) {
    let firstName, lastName;
    if (userTypeSender === 'student' || !userTypeSender) {
      firstName = (student || {}).firstName
      lastName = (student || {}).lastName
    }

    if (userTypeSender === 'instructor') {
      firstName = (instructor || {}).firstName
      lastName = (instructor || {}).lastName
    }
    i18n.setLocale(language);
    let passOrFail;
    if (passed === true) {
      passOrFail = i18n.__("passed")
    }
    if (passed === false) {
      passOrFail = i18n.__("failed")
    }

    primaryText = i18n.__(
      content,
      {
        courseName: (course || {}).courseName,
        date: date || '',
        grade: grade || '',
        firstName: firstName || '',
        lastName: lastName || '',
        passOrFail: passOrFail || '',
        workName: test.testName || '',
        messag: message || '',
        testOrAssignment: test.assignment
          ? i18n.__("assignment")
          : i18n.__("test"),
        aOrAn: test.assignment ? 'an' : 'a',
      }
    );
    if (buttonText) {
      translatedButtonText = i18n.__(buttonText, {
        testOrAssignment: test.assignment
          ? i18n.__("assignment")
          : i18n.__("test"),
      });
    }
    if (buttonUrl) {
      url = process.env.APP_URL + buttonUrl;
    }
    if (secondaryContent) secondaryText = secondaryContent
    
    transporter.sendMail({
      from: "boukacademy@learn.com",
      to: user.email,
      subject: i18n.__(subject, {
        courseName: (course || {}).courseName || '',
        testOrAssignment: test.assignment
          ? i18n.__("assignment")
          : i18n.__("test"),
        aOrAn: test.assignment ? 'an' : 'a',
      }),
      // html:emailTemplate(primaryText,secondaryText,translatedButtonText,url),
      html: emailTemplate(primaryText, secondaryText, null, translatedButtonText, url),
    });
  }
};

exports.sendEmailToOneUser = sendEmailToOneUser;

// transporter.sendMail({
//   from: "e-learn@learn.com",
//   to: user.email,
//   subject: i18n.__(subject, {
//     courseName: (course || {}).courseName||'',
//     testOrAssignment: test.assignment
//       ? i18n.__("assignment")
//       : i18n.__("test"),
//     aOrAn: test.assignment ? 'an' : 'a',
//   }),
//   // html:emailTemplate(primaryText,secondaryText,translatedButtonText,url),
//   text:emailTemplate(primaryText,secondaryText,translatedButtonText,url),
// });