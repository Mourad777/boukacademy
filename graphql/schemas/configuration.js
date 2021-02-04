const { buildSchema } = require('graphql');

module.exports = buildSchema(`
    type Configuration {
        _id:ID!
        user:ID!
        isChatNotifications:Boolean!
        isHideActiveStatus:Boolean!
        dropCourseGrade:Float
        isDropCoursePenalty:Boolean
        coursePassGrade:Float
        isEnrollAllowedAfterDropCourse:Boolean
        isInstructorCoursesLimit:Boolean
        instructorCoursesLimit:Int
        isApproveInstructorAccounts:Boolean
        isApproveStudentAccounts:Boolean
        isContentBlockedCourseEnd:Boolean
        studentFileSizeLimit:Float
        instructorFileSizeLimit:Float
        isPasswordRequiredStartTest:Boolean
        voiceRecordTimeLimit:Float
        blockedInstructors:[ID]
        isChatAllowedOutsideOfficehours:Boolean

        isSendTestNotifications:Boolean
        isSendTestEmails:Boolean
        isSendLessonNotifications:Boolean
        isSendLessonEmails:Boolean
        isSendAssignmentNotifications:Boolean
        isSendAssignmentEmails:Boolean
        isSendCourseNotifications:Boolean
        isSendCourseEmails:Boolean

        isTestNotifications:Boolean
        isTestEmails:Boolean
        isLessonNotifications:Boolean
        isLessonEmails:Boolean
        isAssignmentNotifications:Boolean
        isAssignmentEmails:Boolean
        isCourseNotifications:Boolean
        isCourseEmails:Boolean

        isEnrollEmails:Boolean
        isEnrollNotifications:Boolean
        isDropCourseEmails:Boolean
        isDropCourseNotifications:Boolean
        isNewInstructorAccountEmails:Boolean
        isNewInstructorAccountNotifications:Boolean
        isAllowDeleteStudentAccount:Boolean
        isAllowDeleteInstructorAccount:Boolean

        blockedStudents:[ID]
        blockedStudentsChat:[ID]
        coursesIsChatAllowedOutsideOfficehours:[ID]
    }

    input ConfigurationInputData {
        isChatNotifications:Boolean!
        isHideActiveStatus: Boolean!
        dropCourseGrade: Float
        isDropCoursePenalty: Boolean
        coursePassGrade: Float
        isEnrollAllowedAfterDropCourse:Boolean
        isInstructorCoursesLimit:Boolean
        instructorCoursesLimit:Int
        isApproveInstructorAccounts:Boolean
        isApproveStudentAccounts:Boolean
        isContentBlockedCourseEnd:Boolean
        studentFileSizeLimit:Float
        instructorFileSizeLimit:Float
        isPasswordRequiredStartTest:Boolean
        voiceRecordTimeLimit:Float
        blockedInstructors:[ID]
        isChatAllowedOutsideOfficehours:Boolean
        isSendTestNotifications:Boolean
        isSendTestEmails:Boolean
        isSendLessonNotifications:Boolean
        isSendLessonEmails:Boolean
        isSendAssignmentNotifications:Boolean
        isSendAssignmentEmails:Boolean
        isSendCourseNotifications:Boolean
        isSendCourseEmails:Boolean
        isTestNotifications:Boolean
        isTestEmails:Boolean
        isLessonNotifications:Boolean
        isLessonEmails:Boolean
        isAssignmentNotifications:Boolean
        isAssignmentEmails:Boolean
        isCourseNotifications:Boolean
        isCourseEmails:Boolean
        isEnrollEmails:Boolean
        isEnrollNotifications:Boolean
        isDropCourseEmails:Boolean
        isDropCourseNotifications:Boolean
        isNewInstructorAccountEmails:Boolean
        isNewInstructorAccountNotifications:Boolean
        isAllowDeleteStudentAccount:Boolean
        isAllowDeleteInstructorAccount:Boolean

        blockedStudents:[ID]
        blockedStudentsChat:[ID]
    }

    type RootQuery {
        configuration: Configuration!
    }

    type RootMutation {
        updateConfiguration(configurationInput: ConfigurationInputData): Boolean
    }

    schema {
        query: RootQuery
        mutation: RootMutation
    }
`);
