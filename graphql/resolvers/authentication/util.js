const jwt = require("jsonwebtoken");

 const getDefaultAdminSettings = (userId) => {
    return {
        user: userId,
        isChatNotifications: true,
        isChatPushNotifications: true,
        isHideActiveStatus: false,
        isStayLoggedIn:true,
        dropCourseGrade: 30,
        isDropCoursePenalty: true,
        coursePassGrade: 50,
        isEnrollAllowedAfterDropCourse: true,
        isInstructorCoursesLimit: true,
        instructorCoursesLimit: 10,
        isApproveInstructorAccounts: true,
        isApproveStudentAccounts: true,
        isContentBlockedCourseEnd: true,
        studentFileSizeLimit: 25, //MB
        instructorFileSizeLimit: 100, //MB
        isPasswordRequiredStartTest: true,
        voiceRecordTimeLimit: 60, //seconds
        blockedInstructors: [],
        blockedStudents: [],
        isChatAllowedOutsideOfficehours: false,

        isTestNotifications: true,
        isTestEmails: true,
        isTestPushNotifications: true,
        isAssignmentNotifications: true,
        isAssignmentEmails: true,
        isAssignmentPushNotifications: true,

        isApproveEnrollments:true,
        
        isSendTestNotifications: true,
        isSendTestEmails: true,
        isSendTestPushNotifications: true,
        isSendLessonNotifications: true,
        isSendLessonEmails: true,
        isSendLessonPushNotifications: true,
        isSendAssignmentNotifications: true,
        isSendAssignmentEmails: true,
        isSendAssignmentPushNotifications: true,
        isSendCourseNotifications: true,
        isSendCourseEmails: true,
        isSendCoursePushNotifications: true,

        isEnrollEmails: true,
        isEnrollNotifications: true,
        isEnrollPushNotifications: true,
        isDropCourseEmails: true,
        isDropCourseNotifications: true,
        isDropCoursePushNotifications: true,
        isNewInstructorAccountEmails: true,
        isNewInstructorAccountNotifications: true,
        isNewInstructorAccountPushNotifications: true,
        isNewStudentAccountEmails: true,
        isNewStudentAccountNotifications: true,
        isNewStudentAccountPushNotifications: true,
        isAllowDeleteStudentAccount: true,
        isAllowDeleteInstructorAccount: true,
    }
}

 const getDefaultInstructorSettings = (userId) => {
    return {
        user: userId,
        isChatAllowedOutsideOfficehours: false,
        isChatNotifications: true,
        isChatPushNotifications: true,
        isHideActiveStatus: false,
        isStayLoggedIn:true,
        isSendTestNotifications: true,
        isSendTestEmails: true,
        isSendTestPushNotifications: true,
        isSendLessonNotifications: true,
        isSendLessonEmails: true,
        isSendLessonPushNotifications: true,
        isSendAssignmentNotifications: true,
        isSendAssignmentEmails: true,
        isSendAssignmentPushNotifications: true,
        isSendCourseNotifications: true,
        isSendCourseEmails: true,
        isSendCoursePushNotifications: true,

        isEnrollEmails: true,
        isEnrollNotifications: true,
        isEnrollPushNotifications: true,
        isDropCourseEmails: true,
        isDropCourseNotifications: true,
        isDropCoursePushNotifications: true,
    }
}

 const getDefaultStudentSettings = (userId) => {
    return {
        user: userId,
        blockedStudentsChat: [],
        isTestNotifications: true,
        isTestEmails: true,
        isTestPushNotifications: true,
        isLessonNotifications: true,
        isLessonEmails: true,
        isLessonPushNotifications: true,
        isAssignmentNotifications: true,
        isAssignmentEmails: true,
        isAssignmentPushNotifications: true,
        isCourseNotifications: true,
        isCourseEmails: true,
        isCoursePushNotifications: true,
        isChatNotifications: true,
        isChatPushNotifications: true,
        isHideActiveStatus: false,
        isStayLoggedIn:true,
    }
}

const createToken = (userType,userId,email,sessionExpirationTime,secret) => {
    const token = jwt.sign(
        {
          [userType + "Id"]: userId.toString(),
          email: email.trim(),
        },
        secret ? secret : process.env.SECRET,
        { expiresIn: `${sessionExpirationTime}s` }
      );
      return token
}

exports.createToken = createToken;
exports.getDefaultAdminSettings = getDefaultAdminSettings;
exports.getDefaultInstructorSettings = getDefaultInstructorSettings;
exports.getDefaultStudentSettings = getDefaultStudentSettings;