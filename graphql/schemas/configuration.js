const { buildSchema } = require('graphql');

module.exports = buildSchema(`
    type Configuration {
        _id:ID!
        user:ID!
        isChatNotifications:Boolean!
        isChatPushNotifications:Boolean!
        isStayLoggedIn:Boolean!
        isHideActiveStatus:Boolean!
        dropCourseGrade:Float
        isDropCoursePenalty:Boolean
        coursePassGrade:Float
        isEnrollAllowedAfterDropCourse:Boolean
        isInstructorCoursesLimit:Boolean
        instructorCoursesLimit:Int
        isApproveInstructorAccounts:Boolean
        isApproveStudentAccounts:Boolean
        isApproveEnrollments:Boolean
        isContentBlockedCourseEnd:Boolean
        studentFileSizeLimit:Float
        instructorFileSizeLimit:Float
        isPasswordRequiredStartTest:Boolean
        voiceRecordTimeLimit:Float
        blockedInstructors:[ID]
        isChatAllowedOutsideOfficehours:Boolean

        isSendTestNotifications:Boolean
        isSendTestEmails:Boolean
        isSendTestPushNotifications:Boolean
        isSendLessonNotifications:Boolean
        isSendLessonEmails:Boolean
        isSendLessonPushNotifications:Boolean
        isSendAssignmentNotifications:Boolean
        isSendAssignmentEmails:Boolean
        isSendAssignmentPushNotifications:Boolean
        isSendCourseNotifications:Boolean
        isSendCourseEmails:Boolean
        isSendCoursePushNotifications:Boolean

        isTestNotifications:Boolean
        isTestEmails:Boolean
        isTestPushNotifications:Boolean
        isLessonNotifications:Boolean
        isLessonEmails:Boolean
        isLessonPushNotifications:Boolean
        isAssignmentNotifications:Boolean
        isAssignmentEmails:Boolean
        isAssignmentPushNotifications:Boolean
        isCourseNotifications:Boolean
        isCourseEmails:Boolean
        isCoursePushNotifications:Boolean

        isEnrollNotifications:Boolean
        isEnrollEmails:Boolean
        isEnrollPushNotifications:Boolean
        isDropCourseNotifications:Boolean
        isDropCourseEmails:Boolean
        isDropCoursePushNotifications:Boolean
        isNewInstructorAccountNotifications:Boolean
        isNewInstructorAccountEmails:Boolean
        isNewInstructorAccountPushNotifications:Boolean
        isNewStudentAccountNotifications:Boolean
        isNewStudentAccountEmails:Boolean
        isNewStudentAccountPushNotifications:Boolean
        isAllowDeleteStudentAccount:Boolean
        isAllowDeleteInstructorAccount:Boolean

        blockedStudents:[ID]
        blockedStudentsChat:[ID]
        coursesIsChatAllowedOutsideOfficehours:[ID]
    }

    input ConfigurationInputData {
        isChatNotifications:Boolean!
        isChatPushNotifications:Boolean!
        isStayLoggedIn:Boolean!
        isHideActiveStatus: Boolean!
        dropCourseGrade: Float
        isDropCoursePenalty: Boolean
        coursePassGrade: Float
        isEnrollAllowedAfterDropCourse:Boolean
        isInstructorCoursesLimit:Boolean
        instructorCoursesLimit:Int
        isApproveInstructorAccounts:Boolean
        isApproveStudentAccounts:Boolean
        isApproveEnrollments:Boolean
        isContentBlockedCourseEnd:Boolean
        studentFileSizeLimit:Float
        instructorFileSizeLimit:Float
        isPasswordRequiredStartTest:Boolean
        voiceRecordTimeLimit:Float
        blockedInstructors:[ID]
        isChatAllowedOutsideOfficehours:Boolean
        isSendTestNotifications:Boolean
        isSendTestEmails:Boolean
        isSendTestPushNotifications:Boolean
        isSendLessonNotifications:Boolean
        isSendLessonEmails:Boolean
        isSendLessonPushNotifications:Boolean
        isSendAssignmentNotifications:Boolean
        isSendAssignmentEmails:Boolean
        isSendAssignmentPushNotifications:Boolean
        isSendCourseNotifications:Boolean
        isSendCourseEmails:Boolean
        isSendCoursePushNotifications:Boolean
        isTestNotifications:Boolean
        isTestEmails:Boolean
        isTestPushNotifications:Boolean
        isLessonNotifications:Boolean
        isLessonEmails:Boolean
        isLessonPushNotifications:Boolean
        isAssignmentNotifications:Boolean
        isAssignmentEmails:Boolean
        isAssignmentPushNotifications:Boolean
        isCourseNotifications:Boolean
        isCourseEmails:Boolean
        isCoursePushNotifications:Boolean
        isEnrollNotifications:Boolean
        isEnrollEmails:Boolean
        isEnrollPushNotifications:Boolean
        isDropCourseNotifications:Boolean
        isDropCourseEmails:Boolean
        isDropCoursePushNotifications:Boolean
        isNewInstructorAccountNotifications:Boolean
        isNewInstructorAccountEmails:Boolean
        isNewInstructorAccountPushNotifications:Boolean
        isNewStudentAccountNotifications:Boolean
        isNewStudentAccountEmails:Boolean
        isNewStudentAccountPushNotifications:Boolean
        isAllowDeleteStudentAccount:Boolean
        isAllowDeleteInstructorAccount:Boolean

        blockedStudents:[ID]
        blockedStudentsChat:[ID]
    }

    type NewTokenData {
        expiresIn:Int
        refreshTokenExpiration:Float
        token:String
    }

    type RootQuery {
        configuration: Configuration!
    }

    type RootMutation {
        updateConfiguration(configurationInput: ConfigurationInputData): NewTokenData
    }

    schema {
        query: RootQuery
        mutation: RootMutation
    }
`);
