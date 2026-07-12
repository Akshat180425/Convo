import { generateToken } from "../lib/utils.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import cloudinary from "../lib/cloudinary.js";
import crypto from "crypto";
import { isEmailSendError, sendPasswordResetEmail, sendVerificationEmail } from "../lib/email.js";
import {
  getPrivacySettings,
  normalizePrivacyUpdate,
  serializeUserForViewer,
} from "../lib/privacy.js";

const CODE_EXPIRY_MS = 15 * 60 * 1000;

const normalizeEmail = (email) => email?.trim().toLowerCase();

const generateCode = () => crypto.randomInt(100000, 999999).toString();

const hashCode = (code) => crypto.createHash("sha256").update(code).digest("hex");

const generateProviderPassword = async () => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(crypto.randomBytes(32).toString("hex"), salt);
};

const userHasPassword = (user) =>
  user.passwordSet !== false && !(user.authProvider === "google" && user.passwordSet !== true);

const isGoogleHostedProfilePic = (profilePic = "") =>
  /googleusercontent\.com|ggpht\.com/.test(profilePic);

const getPublicUser = (user) => ({
  _id: user._id,
  fullName: user.fullName,
  email: user.email,
  profilePic: user.profilePic,
  status: user.status,
  createdAt: user.createdAt,
  authProvider: user.authProvider,
  hasPassword: userHasPassword(user),
  googleConnected: Boolean(user.googleId),
  privacy: getPrivacySettings(user.privacy),
  canViewProfilePhoto: true,
  canViewLastSeen: true,
  canViewOnlineStatus: true,
});

const isPendingEmailVerification = (user) =>
  user.isVerified === false && Boolean(user.emailVerificationCode || user.emailVerificationExpires);

const acceptLegacyUserIfNeeded = async (user) => {
  if (user.isVerified === false && !isPendingEmailVerification(user)) {
    user.isVerified = true;
    await user.save();
  }
};

export const signup = async (req, res) => {
  const { fullName, email, password } = req.body;
  try {
    const normalizedEmail = normalizeEmail(email);

    if (!fullName || !normalizedEmail || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const user = await User.findOne({ email: normalizedEmail });

    if (user && !isPendingEmailVerification(user)) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const verificationCode = generateCode();
    const verificationExpires = new Date(Date.now() + CODE_EXPIRY_MS);

    const userData = {
      fullName: fullName.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      authProvider: "local",
      passwordSet: true,
      isVerified: false,
      emailVerificationCode: hashCode(verificationCode),
      emailVerificationExpires: verificationExpires,
    };

    const newUser = user
      ? await User.findByIdAndUpdate(user._id, userData, { new: true })
      : await User.create(userData);

    await sendVerificationEmail({ to: normalizedEmail, code: verificationCode });

    res.status(201).json({
      email: newUser.email,
      message: "Verification code sent to your email",
    });
  } catch (error) {
    console.log("Error in signup controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const verifyEmail = async (req, res) => {
  const { email, code } = req.body;
  try {
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !code) {
      return res.status(400).json({ message: "Email and verification code are required" });
    }

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.isVerified) return res.status(400).json({ message: "Email is already verified" });
    if (!user.emailVerificationCode || !user.emailVerificationExpires) {
      return res.status(400).json({ message: "No verification code found. Please sign up again." });
    }
    if (user.emailVerificationExpires < new Date()) {
      return res.status(400).json({ message: "Verification code has expired. Please sign up again." });
    }
    if (user.emailVerificationCode !== hashCode(code.trim())) {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    user.isVerified = true;
    user.emailVerificationCode = "";
    user.emailVerificationExpires = null;
    await user.save();

    generateToken(user._id, res);

    res.status(200).json(getPublicUser(user));
  } catch (error) {
    console.log("Error in verifyEmail controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (isPendingEmailVerification(user)) {
      return res.status(403).json({ message: "Please verify your email before logging in" });
    }

    await acceptLegacyUserIfNeeded(user);

    generateToken(user._id, res);

    res.status(200).json(getPublicUser(user));
  } catch (error) {
    console.log("Error in login controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const verifyGoogleCredential = async (credential) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    throw new Error("Google login is not configured");
  }

  let response;
  try {
    response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
    );
  } catch (error) {
    console.error("Google token verification network error:", error.message);
    throw new Error("Could not reach Google to verify this login");
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Google token verification rejected:", errorText);
    throw new Error("Google rejected this login credential");
  }

  const payload = await response.json();

  if (payload.aud !== process.env.GOOGLE_CLIENT_ID) {
    console.error("Google audience mismatch:", {
      receivedClientId: payload.aud,
      expectedClientId: process.env.GOOGLE_CLIENT_ID,
    });
    throw new Error("Google credential audience mismatch");
  }

  if (payload.email_verified !== "true" && payload.email_verified !== true) {
    throw new Error("Google email is not verified");
  }

  if (!payload.email || !payload.sub) {
    throw new Error("Google credential is missing account details");
  }

  return payload;
};

export const googleLogin = async (req, res) => {
  const { credential } = req.body;
  try {
    if (!credential) {
      return res.status(400).json({ message: "Google credential is required" });
    }

    const googleUser = await verifyGoogleCredential(credential);
    const normalizedEmail = normalizeEmail(googleUser.email);

    let user = await User.findOne({
      $or: [{ googleId: googleUser.sub }, { email: normalizedEmail }],
    });

    if (user) {
      user.googleId = googleUser.sub;
      user.authProvider = user.authProvider === "local" ? "local" : "google";
      user.passwordSet = user.authProvider === "local" ? true : user.passwordSet === true;
      user.isVerified = true;
      user.emailVerificationCode = "";
      user.emailVerificationExpires = null;
      if (isGoogleHostedProfilePic(user.profilePic)) user.profilePic = "";
      await user.save();
    } else {
      user = await User.create({
        fullName: googleUser.name || normalizedEmail.split("@")[0],
        email: normalizedEmail,
        password: await generateProviderPassword(),
        googleId: googleUser.sub,
        authProvider: "google",
        passwordSet: false,
        isVerified: true,
        profilePic: "",
      });
    }

    generateToken(user._id, res);

    res.status(200).json(getPublicUser(user));
  } catch (error) {
    console.log("Error in googleLogin controller", error.message);
    res.status(401).json({ message: error.message || "Google login failed" });
  }
};

export const connectGoogle = async (req, res) => {
  const { credential } = req.body;
  try {
    console.log("Connect Google requested for user:", req.user?._id?.toString());

    if (!credential) {
      return res.status(400).json({ message: "Google credential is required" });
    }

    const googleUser = await verifyGoogleCredential(credential);
    const normalizedGoogleEmail = normalizeEmail(googleUser.email);
    const linkedUser = await User.findOne({
      googleId: googleUser.sub,
      _id: { $ne: req.user._id },
    }).select("_id");

    if (linkedUser) {
      return res.status(409).json({ message: "This Google account is already connected to another Convo profile" });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (normalizeEmail(user.email) !== normalizedGoogleEmail) {
      return res.status(400).json({
        message: "Use the Google account with the same email as your Convo account",
      });
    }

    user.googleId = googleUser.sub;
    user.authProvider = user.authProvider || "local";
    user.isVerified = true;
    user.emailVerificationCode = "";
    user.emailVerificationExpires = null;
    if (isGoogleHostedProfilePic(user.profilePic)) user.profilePic = "";
    await user.save();

    res.status(200).json(getPublicUser(user));
  } catch (error) {
    console.log("Error in connectGoogle controller", error.message);
    res.status(500).json({ message: error.message || "Google connection failed" });
  }
};

export const setPassword = async (req, res) => {
  const { password } = req.body;
  try {
    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.authProvider !== "google") {
      return res.status(400).json({ message: "This option is only available for Google accounts" });
    }

    if (userHasPassword(user)) {
      return res.status(400).json({ message: "This account already has a password" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.passwordSet = true;
    await user.save();

    res.status(200).json(getPublicUser(user));
  } catch (error) {
    console.log("Error in setPassword controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ message: "No account found with this email" });
    }

    if (isPendingEmailVerification(user)) {
      return res.status(403).json({ message: "Please verify this account before resetting the password" });
    }

    await acceptLegacyUserIfNeeded(user);

    const resetCode = generateCode();
    user.passwordResetCode = hashCode(resetCode);
    user.passwordResetExpires = new Date(Date.now() + CODE_EXPIRY_MS);
    await user.save();

    try {
      await sendPasswordResetEmail({ to: normalizedEmail, code: resetCode });
    } catch (error) {
      user.passwordResetCode = "";
      user.passwordResetExpires = null;
      await user.save();

      if (isEmailSendError(error)) {
        return res.status(502).json({
          message: "Could not send the reset email. Please try again later.",
        });
      }

      throw error;
    }

    console.log(`Password reset code sent to ${normalizedEmail}`);

    res.status(200).json({ message: "Password reset code sent to your email" });
  } catch (error) {
    console.log("Error in forgotPassword controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const resetPassword = async (req, res) => {
  const { email, code, password } = req.body;
  try {
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !code || !password) {
      return res.status(400).json({ message: "Email, code, and new password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user || !user.passwordResetCode || !user.passwordResetExpires) {
      return res.status(400).json({ message: "Invalid or expired reset request" });
    }
    if (user.passwordResetExpires < new Date()) {
      return res.status(400).json({ message: "Password reset code has expired" });
    }
    if (user.passwordResetCode !== hashCode(code.trim())) {
      return res.status(400).json({ message: "Invalid password reset code" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.passwordResetCode = "";
    user.passwordResetExpires = null;
    await user.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.log("Error in resetPassword controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getUserById = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(serializeUserForViewer(user, req.user));
  } catch (error) {
    console.log("Error in getUserById:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const logout = (req, res) => {
  try {
    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.log("Error in logout controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { profilePic, status, fullName, privacy } = req.body;

    const updateData = {};

    // ✅ Optional Profile Pic
    if (profilePic) {
      const uploadResponse = await cloudinary.uploader.upload(profilePic);
      updateData.profilePic = uploadResponse.secure_url;
    }

    // ✅ Optional Status
    if (typeof status === "string") {
      updateData.status = status;
    }

    // ✅ Optional Full Name
    if (typeof fullName === "string") {
      updateData.fullName = fullName;
    }

    if (privacy && typeof privacy === "object") {
      Object.assign(updateData, normalizePrivacyUpdate(privacy));
    }

    // ❌ No valid data
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "No valid fields provided for update." });
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true });
    res.status(200).json(getPublicUser(updatedUser));
  } catch (error) {
    console.log("Error in updateProfile:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const checkAuth = (req, res) => {
  try {
    res.status(200).json(getPublicUser(req.user));
  } catch (error) {
    console.log("Error in checkAuth controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
