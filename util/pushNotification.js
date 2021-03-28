const { i18n } = require("../i18n.config");
const Student = require("../models/student");
const Instructor = require("../models/instructor");
const webpush = require('web-push');
const Configuration = require('../models/configuration')
const { getObjectUrl } = require("../s3");
//assignment
const pushNotify = async ({
  users,
  content,
  multipleUsers,
  course,
  test,
  grade,
  userId, //user recieving the notification
  student,
  instructor,
  isStudentRecieving,
  isInstructorRecieving,
  passed,
  lesson,
  isIM,
  imSender,
  isImSenderInstructor,
  url,
  date,
  condition,
  onlyFileNotification,
  fileExtension,
}) => {
  if (!content) return
  if (multipleUsers) {
    await Promise.all(users.map(async stId => {
      const student = await Student.findById(stId);
      if (!student) return;
      const studentConfig = await Configuration.findOne({ user: stId });
      if(!studentConfig)return;
      const isRecievePushNotifications = studentConfig[condition];

    
      if (isRecievePushNotifications) {
        i18n.setLocale(student.language);
        const notificationTitle = i18n.__(content, {
          courseName: (course || {}).courseName,
          grade,
          date,
          workName: (test || {}).testName,
          lessonName: (lesson || {}).lessonName,
          testOrAssignment: (test || {}).assignment
            ? i18n.__("assignment")
            : i18n.__("test"),
          aOrAn: (test || {}).assignment ? 'an' : 'a',
        });
        const payload = JSON.stringify({ title: notificationTitle, url: process.env.APP_URL + url, });
        const plainStudentObject = student.toObject()
        webpush.sendNotification(plainStudentObject.notificationSubscription, payload).catch(e => console.error(e));
      }

    }))
  } else {
    console.log('push content:', content)
    const firstName = (student || {}).firstName || (instructor || {}).firstName;
    const lastName = (student || {}).lastName || (instructor || {}).lastName;
    let user;
    const noRecievingStudentNorRecievingInstructorProvided = !isStudentRecieving && !isInstructorRecieving
    if (isStudentRecieving || noRecievingStudentNorRecievingInstructorProvided) {
      user = await Student.findById(userId);
    }
    if (isInstructorRecieving || noRecievingStudentNorRecievingInstructorProvided && !user) {
      user = await Instructor.findById(userId);
    }
    i18n.setLocale(user.language);
    const userConfig = await Configuration.findOne({ user: userId });
    if(!userConfig)return;
    let isRecievePushNotifications;
    if (condition) {
      isRecievePushNotifications = userConfig[condition];
    }

    if (isRecievePushNotifications || !condition) {
      let passOrFail = ''
      if (passed === true) passOrFail = i18n.__("passed")
      if (passed === false) passOrFail = i18n.__("failed")
      let fileType;
      if(fileExtension === '.mp4'){
        fileType = 'video'
      } else {
        fileType = 'file'
      }
      const notificationTitle
        = !isIM ? i18n.__(content, {
          courseName: (course || {}).courseName || '',
          grade: grade || '',
          date: date || '',
          firstName: firstName || '',
          lastName: lastName || '',
          passOrFail: passOrFail || '',
          workName: (test || {}).testName || '',
          testOrAssignment: (test || {}).assignment
            ? i18n.__("assignment")
            : i18n.__("test"),
          aOrAn: (test || {}).assignment ? 'an' : 'a',
          
        }) : content || '';
      const plainUserObject = user.toObject()
      console.log('plainUserObject', plainUserObject)
      let payload = JSON.stringify({ title: notificationTitle, url: process.env.APP_URL + url });
      if (isIM) {
        payload = JSON.stringify({
          title: isImSenderInstructor ? i18n.__("newMessageFromInstructor") : i18n.__("newMessageFromStudent", { firstName: imSender.firstName }),
          body: notificationTitle,
          icon: await getObjectUrl(imSender.profilePicture),
          isIM: true,
          url: process.env.APP_URL + url
        });
      }
      webpush.sendNotification(plainUserObject.notificationSubscription, payload).catch(e => console.error(e));

    }
  }
}

exports.pushNotify = pushNotify;
