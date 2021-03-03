const { i18n } = require("../i18n.config");
const Student = require("../models/student");
const Instructor = require("../models/instructor");
const webpush = require('web-push');
const { getObjectUrl } = require("../s3");

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
}) => {
  if (multipleUsers) {
    await Promise.all(users.map(async stId => {
      console.log('stid: ', stId)
      const student = await Student.findById(stId);
      if(!student)return
      i18n.setLocale(student.language);
      const notificationTitle =i18n.__(content, {
        courseName: (course || {}).courseName,
        grade,
        workName:(test||{}).testName,
        lessonName:(lesson||{}).lessonName,
        testOrAssignment:(test||{}).assignment
        ? i18n.__("assignment")
        : i18n.__("test"),
        aOrAn: (test||{}).assignment ? 'an' : 'a',
      });
      const payload = JSON.stringify({ title: notificationTitle });
      const plainStudentObject = student.toObject()
      webpush.sendNotification(plainStudentObject.notificationSubscription, payload).catch(e => console.error(e));
    }))
  } else {
    const firstName = (student||{}).firstName || (instructor||{}).firstName
    const lastName = (student||{}).lastName || (instructor||{}).lastName
    let user;
    const noRecievingStudentNorRecievingInstructorProvided = !isStudentRecieving && !isInstructorRecieving
    if (isStudentRecieving || noRecievingStudentNorRecievingInstructorProvided) {
      user = await Student.findById(userId);
    }
    if (isInstructorRecieving || noRecievingStudentNorRecievingInstructorProvided && !user) {
      user = await Instructor.findById(userId);
    }
    i18n.setLocale(user.language);
    let passOrFail = ''
    if(passed === true) passOrFail = i18n.__("passed")
    if(passed === false) passOrFail = i18n.__("failed")
    const notificationTitle = !isIM ? i18n.__(content, {
      courseName: (course || {}).courseName,
      grade,
      firstName,
      lastName,
      passOrFail,
      workName:(test||{}).testName,
      testOrAssignment:(test||{}).assignment
      ? i18n.__("assignment")
      : i18n.__("test"),
      aOrAn: test.assignment ? 'an' : 'a',
    }) : content
    const plainUserObject = user.toObject()
    let payload = JSON.stringify({ title: notificationTitle });
    console.log('imSender',imSender)
    if(isIM) {
      payload = JSON.stringify({ 
      title:isImSenderInstructor ? i18n.__("newMessageFromInstructor") : i18n.__("newMessageFromStudent",{firstName:imSender.firstName}),
      body:notificationTitle,
      icon: await getObjectUrl(imSender.profilePicture),
      isIM:true,
    });
    }
    webpush.sendNotification(plainUserObject.notificationSubscription, payload).catch(e => console.error(e));
  }
}

exports.pushNotify = pushNotify;
