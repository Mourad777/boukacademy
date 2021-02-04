const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const questionSchema = new Schema({
  course: {
    type: Schema.Types.ObjectId,
    ref: "Course",
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
  //mc specific
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
  //speaking question specific
  questionAudio: {
    type: String,
    required: false,
  },
  audio: {
    type: String,
    required: false,
  },
  //fill in blanks specific
  blanks: [
    {
      correctAnswer: {
        type: String,
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
  //all questions have in common
  question: {
    type: String,
    required: false,
  },
  solution: {
    type: String,
    required: false,
  },
  language: {
    type: String,
    required: true,
  },
  tags: [
    {
      type: String,
      required: false,
    },
  ],
  difficulty:{
      type:String,
      required:true,
  }
});

module.exports = mongoose.model("Question", questionSchema);
