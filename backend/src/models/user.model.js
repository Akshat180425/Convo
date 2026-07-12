import mongoose from "mongoose";
 
const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    googleId: {
      type: String,
      default: "",
    },
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    passwordSet: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: true,
    },
    emailVerificationCode: {
      type: String,
      default: "",
    },
    emailVerificationExpires: {
      type: Date,
      default: null,
    },
    passwordResetCode: {
      type: String,
      default: "",
    },
    passwordResetExpires: {
      type: Date,
      default: null,
    },
    profilePic: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      default: "Hey! I'm on Convo. Let's Chat!",
    },
    friends: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    sentFriendRequests: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    receivedFriendRequests: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    privacy: {
      lastSeen: {
        type: String,
        enum: ["everyone", "friends", "nobody"],
        default: "friends",
      },
      onlineStatus: {
        type: String,
        enum: ["everyone", "friends", "nobody"],
        default: "friends",
      },
      profilePhoto: {
        type: String,
        enum: ["everyone", "friends", "nobody"],
        default: "friends",
      },
      readReceipts: {
        type: Boolean,
        default: true,
      },
    },
    favoriteChats: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    blockedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    starredMessages: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
      },
    ],
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
