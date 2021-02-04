const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const notificationSchema = new Schema(
  {
    content: [
      {
        type: String,
        required: true,
      },
    ],
    usersSeen: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: false,
      },
    ],
    toUserType: {
      type: String,
      required: true,
    },
    toSpecificUser: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    fromUser: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    senderFirstName: {
      type: String,
      required: false,
    },
    senderLastName: {
      type: String,
      required: false,
    },
    documentType: {
      type: String,
      required: false,
    },
    avatar: {
      type: String,
      required: false,
    },
    documentId: {
      type: Schema.Types.ObjectId,
      required: false,
    },
    course: {
      type: Schema.Types.ObjectId,
      required: false,
      ref: "Course",
    },
    message:{
      type: String,
      required: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      //   index: { expires: "2m" },
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 3 * 24 * 60 * 60 }, //remove document after 3 days
  { unique: true }
);

// notificationSchema.index({expireAt: 1},{expireAfterSeconds: 0});

module.exports = mongoose.model("Notification", notificationSchema);
