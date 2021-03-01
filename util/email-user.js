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
  userType:userTypeReciever,//usertype that will be recieving the email
  userTypeSender,
  grade,
  passed,
  date,
  test = {},
  message,
  instructor,
}) => {

  const User = require(`../models/${userTypeReciever}`);
  const user = await User.findById(userId);
  const userConfig = await Configuration.findOne({ user: userId });
  const language = user.language;
  //check to see if student has allowed this type of email notification
  let isRecieveEmails,primaryText,secondaryText,buttonText,buttonUrl;
  if(condition) {
    isRecieveEmails = userConfig[condition];
  }
  if (isRecieveEmails || !condition) {
    let firstName, lastName;
    if (userTypeSender === 'student'|| !userTypeSender) {
      firstName = (student||{}).firstName
      lastName = (student||{}).lastName
    }

    if (userTypeSender === 'instructor') {
      firstName = (instructor||{}).firstName
      lastName = (instructor||{}).lastName
    }
    i18n.setLocale(language);
    const passOrFail = passed ? i18n.__("passed") : i18n.__("failed");
     primaryText = i18n.__(
      content,
      {
        courseName: (course || {}).courseName,
        date,
        grade,
        firstName:firstName||'',
        lastName:lastName||'',
        passOrFail,
        grade,
        workName: test.testName,
        message,
        testOrAssignment: test.assignment
          ? i18n.__("assignment")
          : i18n.__("test"),
        aOrAn: test.assignment ? 'an' : 'a',
      }
    );
    if(secondaryContent) secondaryText = secondaryContent
    transporter.sendMail({
      from: "e-learn@learn.com",
      to: user.email,
      subject: i18n.__(subject, {
        courseName: (course || {}).courseName,
        testOrAssignment: test.assignment
          ? i18n.__("assignment")
          : i18n.__("test"),
        aOrAn: test.assignment ? 'an' : 'a',
      }),
      html:emailTemplate(primaryText,secondaryText,buttonText,buttonUrl),
    });
  }

};

exports.sendEmailToOneUser = sendEmailToOneUser;