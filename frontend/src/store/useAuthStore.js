import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const BASE_URL = import.meta.env.MODE === "development" ? "http://localhost:5001" : "/";

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isVerifyingEmail: false,
  isRequestingPasswordReset: false,
  isResettingPassword: false,
  isSettingPassword: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  lastSeenByUser: {},
  socket: null,

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");

      set({ authUser: res.data });
      get().connectSocket();
    } catch (error) {
      console.log("Error in checkAuth:", error);
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      toast.success(res.data.message || "Verification code sent");
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create account");
      return null;
    } finally {
      set({ isSigningUp: false });
    }
  },

  verifyEmail: async (data) => {
    set({ isVerifyingEmail: true });
    try {
      const res = await axiosInstance.post("/auth/verify-email", data);
      set({ authUser: res.data });
      toast.success("Email verified successfully");
      get().connectSocket();
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to verify email");
      return false;
    } finally {
      set({ isVerifyingEmail: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      set({ authUser: res.data });
      toast.success("Logged in successfully");

      get().connectSocket();
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to log in");
      return false;
    } finally {
      set({ isLoggingIn: false });
    }
  },

  googleLogin: async (credential) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/google", { credential });
      set({ authUser: res.data });
      toast.success("Logged in with Google");
      get().connectSocket();
      return true;
    } catch (error) {
      console.error("Google login error:", error);
      const message =
        error.response?.data?.message ||
        (error.response?.status ? `Google login failed (${error.response.status})` : "Google login failed");
      toast.error(message);
      return false;
    } finally {
      set({ isLoggingIn: false });
    }
  },

  connectGoogle: async (credential) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.post("/auth/connect-google", { credential });
      set({ authUser: res.data });
      toast.success("Google connected successfully");
      return true;
    } catch (error) {
      console.error("Google connection error:", error);
      const message =
        error.response?.data?.message ||
        (error.response?.status ? `Failed to connect Google (${error.response.status})` : "Failed to connect Google");
      toast.error(message);
      return false;
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  requestPasswordReset: async (data) => {
    set({ isRequestingPasswordReset: true });
    try {
      const res = await axiosInstance.post("/auth/forgot-password", data);
      toast.success(res.data.message || "Reset code sent");
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send reset code");
      return false;
    } finally {
      set({ isRequestingPasswordReset: false });
    }
  },

  resetPassword: async (data) => {
    set({ isResettingPassword: true });
    try {
      const res = await axiosInstance.post("/auth/reset-password", data);
      toast.success(res.data.message || "Password updated successfully");
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to reset password");
      return false;
    } finally {
      set({ isResettingPassword: false });
    }
  },

  setPassword: async (data) => {
    set({ isSettingPassword: true });
    try {
      const res = await axiosInstance.put("/auth/set-password", data);
      set({ authUser: res.data });
      toast.success("Password set successfully");
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to set password");
      return false;
    } finally {
      set({ isSettingPassword: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      set({ authUser: null });
      toast.success("Logged out successfully");
      get().disconnectSocket();
    } catch (error) {
      toast.error(error.response.data.message);
    }
  },

  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
      toast.success("Profile updated successfully");
      return true;
    } catch (error) {
      console.log("error in update profile:", error);
      toast.error(error.response?.data?.message || "Failed to update profile");
      return false;
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  connectSocket: () => {
    const { authUser } = get();
    if (!authUser || get().socket?.connected) return;

    const socket = io(BASE_URL, {
      query: {
        userId: authUser._id,
      },
    });
    socket.connect();

    set({ socket: socket });

    socket.on("getOnlineUsers", (userIds) => {
      set({ onlineUsers: userIds });
    });

    socket.on("userLastSeen", ({ userId, lastSeen }) => {
      set((state) => ({
        lastSeenByUser: { ...state.lastSeenByUser, [userId]: lastSeen },
      }));
    });
  },
  disconnectSocket: () => {
    if (get().socket?.connected) get().socket.disconnect();
  },
}));
