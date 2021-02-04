const mongoose = require("mongoose");
const { UserSchema, extend } = require('./user');
const Schema = mongoose.Schema;

const studentSchema = extend(UserSchema,{
  blockedContacts: [
    {
      type: Schema.Types.ObjectId,
      required: false,
    },
  ],
  completedCourses: [
    {
      type: Schema.Types.ObjectId,
      required: false,
      ref:"Course"
    },
  ],
  testInSession: {
    test: {
      type: Schema.Types.ObjectId,
      ref: "Test",
      required: false,
    },
    startTime: {
      type: Date,
      required: false,
    },
    endTime: {
      type: Date,
      required: false,
    },
  },
  assignmentsInSession: [
    {
      assignment: {
        type: Schema.Types.ObjectId,
        ref: "Test",
        required: false,
      },
      startTime: {
        type: Date,
        required: false,
      },
    },
  ],
  testResults: [
    {
      type: Schema.Types.ObjectId,
      ref: "Result",
      required: true,
    },
  ],
  coursesEnrolled: [
    {
      type: Schema.Types.ObjectId,
      // status: String,
      ref: "Course",
    },
  ],
  documents:[
    {
      document: {
        type: String,
        required: false,
      },
      documentType: {
        type: String,
        required: false,
      },
    }
  ]
});

module.exports = mongoose.model("Student", studentSchema);
