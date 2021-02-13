const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const resultSchema = new Schema(
  {
    student: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Student",
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    test: {
      type: Schema.Types.ObjectId,
      ref: "Test",
      required: true,
    },
    closed: {
      type: Boolean,
      required: true,
    },
    isExcused:{
      type:Boolean,
      required:true,
    },
    grade: {
      type: Number,
      required: false,
    },
    gradeOverride: {
      type: Boolean,
      required: false,
    },
    gradeAdjustmentExplanation: {
      type: String,
      required: false,
    },
    startedOn: {
      type: Date,
      required: false,
    },
    lastSavedOn: {
      type: Date,
      required: false,
    },
    graded: {
      type: Boolean,
      required: true,
    },
    gradingInProgress: {
      type: Boolean,
      required: true,
    },
    latePenalty: {
      type: Number,
      required: false,
    },
    submittedOn: {
      type: Date,
      required: false,
    },
    multiplechoiceSection: {
      answers: [
        {
          questionNumber: {
            type: Number,
            required: true,
          },
          answers: [
            {
              type: String,
              required: false,
            },
          ],
          additionalNotes: {
            type: String,
            required: false,
          },
          marks: {
            type: Number,
            required: false,
          },
        },
      ],
      grade: {
        type: Number,
        required: false,
      },
    },
    essaySection: {
      answers: [
        {
          questionNumber: {
            type: Number,
            required: true,
          },
          answer: {
            type: String,
            required: false,
          },
          additionalNotes: {
            type: String,
            required: false,
          },
          instructorCorrection: {
            type: String,
            required: false,
          },
          allowCorrection: {
            type: Boolean,
            required: false,
          },
          marks: {
            type: Number,
            required: false,
          },
        },
      ],
      grade: {
        type: Number,
        required: false,
      },
    },
    speakingSection: {
      answers: [
        {
          questionNumber: {
            type: Number,
            required: true,
          },
          answer: {
            type: String,
            required: false,
          },
          additionalNotes: {
            type: String,
            required: false,
          },
          feedbackAudio: {
            type: String,
            required: false,
          },
          marks: {
            type: Number,
            required: false,
          },
        },
      ],
      grade: {
        type: Number,
        required: false,
      },
    },
    fillInBlanksSection: {
      answers: [
        {
          questionNumber: {
            type: Number,
            required: true,
          },
          answer: {
            type: String,
            required: false,
          },
          additionalNotes: {
            type: String,
            required: false,
          },
          marks: {
            type: Number,
            required: false,
          },
        },
      ],
      grade: {
        type: Number,
        required: false,
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Result", resultSchema);
