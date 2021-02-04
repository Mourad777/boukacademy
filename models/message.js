const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const messageSchema = new Schema(
  {
    content: {
      type: String,
      required: false,
    },
    file: {
      type: String,
      required: false,
    },
    type: {
      type: String,
      required: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    recipient:{
      type: Schema.Types.ObjectId,
      required: true,
    },
    course:{
      type: Schema.Types.ObjectId,
      required: true,
    },
    // group: {
    //   type: Schema.Types.ObjectId,
    //   required:true,
    // },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Message", messageSchema);
