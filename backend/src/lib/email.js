import nodemailer from "nodemailer";
import { config } from "dotenv";

config();

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
  REPORT_REVIEW_EMAIL,
  NODE_ENV,
} = process.env;

const hasSmtpConfig = SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS;

const transporter = hasSmtpConfig
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: SMTP_SECURE === "true",
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    })
  : null;

const sendEmail = async ({ to, subject, text, html, attachments = [] }) => {
  if (!transporter) {
    if (NODE_ENV !== "production") {
      console.log(`[Email disabled] ${subject} for ${to}: ${text}`);
      return;
    }

    throw new Error("Email service is not configured");
  }

  await transporter.sendMail({
    from: SMTP_FROM || SMTP_USER,
    to,
    subject,
    text,
    html,
    attachments,
  });
};

export const sendVerificationEmail = async ({ to, code }) => {
  await sendEmail({
    to,
    subject: "Verify your Convo email",
    text: `Your Convo verification code is ${code}. It expires in 15 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>Verify your Convo email</h2>
        <p>Your verification code is:</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px;">${code}</p>
        <p>This code expires in 15 minutes.</p>
      </div>
    `,
  });
};

export const sendPasswordResetEmail = async ({ to, code }) => {
  await sendEmail({
    to,
    subject: "Reset your Convo password",
    text: `Your Convo password reset code is ${code}. It expires in 15 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>Reset your Convo password</h2>
        <p>Your password reset code is:</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px;">${code}</p>
        <p>This code expires in 15 minutes.</p>
      </div>
    `,
  });
};

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const buildReportEmailHtml = ({ report, reportLines }) => `
  <div style="font-family: Arial, sans-serif; line-height: 1.5;">
    <h2>Convo moderation review</h2>
    <p>A ${escapeHtml(report.type)} report was submitted.</p>
    <ul>
      ${reportLines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}
    </ul>
  </div>
`;

export const sendReportReviewEmail = async ({ report, reporter, reportedUser }) => {
  const reviewEmail = REPORT_REVIEW_EMAIL || SMTP_USER;
  if (!reviewEmail) return;

  const snapshot = report.messageSnapshot || {};
  const title = report.type === "message" ? "Message report" : "User report";
  const reportLines = [
    `Report ID: ${report._id}`,
    `Report type: ${report.type}`,
    `Reason: ${report.reason}`,
    `Reporter: ${reporter?.fullName || "Unknown"} (${reporter?.email || report.reporterId})`,
    `Reported user: ${reportedUser?.fullName || "Unknown"} (${reportedUser?.email || report.reportedUserId})`,
    `Details: ${report.details || "None"}`,
    report.messageId ? `Message ID: ${report.messageId}` : "",
    report.groupId ? `Group ID: ${report.groupId}` : "",
    snapshot.text ? `Message text: ${snapshot.text}` : "",
  ].filter(Boolean);

  await sendEmail({
    to: reviewEmail,
    subject: `Convo moderation review: ${title}`,
    text: reportLines.join("\n"),
    html: buildReportEmailHtml({
      report,
      reportLines,
    }),
  });
};

export const sendAccountReviewEmail = async ({ accountReview, reportedUser }) => {
  const reviewEmail = REPORT_REVIEW_EMAIL || SMTP_USER;
  if (!reviewEmail) return;

  await sendEmail({
    to: reviewEmail,
    subject: "Convo moderation review: account flagged",
    text: [
      `User: ${reportedUser?.fullName || "Unknown"} (${reportedUser?.email || accountReview.userId})`,
      `Reason: ${accountReview.reason}`,
      `Verified unique reported messages: ${accountReview.verifiedMessageReportCount}`,
      `Status: ${accountReview.status}`,
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>Convo account flagged for review</h2>
        <p><strong>User:</strong> ${escapeHtml(reportedUser?.fullName || "Unknown")} (${escapeHtml(reportedUser?.email || accountReview.userId)})</p>
        <p><strong>Reason:</strong> ${escapeHtml(accountReview.reason)}</p>
        <p><strong>Verified unique reported messages:</strong> ${accountReview.verifiedMessageReportCount}</p>
      </div>
    `,
  });
};
