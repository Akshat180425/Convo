import AccountReview from "../models/accountReview.model.js";
import Group from "../models/group.model.js";
import Message from "../models/message.model.js";
import Report, { REPORT_REASONS } from "../models/report.model.js";
import User from "../models/user.model.js";
import { sendAccountReviewEmail, sendReportReviewEmail } from "../lib/email.js";

const VERIFIED_MESSAGE_REPORT_THRESHOLD = 10;

const toId = (value) => value?._id?.toString() || value?.toString();

const includesId = (values = [], id) =>
  values.some((value) => toId(value) === toId(id));

const normalizeReason = (reason) => String(reason || "").trim().toLowerCase();

const normalizeDetails = (details) => String(details || "").trim().slice(0, 800);

const canAccessMessage = async (message, user) => {
  if (!message) return false;

  if (message.groupId) {
    const group = await Group.findById(message.groupId).select("members");
    return Boolean(group && includesId(group.members, user._id));
  }

  return toId(message.senderId) === toId(user._id) || toId(message.receiverId) === toId(user._id);
};

const createMessageSnapshot = (message) => ({
  text: message.text || "",
  senderId: message.senderId?._id || message.senderId || null,
  senderName: message.senderId?.fullName || "",
  receiverId: message.receiverId || null,
  groupId: message.groupId || null,
  createdAt: message.createdAt || null,
  editedAt: message.editedAt || null,
  deletedAt: message.deletedAt || null,
  isDeletedAtReportTime: Boolean(message.isDeleted),
});

const notifyReportReview = async (report, reporter, reportedUser) => {
  try {
    await sendReportReviewEmail({ report, reporter, reportedUser });
  } catch (error) {
    console.warn("Report review email failed:", error.message);
  }
};

const notifyAccountReview = async (accountReview, reportedUser) => {
  try {
    await sendAccountReviewEmail({ accountReview, reportedUser });
  } catch (error) {
    console.warn("Account review email failed:", error.message);
  }
};

const refreshAccountReviewForUser = async (userId) => {
  const verifiedReports = await Report.find({
    type: "message",
    reportedUserId: userId,
    status: { $in: ["verified", "action_taken"] },
    messageId: { $ne: null },
  }).select("messageId");

  const verifiedMessageIds = [
    ...new Set(verifiedReports.map((report) => toId(report.messageId)).filter(Boolean)),
  ];

  if (verifiedMessageIds.length < VERIFIED_MESSAGE_REPORT_THRESHOLD) return null;

  const accountReview = await AccountReview.findOneAndUpdate(
    { userId },
    {
      $set: {
        status: "pending_review",
        reason: "10+ verified reported messages",
        verifiedMessageReportCount: verifiedMessageIds.length,
        verifiedMessageIds,
        lastTriggeredAt: new Date(),
      },
    },
    { new: true, upsert: true }
  );

  const reportedUser = await User.findById(userId).select("fullName email");
  await notifyAccountReview(accountReview, reportedUser);
  return accountReview;
};

export const reportMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const reason = normalizeReason(req.body.reason);
    const details = normalizeDetails(req.body.details);

    if (!REPORT_REASONS.includes(reason)) {
      return res.status(400).json({ error: "Select a valid report reason" });
    }

    const message = await Message.findById(messageId)
      .populate("senderId", "fullName email profilePic")
      .populate("receiverId", "fullName email");

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    if (!(await canAccessMessage(message, req.user))) {
      return res.status(403).json({ error: "You cannot report this message" });
    }

    const reportedUserId = message.senderId?._id || message.senderId;

    if (toId(reportedUserId) === toId(req.user._id)) {
      return res.status(400).json({ error: "You cannot report your own message" });
    }

    const existingReport = await Report.findOne({
      type: "message",
      reporterId: req.user._id,
      messageId,
    });

    if (existingReport) {
      return res.status(400).json({ error: "You have already reported this message" });
    }

    const report = await Report.create({
      type: "message",
      reporterId: req.user._id,
      reportedUserId,
      messageId,
      groupId: message.groupId || null,
      chatType: message.groupId ? "group" : "direct",
      reason,
      details,
      messageSnapshot: createMessageSnapshot(message),
    });

    await notifyReportReview(report, req.user, message.senderId);

    res.status(201).json({ message: "Report submitted for review", reportId: report._id });
  } catch (error) {
    console.error("Error in reportMessage controller:", error.message);
    if (error?.code === 11000) {
      return res.status(400).json({ error: "You have already submitted this report" });
    }
    res.status(500).json({ error: "Failed to submit report" });
  }
};

export const reportUser = async (req, res) => {
  try {
    const { id: reportedUserId } = req.params;
    const reason = normalizeReason(req.body.reason);
    const details = normalizeDetails(req.body.details);

    if (!REPORT_REASONS.includes(reason)) {
      return res.status(400).json({ error: "Select a valid report reason" });
    }

    if (toId(reportedUserId) === toId(req.user._id)) {
      return res.status(400).json({ error: "You cannot report yourself" });
    }

    const reportedUser = await User.findById(reportedUserId).select("fullName email profilePic");
    if (!reportedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const existingReport = await Report.findOne({
      type: "user",
      reporterId: req.user._id,
      reportedUserId,
    });

    if (existingReport) {
      return res.status(400).json({ error: "You have already reported this user" });
    }

    const report = await Report.create({
      type: "user",
      reporterId: req.user._id,
      reportedUserId,
      chatType: "profile",
      reason,
      details,
    });

    await notifyReportReview(report, req.user, reportedUser);

    res.status(201).json({ message: "Report submitted for review", reportId: report._id });
  } catch (error) {
    console.error("Error in reportUser controller:", error.message);
    if (error?.code === 11000) {
      return res.status(400).json({ error: "You have already submitted this report" });
    }
    res.status(500).json({ error: "Failed to submit report" });
  }
};

export const updateReportStatus = async (req, res) => {
  try {
    const reviewSecret = process.env.REPORT_REVIEW_SECRET;

    if (!reviewSecret || req.get("x-report-review-secret") !== reviewSecret) {
      return res.status(403).json({ error: "Report review is not authorized" });
    }

    const { id: reportId } = req.params;
    const status = normalizeReason(req.body.status);

    if (!["pending", "verified", "dismissed", "action_taken"].includes(status)) {
      return res.status(400).json({ error: "Select a valid report status" });
    }

    const report = await Report.findByIdAndUpdate(
      reportId,
      {
        status,
        reviewedAt: status === "pending" ? null : new Date(),
      },
      { new: true }
    );

    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }

    const accountReview =
      report.type === "message" && ["verified", "action_taken"].includes(status)
        ? await refreshAccountReviewForUser(report.reportedUserId)
        : null;

    res.status(200).json({
      report,
      accountReview,
    });
  } catch (error) {
    console.error("Error in updateReportStatus controller:", error.message);
    res.status(500).json({ error: "Failed to update report status" });
  }
};
