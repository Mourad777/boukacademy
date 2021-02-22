const { i18n } = require("../i18n.config");
const { transporter } = require("./transporter");
const Configuration = require("../models/configuration");

const sendEmailToOneUser = async ({
  subject,
  content,
  userId,
  course={},
  student={},
  condition,
  userType,
  grade,
  passed,
  date,
  test={},
  message,
}) => {
  const User = require(`../models/${userType}`);
  const user = await User.findById(userId);
  const userConfig = await Configuration.findOne({ user: userId });
  const language = user.language;
  //check to see if student has allowed this type of email notification
  const isRecieveEmails = userConfig[condition];
  if (isRecieveEmails) {
    i18n.setLocale(language);
    let passOrFail = passed ? i18n.__("passed") : i18n.__("failed");
    // if(test && !test.passingGrade){
    //   console.log('yes')
    //   passOrFail = ''
    // }
    transporter.sendMail({
      from: "e-learn@learn.com",
      to: user.email,
      subject: i18n.__(subject, {
        courseName: course.courseName,
        testOrAssignment: test.assignment
          ? i18n.__("assignment")
          : i18n.__("test"),
          aOrAn:test.assignment ? 'an' : 'a',
      }),
      html: `
            <h2 style="font-family:sans-serif;font-weight:400;color:black;">${i18n.__(
              content,
              {
                courseName: course.courseName,
                date,
                grade,
                firstName: student.firstName,
                lastName: student.lastName,
                passOrFail,
                grade,
                workName: test.testName,
                message,
                testOrAssignment: test.assignment
                  ? i18n.__("assignment")
                  : i18n.__("test"),
                aOrAn:test.assignment ? 'an' : 'a',
              }
            )}</h2>
            `,
    });
  }
};

exports.sendEmailToOneUser = sendEmailToOneUser;
