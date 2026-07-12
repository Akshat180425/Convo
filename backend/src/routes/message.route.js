import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  acceptFriendRequest,
  chatWithAssistant,
  createGroup,
  deleteGroup,
  deleteMessage,
  deleteMessageForMe,
  downloadMessageFile,
  editMessage,
  forwardMessage,
  getAiAssistantMessages,
  getFriendRequests,
  getFriendSuggestions,
  getGroupById,
  getGroupMessages,
  getGroupsForSidebar,
  getMessages,
  getStarredMessages,
  getUsersForSidebar,
  leaveGroup,
  removeGroupMember,
  rejectFriendRequest,
  sendMessage,
  sendFriendRequest,
  sendGroupMessage,
  searchAllMessages,
  searchGroupMessages,
  searchMessages,
  suggestReplies,
  toggleBlockUser,
  toggleFavoriteChat,
  togglePinMessage,
  toggleStarMessage,
  updateGroupMemberRole,
  updateGroupProfile,
} from "../controllers/message.controller.js";

const router = express.Router();

router.get("/users", protectRoute, getUsersForSidebar);
router.get("/friends/requests", protectRoute, getFriendRequests);
router.get("/friends/suggestions", protectRoute, getFriendSuggestions);
router.post("/friends/requests/:id", protectRoute, sendFriendRequest);
router.patch("/friends/requests/:id/accept", protectRoute, acceptFriendRequest);
router.delete("/friends/requests/:id", protectRoute, rejectFriendRequest);
router.get("/groups", protectRoute, getGroupsForSidebar);
router.post("/groups", protectRoute, createGroup);
router.get("/groups/:id/profile", protectRoute, getGroupById);
router.put("/groups/:id/profile", protectRoute, updateGroupProfile);
router.patch("/groups/:id/leave", protectRoute, leaveGroup);
router.patch("/groups/:id/members/:memberId/role", protectRoute, updateGroupMemberRole);
router.delete("/groups/:id/members/:memberId", protectRoute, removeGroupMember);
router.delete("/groups/:id", protectRoute, deleteGroup);
router.get("/groups/:id/search", protectRoute, searchGroupMessages);
router.get("/groups/:id", protectRoute, getGroupMessages);
router.get("/starred", protectRoute, getStarredMessages);
router.get("/search/all", protectRoute, searchAllMessages);
router.post("/ai/suggestions/:id", protectRoute, suggestReplies);
router.get("/ai/assistant", protectRoute, getAiAssistantMessages);
router.post("/ai/assistant", protectRoute, chatWithAssistant);
router.get("/files/:id/download", protectRoute, downloadMessageFile);
router.get("/:id/search", protectRoute, searchMessages);
router.get("/:id", protectRoute, getMessages);

router.post("/send/:id", protectRoute, sendMessage);
router.post("/send/group/:id", protectRoute, sendGroupMessage);
router.patch("/users/:id/favorite", protectRoute, toggleFavoriteChat);
router.patch("/users/:id/block", protectRoute, toggleBlockUser);
router.post("/:id/forward", protectRoute, forwardMessage);
router.patch("/:id", protectRoute, editMessage);
router.delete("/:id/me", protectRoute, deleteMessageForMe);
router.delete("/:id", protectRoute, deleteMessage);
router.patch("/:id/pin", protectRoute, togglePinMessage);
router.patch("/:id/star", protectRoute, toggleStarMessage);

export default router;
