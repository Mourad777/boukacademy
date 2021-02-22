const validator = require("validator");

const validateConfiguration = (configInput, userType, isAdmin) => {
  const errors = [];

  if (userType === "student") {
    if (!validator.isBoolean(configInput.isTestNotifications + "")) {
      errors.push({ message: "isTestNotifications must be true or false" });
    }
    if (!validator.isBoolean(configInput.isTestEmails + "")) {
      errors.push({ message: "isTestEmails must be true or false" });
    }
    if (!validator.isBoolean(configInput.isLessonNotifications + "")) {
      errors.push({ message: "isLessonNotifications must be true or false" });
    }
    if (!validator.isBoolean(configInput.isLessonEmails + "")) {
      errors.push({ message: "isLessonEmails must be true or false" });
    }
    if (!validator.isBoolean(configInput.isAssignmentNotifications + "")) {
      errors.push({ message: "isAssignmentNotifications must be true or false" });
    }
    if (!validator.isBoolean(configInput.isAssignmentEmails + "")) {
      errors.push({ message: "isAssignmentEmails must be true or false" });
    }
    if (!validator.isBoolean(configInput.isCourseNotifications + "")) {
      errors.push({ message: "isCourseNotifications must be true or false" });
    }
    if (!validator.isBoolean(configInput.isCourseEmails + "")) {
      errors.push({ message: "isCourseEmails must be true or false" });
    }
    if (!validator.isBoolean(configInput.isChatNotifications + "")) {
      errors.push({ message: "isChatNotifications must be true or false" });
    }
    if (!validator.isBoolean(configInput.isHideActiveStatus + "")) {
      errors.push({ message: "isHideActiveStatus must be true or false" });
    }
  }
  if (userType === "instructor" && !isAdmin) {
    if (!validator.isBoolean(configInput.isTestNotifications + "")) {
      errors.push({ message: "isTestNotifications must be true or false" });
    }
    if (!validator.isBoolean(configInput.isTestEmails + "")) {
      errors.push({ message: "isTestEmails must be true or false" });
    }
    if (!validator.isBoolean(configInput.isAssignmentNotifications + "")) {
      errors.push({ message: "isAssignmentNotifications must be true or false" });
    }
    if (!validator.isBoolean(configInput.isAssignmentEmails + "")) {
      errors.push({ message: "isAssignmentEmails must be true or false" });
    }
    if (!validator.isBoolean(configInput.isSendTestNotifications + "")) {
      errors.push({ message: "isSendTestNotifications must be true or false" });
    }
    if (!validator.isBoolean(configInput.isSendTestEmails + "")) {
      errors.push({ message: "isSendTestEmails must be true or false" });
    }
    if (!validator.isBoolean(configInput.isSendLessonNotifications + "")) {
      errors.push({ message: "isSendLessonNotifications must be true or false" });
    }
    if (!validator.isBoolean(configInput.isSendLessonEmails + "")) {
      errors.push({ message: "isSendLessonEmails must be true or false" });
    }
    if (!validator.isBoolean(configInput.isSendAssignmentNotifications + "")) {
      errors.push({ message: "isSendAssignmentNotifications must be true or false" });
    }
    if (!validator.isBoolean(configInput.isSendAssignmentEmails + "")) {
      errors.push({ message: "isSendAssignmentEmails must be true or false" });
    }
    if (!validator.isBoolean(configInput.isSendCourseNotifications + "")) {
      errors.push({ message: "isSendCourseNotifications must be true or false" });
    }
    if (!validator.isBoolean(configInput.isSendCourseEmails + "")) {
      errors.push({ message: "isSendCourseEmails must be true or false" });
    }
    if (!validator.isBoolean(configInput.isChatAllowedOutsideOfficehours + "")) {
      errors.push({ message: "isChatAllowedOutsideOfficehours must be true or false" });
    }
    if (!validator.isBoolean(configInput.isChatNotifications + "")) {
      errors.push({ message: "isChatNotifications must be true or false" });
    }
    if (!validator.isBoolean(configInput.isEnrollEmails + "")) {
      errors.push({ message: "isEnrollEmails must be true or false" });
    }
    if (!validator.isBoolean(configInput.isEnrollNotifications + "")) {
      errors.push({ message: "isEnrollNotifications must be true or false" });
    }
    if (!validator.isBoolean(configInput.isDropCourseEmails + "")) {
      errors.push({ message: "isDropCourseEmails must be true or false" });
    }
    if (!validator.isBoolean(configInput.isDropCourseNotifications + "")) {
      errors.push({ message: "isDropCourseNotifications must be true or false" });
    }
    if (!validator.isBoolean(configInput.isHideActiveStatus + "")) {
      errors.push({ message: "isHideActiveStatus must be true or false" });
    }
  }

  if (userType === "instructor" && isAdmin) {
    if (!validator.isBoolean(configInput.isTestNotifications + "")) {
      errors.push({ message: "isTestNotifications must be true or false" });
    }
    if (!validator.isBoolean(configInput.isTestEmails + "")) {
      errors.push({ message: "isTestEmails must be true or false" });
    }
    if (!validator.isBoolean(configInput.isAssignmentNotifications + "")) {
      errors.push({ message: "isAssignmentNotifications must be true or false" });
    }
    if (!validator.isBoolean(configInput.isAssignmentEmails + "")) {
      errors.push({ message: "isAssignmentEmails must be true or false" });
    }

    if (
      (!validator.isFloat(configInput.dropCourseGrade + "") || !(configInput.dropCourseGrade >= 0) || !(configInput.dropCourseGrade < 100))
    ) {
      errors.push({ message: "Minimum course grade must be greater or equal to 0 and less than 100" });
    }

    if(!(configInput.coursePassGrade > configInput.dropCourseGrade) && configInput.isDropCoursePenalty) {
      errors.push({ message: "The course pass grade must be greater than the course minimum grade" });
    }
    if (!validator.isBoolean(configInput.isDropCoursePenalty + "")) {
      errors.push({ message: "isDropCoursePenalty must be true or false" });
    }

    if (
      (!validator.isFloat(configInput.coursePassGrade + "") || !(configInput.coursePassGrade > 0) || !(configInput.coursePassGrade <= 100))
    ) {
      errors.push({ message: "Course pass grade must be greater than 0 and less than or equal to 100" });
    }

    if (!validator.isBoolean(configInput.isEnrollAllowedAfterDropCourse + "")) {
      errors.push({ message: "isEnrollAllowedAfterDropCourse must be true or false" });
    }
    if (!validator.isBoolean(configInput.isInstructorCoursesLimit + "")) {
      errors.push({ message: "isInstructorCoursesLimit must be true or false" });
    }
    if (
      (!validator.isInt(configInput.instructorCoursesLimit + "") || !(configInput.instructorCoursesLimit >= 1) || !(configInput.instructorCoursesLimit <= 100))
    ) {
      errors.push({ message: "Instructor courses limit must be an integer greater than or equal to 1 and less than or equal to 100" });
    }
    if (!validator.isBoolean(configInput.isApproveInstructorAccounts + "")) {
      errors.push({ message: "isApproveInstructorAccounts must be true or false" });
    }
    if (!validator.isBoolean(configInput.isApproveStudentAccounts + "")) {
      errors.push({ message: "isApproveStudentAccounts must be true or false" });
    }
    if (!validator.isBoolean(configInput.isContentBlockedCourseEnd + "")) {
      errors.push({ message: "isContentBlockedCourseEnd must be true or false" });
    }
    if (
      (!validator.isFloat(configInput.studentFileSizeLimit + "") || !(configInput.studentFileSizeLimit >= 0.1) || !(configInput.studentFileSizeLimit <= 1000))
    ) {
      errors.push({ message: "Student file size limit must be greater than or equal to 0.1 and less than or equal to 1000" });
    }

    if (
      (!validator.isFloat(configInput.instructorFileSizeLimit + "") || !(configInput.instructorFileSizeLimit >= 0.1) || !(configInput.instructorFileSizeLimit <= 1000))
    ) {
      errors.push({ message: "Instructor file size limit must be greater than or equal to 0.1 and less than or equal to 1000" });
    }

    if (!validator.isBoolean(configInput.isPasswordRequiredStartTest + "")) {
      errors.push({ message: "isPasswordRequiredStartTest must be true or false" });
    }

    if (
      (!validator.isFloat(configInput.voiceRecordTimeLimit + "") || !(configInput.voiceRecordTimeLimit >= 1) || !(configInput.voiceRecordTimeLimit <= 1000))
    ) {
      errors.push({ message: "Voice record time limit must be greater than or equal to 1 and less than or equal to 1000" });
    }
    if (!validator.isBoolean(configInput.isChatAllowedOutsideOfficehours + "")) {
      errors.push({ message: "isChatAllowedOutsideOfficehours must be true or false" });
    }
    // if (!validator.isBoolean(configInput.blockedStudents + "")) {
    //   errors.push({ message: "blockedStudents must be true or false" });
    // }
    // if (!validator.isBoolean(configInput.blockedInstructors + "")) {
    //   errors.push({ message: "blockedInstructors must be true or false" });
    // }
    if (!validator.isBoolean(configInput.isChatNotifications + "")) {
      errors.push({ message: "isChatNotifications must be true or false" });
    }
    if (!validator.isBoolean(configInput.isEnrollEmails + "")) {
      errors.push({ message: "isEnrollEmails must be true or false" });
    }
    if (!validator.isBoolean(configInput.isEnrollNotifications + "")) {
      errors.push({ message: "isEnrollNotifications must be true or false" });
    }
    if (!validator.isBoolean(configInput.isDropCourseEmails + "")) {
      errors.push({ message: "isDropCourseEmails must be true or false" });
    }
    if (!validator.isBoolean(configInput.isDropCourseNotifications + "")) {
      errors.push({ message: "isDropCourseNotifications must be true or false" });
    }
    if (!validator.isBoolean(configInput.isNewInstructorAccountEmails + "")) {
      errors.push({ message: "isNewInstructorAccountEmails must be true or false" });
    }
    if (!validator.isBoolean(configInput.isNewInstructorAccountNotifications + "")) {
      errors.push({ message: "isNewInstructorAccountNotifications must be true or false" });
    }
    // if (!validator.isBoolean(configInput.isAllowDeleteStudentAccount + "")) {
    //   errors.push({ message: "isAllowDeleteStudentAccount must be true or false" });
    // }
    // if (!validator.isBoolean(configInput.isAllowDeleteInstructorAccount + "")) {
    //   errors.push({ message: "isAllowDeleteInstructorAccount must be true or false" });
    // }
    if (!validator.isBoolean(configInput.isHideActiveStatus + "")) {
      errors.push({ message: "isHideActiveStatus must be true or false" });
    }
    if (!validator.isBoolean(configInput.isSendTestNotifications + "")) {
      errors.push({ message: "isSendTestNotifications must be true or false" });
    }
    if (!validator.isBoolean(configInput.isSendTestEmails + "")) {
      errors.push({ message: "isSendTestEmails must be true or false" });
    }
    if (!validator.isBoolean(configInput.isSendLessonNotifications + "")) {
      errors.push({ message: "isSendLessonNotifications must be true or false" });
    }
    if (!validator.isBoolean(configInput.isSendLessonEmails + "")) {
      errors.push({ message: "isSendLessonEmails must be true or false" });
    }
    if (!validator.isBoolean(configInput.isSendAssignmentNotifications + "")) {
      errors.push({ message: "isSendAssignmentNotifications must be true or false" });
    }
    if (!validator.isBoolean(configInput.isSendAssignmentEmails + "")) {
      errors.push({ message: "isSendAssignmentEmails must be true or false" });
    }
    if (!validator.isBoolean(configInput.isSendCourseNotifications + "")) {
      errors.push({ message: "isSendCourseNotifications must be true or false" });
    }
    if (!validator.isBoolean(configInput.isSendCourseEmails + "")) {
      errors.push({ message: "isSendCourseEmails must be true or false" });
    }
  
  }

  return errors;
};
// maxDate={new Date(Date.now() - 31449600000 * 3)}
exports.validateConfiguration = validateConfiguration;