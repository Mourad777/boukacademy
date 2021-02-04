const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const courseSchema = new Schema(
  {
    courseName: {
      type: String,
      required: true,
    },
    studentCapacity: {
      type: Number,
      required: false,
    },
    language: {
      type: String,
      required: false,
    },
    courseInstructor: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Instructor",
    },
    courseImage: {
      type: String,
      required: false,
    },
    courseActive: {
      type: Boolean,
      required: true,
    },
    prerequisites: [
      {
        type: Schema.Types.ObjectId,
        ref: "Course",
      },
    ],

    studentsEnrollRequests: [
      {
        student: {
          type: Schema.Types.ObjectId,
          ref: "Student",
        },
        approved: {
          type: Boolean,
          required: true,
        },
        denied: {
          type: Boolean,
          required: true,
        },
        deniedReason: {
          type: String,
          required: false,
        },
        droppedOut: {
          type: Boolean,
          required: true,
        },
        resubmissionAllowed: {
          type: Boolean,
          required: true,
        },
      },
    ],
    studentGrades: [
      {
        student: {
          type: Schema.Types.ObjectId,
          ref: "Student",
          required: true,
        },
        passed: {
          type: Boolean,
          required: true,
        },
        grade: {
          type: Number,
          required: true,
        },
        gradeOverride: {
          type: Boolean,
          required: true,
        },
        gradeAdjustmentExplanation: {
          type: String,
          required: false,
        },
      },
    ],

    // studentsEnrollRequested: [
    //   {
    //     type: Schema.Types.ObjectId,
    //     ref: "Student",
    //   },
    // ],
    // studentsEnrollDenied: [
    //   {
    //     type: Schema.Types.ObjectId,
    //     ref: "Student",
    //   },
    // ],
    // studentsEnrolled: [
    //   {
    //     type: Schema.Types.ObjectId,
    //     ref: "Student",
    //   },
    // ],
    // studentsDropped: [
    //   {
    //     type: Schema.Types.ObjectId,
    //     ref: "Student",
    //   },
    // ],

    tests: [
      {
        type: Schema.Types.ObjectId,
        ref: "Test",
      },
    ],
    lessons: [
      {
        type: Schema.Types.ObjectId,
        ref: "Lesson",
      },
    ],
    resources: [
      {
        resourceName: {
          type: String,
          required: false,
        },
        resource: {
          type: String,
          required: false,
        },
      },
    ],
    syllabus: {
      type: String,
      required: false,
    },
    enrollmentStartDate: {
      type: Date,
      required: false,
    },
    enrollmentEndDate: {
      type: Date,
      required: false,
    },
    courseStartDate: {
      type: Date,
      required: false,
    },
    courseEndDate: {
      type: Date,
      required: false,
    },
    courseDropDeadline: {
      type: Date,
      required: false,
    },
    regularOfficeHours: [
      {
        day: {
          type: String,
          required: false,
        },
        startTime: {
          type: String,
          required: false,
        },
        endTime: {
          type: String,
          required: false,
        },
        timezoneRegion: {
          type: String,
          required: false,
        },
        // timezoneOffset: {
        //   type: Number,
        //   required: false,
        // },
      },
    ],
    irregularOfficeHours: [
      {
        date: {
          type: Date,
          required: false,
        },
        startTime: {
          type: String,
          required: false,
        },
        endTime: {
          type: String,
          required: false,
        },
        timezoneRegion: {
          type: String,
          required: false,
        },
        // timezoneOffset: {
        //   type: Number,
        //   required: false,
        // },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Course", courseSchema);
