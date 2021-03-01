const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const configurationSchema = new Schema(
  {
    user: {
      //all
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    isChatNotifications: {
      //all
      type: Boolean,
      required: false,
    },
    isHideActiveStatus: {
      //all
      type: Boolean,
      required: false,
    },
    dropCourseGrade: {
      //admin
      type: Number,
      required: false,
    },
    isDropCoursePenalty: {
      //admin
      type: Boolean,
      required: false,
    },
    coursePassGrade: {
      //admin
      type: Number,
      required: false,
    },
    isEnrollAllowedAfterDropCourse: {
      //admin
      type: Boolean,
      required: false,
    },
    isInstructorCoursesLimit: {
      //admin
      type: Boolean,
      required: false,
    },
    instructorCoursesLimit: {
      //admin
      type: Number,
      required: false,
    },
    isApproveInstructorAccounts: {
      //admin
      type: Boolean,
      required: false,
    },
    isApproveStudentAccounts: {
      //admin
      type: Boolean,
      required: false,
    },
    isApproveEnrollments: {
      //admin
      type: Boolean,
      required: false,
    },
    isContentBlockedCourseEnd: {
      //admin
      type: Boolean,
      required: false,
    },
    studentFileSizeLimit: {
      //admin
      type: Number,
      required: false,
    },
    instructorFileSizeLimit: {
      //admin
      type: Number,
      required: false,
    },
    isPasswordRequiredStartTest: {
      //admin
      type: Boolean,
      required: false,
    },
    voiceRecordTimeLimit: {
      //admin
      type: Number,
      required: false,
    },
    //admin
    blockedInstructors: [
      { type: Schema.Types.ObjectId, ref: "Instructor", required: false },
    ],
    isChatAllowedOutsideOfficehours: {
      //instructor
      type: Boolean,
      required: false,
    },
    
    isSendTestNotifications: {
      //instructor
      type: Boolean,
      required: false,
    },
    isSendTestEmails: {
      //instructor
      type: Boolean,
      required: false,
    },
    isSendLessonNotifications: {
      //instructor
      type: Boolean,
      required: false,
    },
    isSendLessonEmails: {
      //instructor
      type: Boolean,
      required: false,
    },
    isSendAssignmentNotifications: {
      //instructor
      type: Boolean,
      required: false,
    },
    isSendAssignmentEmails: {
      //instructor
      type: Boolean,
      required: false,
    },
    isSendCourseNotifications: {
      //instructor
      type: Boolean,
      required: false,
    },
    isSendCourseEmails: {
      //instructor
      type: Boolean,
      required: false,
    },
    
    isTestNotifications: {
      //student
      type: Boolean,
      required: false,
    },
    isTestEmails: {
      //student
      type: Boolean,
      required: false,
    },
    isLessonNotifications: {
      //student
      type: Boolean,
      required: false,
    },
    isLessonEmails: {
      //student
      type: Boolean,
      required: false,
    },
    isAssignmentNotifications: {
      //student
      type: Boolean,
      required: false,
    },
    isAssignmentEmails: {
      //student
      type: Boolean,
      required: false,
    },
    isCourseNotifications: {
      //student
      type: Boolean,
      required: false,
    },
    isCourseEmails: {
      //student
      type: Boolean,
      required: false,
    },

    //instructor
    isEnrollEmails:{
      type: Boolean,
      required: false,
    },
    isEnrollNotifications:{
      type: Boolean,
      required: false,
    },
    isDropCourseEmails:{
      type: Boolean,
      required: false,
    },
    isDropCourseNotifications:{
      type: Boolean,
      required: false,
    },

    //admin
    isNewInstructorAccountEmails:{
      type: Boolean,
      required: false,
    },
    isNewInstructorAccountNotifications:{
      type: Boolean,
      required: false,
    },
    isNewStudentAccountEmails:{
      type: Boolean,
      required: false,
    },
    isNewStudentAccountNotifications:{
      type: Boolean,
      required: false,
    },
    // isAllowDeleteStudentAccount:{
    //   type: Boolean,
    //   required: false,
    // },
    // isAllowDeleteInstructorAccount:{
    //   type: Boolean,
    //   required: false,
    // },

    // //student
    // blockedStudentsChat: [{ type: Schema.Types.ObjectId, ref: "Student" }],
    // //student
    // blockedStudents: [{ type: Schema.Types.ObjectId, ref: "Student" }],
  },
  {
    timestamps: false,
  }
);

module.exports = mongoose.model("Configuration", configurationSchema);
