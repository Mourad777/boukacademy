const mongoose = require("mongoose");
const { UserSchema, extend } = require("./user");
const Schema = mongoose.Schema;

const instructorSchema = extend(UserSchema, {
  blockedContacts: [
    {
      type: Schema.Types.ObjectId,
      required: false,
    },
  ],
  coursesTeaching: [
    {
      type: Schema.Types.ObjectId,
      // status: String,
      ref: "Course",
    },
  ],
  documents: [
    {
      document: {
        type: String,
        required: false,
      },
      documentType: {
        type: String,
        required: false,
      },
    },
  ],
  admin: {
    type: Boolean,
    required: true,
  },

});

module.exports = mongoose.model("Instructor", instructorSchema);
