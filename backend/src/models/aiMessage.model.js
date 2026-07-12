import mongoose from "mongoose";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const aiMessageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    senderId: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + ONE_DAY_MS),
      index: { expires: 0 },
    },
  },
  { timestamps: true }
);

aiMessageSchema.index({ userId: 1, createdAt: 1 });

const AiMessage = mongoose.model("AiMessage", aiMessageSchema);

export default AiMessage;
