import express from "express";
import {
  checkAuth,
  connectGoogle,
  forgotPassword,
  getUserById,
  googleLogin,
  login,
  logout,
  resetPassword,
  setPassword,
  signup,
  updateProfile,
  verifyEmail,
} from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/verify-email", verifyEmail);
router.post("/login", login);
router.post("/google", googleLogin);
router.post("/logout", logout);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/user/:id", protectRoute, getUserById);
router.post("/connect-google", protectRoute, connectGoogle);
router.put("/connect-google", protectRoute, connectGoogle);
router.put("/set-password", protectRoute, setPassword);
router.put("/update-profile", protectRoute, updateProfile);

router.get("/check", protectRoute, checkAuth);

export default router;
