const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const testSchema = new Schema({
  course: {
    type: Schema.Types.ObjectId,
    ref: "Course",
    required: true,
  },
  published: {
    type: Boolean,
    required: true,
  },
  instructor: {
    type: Schema.Types.ObjectId,
    ref: "Instructor",
    required: true,
  },
  testName: {
    type: String,
    required: true,
  },
  testType: {
    type: String,
    required: false,
  },
  availableOnDate: {
    type: Date,
    required: false,
  },
  gradeReleaseDate: {
    type: Date,
    required: false,
  },
  dueDate: {
    type: Date,
    required: false,
  },
  weight: {
    type: Number,
    required: true,
  },
  timer: {
    type: Number,
    required: false,
  },
  assignment: {
    type: Boolean,
    required: true,
  },
  blockedNotes: {
    type: Boolean,
    required: true,
  },
  notes: {
    type: String,
    required: false,
  },
  allowLateSubmission: {
    type: Boolean,
    required: false,
  },
  isGradeIncluded: {
    type: Boolean,
    required: true,
  },
  passingGrade: {
    type: Number,
    required: false,
  },
  passingRequired: {
    type: Boolean,
    required: false,
  },
  latePenalty: {
    type: Number,
    required: false,
  },
  lateDaysAllowed: {
    type: Number,
    required: false,
  },
  classAverage: {
    type:Number,
    required:false,
  },
  sectionWeights: {
    mcSection: {
      type: Number,
      required: false,
    },
    essaySection: {
      type: Number,
      required: false,
    },
    speakingSection: {
      type: Number,
      required: false,
    },
    fillBlankSection: {
      type: Number,
      required: false,
    },
  },
  multipleChoiceQuestions: [
    {
      question: {
        type: String,
        required: true,
      },
      marks: {
        type: Number,
        required: true,
      },
      correctAnswers: [
        {
          type: String,
          required: true,
        },
      ],
      answerOptions: [
        {
          type: String,
          required: true,
        },
      ],
      solution: {
        type: String,
        required: false,
      },
    },
  ],
  speakingQuestions: [
    {
      question: {
        type: String,
        required: false,
      },
      marks: {
        type: Number,
        required: true,
      },
      questionAudio: {
        type: String,
        required: false,
      },
      audio: {
        type: String,
        required: false,
      },
    },
  ],
  fillInBlanksQuestions: {
    text: {
      type: String,
      required: false,
    },
    blanks: [
      {
        correctAnswer: {
          type: String,
          required: true,
        },
        marks: {
          type: Number,
          required: true,
        },
        selectableAnswer: {
          type: Boolean,
          required: true,
        },
        incorrectAnswers: [
          {
            type: String,
            required: false,
          },
        ],
        audio: {
          type: String,
          required: false,
        },
      },
    ],
  },
  essayQuestions: [
    {
      question: {
        type: String,
        required: true,
      },
      marks: {
        type: Number,
        required: true,
      },
      solution: {
        type: String,
        required: false,
      },
    },
  ],
  readingMaterials: [
    {
      section: {
        type: String,
        required: false,
      },
      content: {
        type: String,
        required: false,
      },
      fileUpload: {
        type: Boolean,
        required: false,
      }
    },
  ],
  audioMaterials: [
    {
      section: {
        type: String,
        required: false,
      },
      audio: {
        type: String,
        required: false,
      },
      fileUpload: {
        type: Boolean,
        required: false,
      }
    },
  ],
  videoMaterials: [
    {
      section: {
        type: String,
        required: false,
      },
      video: {
        type: String,
        required: false,
      },
    },
  ],
},
{
  timestamps:true
});

module.exports = mongoose.model("Test", testSchema);
