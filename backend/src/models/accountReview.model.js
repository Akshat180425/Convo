import mongoose from "mongoose";

const accountReviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending_review", "reviewed", "dismissed"],
      default: "pending_review",
      index: true,
    },
    reason: {
      type: String,
      default: "10+ verified reported messages",
    },
    verifiedMessageReportCount: {
      type: Number,
      default: 0,
    },
    verifiedMessageIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
      },
    ],
    lastTriggeredAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const AccountReview = mongoose.model("AccountReview", accountReviewSchema);

export default AccountReview;
