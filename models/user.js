const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  dob: {
    type: String,
    required: true,
  },
  // sex: {
  //   type: String,
  //   required: true,
  // },
  profilePicture: {
    type: String,
    required: false,
  },
  lastLogin: {
    type: Date,
    required: false,
  },
  passwordResetToken: {
    type: String,
    required: false,
  },
  passwordResetTokenExpiration: {
    type: Date,
    required: false,
  },
  accountVerificationToken: {
    type: String,
    required: false,
  },
  accountVerificationTokenExpiration: {
    type: Date,
    required: false,
  },
  accountVerified: {
    type: Boolean,
    required: true,
  },
  language: {
    type: String,
    required: true,
  },
  isAccountApproved: {
    type: Boolean,
    required: true,
  },
  isAccountSuspended: {
    type: Boolean,
    required: true,
  },
  notificationSubscription: {
    endpoint: {
      type: String,
      required: false,
    },
    expirationTime: {
      type: Number,
      required: false,
    },
    keys: {
      p256dh: {
        type: String,
        required: false,
      },
      auth: {
        type: String,
        required: false,
      }
    }
  },
  configuration: { type: mongoose.Schema.Types.ObjectId, ref: "Configuration" },
});

// Extend function
const extend = (Schema, obj) =>
  new mongoose.Schema(Object.assign({}, Schema.obj, obj));

exports.extend = extend;
exports.UserSchema = UserSchema;
exports.User = mongoose.model("User", UserSchema);
