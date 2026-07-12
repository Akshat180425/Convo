import mongoose from "mongoose";

export const REPORT_REASONS = [
  "harassment",
  "spam",
  "scam",
  "hate",
  "inappropriate",
  "impersonation",
  "other",
];

const messageSnapshotSchema = new mongoose.Schema(
  {
    text: { type: String, default: "" },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    senderName: { type: String, default: "" },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group", default: null },
    createdAt: { type: Date, default: null },
    editedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
    isDeletedAtReportTime: { type: Boolean, default: false },
  },
  { _id: false }
);

const reportSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["user", "message"],
      required: true,
      index: true,
    },
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    reportedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
      index: true,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      default: null,
      index: true,
    },
    chatType: {
      type: String,
      enum: ["direct", "group", "profile"],
      required: true,
    },
    reason: {
      type: String,
      enum: REPORT_REASONS,
      required: true,
    },
    details: {
      type: String,
      default: "",
      maxlength: 800,
    },
    status: {
      type: String,
      enum: ["pending", "verified", "dismissed", "action_taken"],
      default: "pending",
      index: true,
    },
    messageSnapshot: {
      type: messageSnapshotSchema,
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

reportSchema.index(
  { reporterId: 1, messageId: 1 },
  {
    unique: true,
    partialFilterExpression: { type: "message", messageId: { $exists: true, $ne: null } },
  }
);
reportSchema.index(
  { reporterId: 1, reportedUserId: 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: { type: "user" },
  }
);

const Report = mongoose.model("Report", reportSchema);

export default Report;
