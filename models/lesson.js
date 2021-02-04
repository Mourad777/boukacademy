const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const lessonSchema = new Schema(
  {
    lessonName: {
      type: String,
      required: true,
    },
    published: {
      type: Boolean,
      required: true,
    },
    availableOnDate: {
      type: Date,
      required: false,
    },
    lessonSlides: [
      {
        slideContent: {
          type: String,
          required: false,
        },
        audio: {
          type: String,
          required: false,
        },
        video: {
          type: String,
          required: false,
        },
        studentsSeen:[{
            type: Schema.Types.ObjectId,
            ref: "Student",
            required:false,
        }]
      },
    ],
    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Lesson", lessonSchema);
