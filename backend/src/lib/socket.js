import { Server } from "socket.io";
import http from "http";
import express from "express";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import Group from "../models/group.model.js";
import { getAllowedClientOrigins } from "./clientOrigins.js";
import { canViewPrivacyField, getPrivacySettings, toId } from "./privacy.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: getAllowedClientOrigins(),
    credentials: true,
  },
});

export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

// used to store online users
const userSocketMap = {}; // {userId: socketId}

const getOnlineUserIds = () => Object.keys(userSocketMap);

const emitOnlineUsers = async () => {
  const onlineUserIds = getOnlineUserIds();
  const onlineUsers = await User.find({ _id: { $in: onlineUserIds } }).select("privacy friends");
  const userById = new Map(onlineUsers.map((user) => [toId(user), user]));

  onlineUserIds.forEach((viewerId) => {
    const viewer = userById.get(toId(viewerId)) || { _id: viewerId };
    const visibleOnlineUsers = onlineUsers
      .filter((user) => canViewPrivacyField(user, viewer, "onlineStatus"))
      .map((user) => toId(user));

    io.to(userSocketMap[viewerId]).emit("getOnlineUsers", visibleOnlineUsers);
  });
};

io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  const userId = socket.handshake.query.userId;
  if (userId) userSocketMap[userId] = socket.id;

  emitOnlineUsers().catch((error) => {
    console.error("Error emitting online users:", error.message);
  });

  socket.on("disconnect", async () => {
    console.log("A user disconnected", socket.id);
    delete userSocketMap[userId];
    if (userId) {
      const lastSeen = new Date();
      const disconnectedUser = await User.findByIdAndUpdate(userId, { lastSeen }, { new: true })
        .select("privacy friends lastSeen");
      const viewers = await User.find({ _id: { $in: getOnlineUserIds() } }).select("privacy friends");

      viewers.forEach((viewer) => {
        const viewerSocketId = userSocketMap[toId(viewer)];
        if (viewerSocketId && canViewPrivacyField(disconnectedUser, viewer, "lastSeen")) {
          io.to(viewerSocketId).emit("userLastSeen", { userId, lastSeen });
        }
      });
    }
    emitOnlineUsers().catch((error) => {
      console.error("Error emitting online users:", error.message);
    });
  });

  socket.on("read_message", async ({ messageIds }) => {
    try {
      if (!userId || !Array.isArray(messageIds) || messageIds.length === 0) return;

      const reader = await User.findById(userId).select("privacy");
      const allowReadReceipts = getPrivacySettings(reader?.privacy).readReceipts;
      const candidateMessages = await Message.find({
        _id: { $in: messageIds },
        senderId: { $ne: userId },
      }).select("_id senderId receiverId groupId");
      const directMessageIds = candidateMessages
        .filter((message) => toId(message.receiverId) === toId(userId))
        .map((message) => message._id);
      const candidateGroupIds = [
        ...new Set(candidateMessages.map((message) => toId(message.groupId)).filter(Boolean)),
      ];
      const readableGroups = candidateGroupIds.length
        ? await Group.find({ _id: { $in: candidateGroupIds }, members: userId }).select("_id")
        : [];
      const readableGroupIds = new Set(readableGroups.map((group) => toId(group)));
      const groupMessageIds = candidateMessages
        .filter((message) => readableGroupIds.has(toId(message.groupId)))
        .map((message) => message._id);
      
      if (directMessageIds.length > 0) {
        await Message.updateMany(
          { _id: { $in: directMessageIds }, receiverId: userId },
          allowReadReceipts
            ? { $set: { status: "read" }, $addToSet: { readBy: userId } }
            : { $addToSet: { readBy: userId } }
        );
      }

      if (groupMessageIds.length > 0) {
        await Message.updateMany(
          { _id: { $in: groupMessageIds } },
          { $addToSet: { readBy: userId } }
        );
      }

      if (!allowReadReceipts) return;

      const updatedMessages = await Message.find({ _id: { $in: directMessageIds }, receiverId: userId });

      const senderMap = {};
      updatedMessages.forEach((msg) => {
        const sender = msg.senderId.toString();
        if (!senderMap[sender]) senderMap[sender] = [];
        senderMap[sender].push(msg._id);
      });

      for (const senderId in senderMap) {
        const senderSocketId = userSocketMap[senderId];
        if (senderSocketId) {
          io.to(senderSocketId).emit("messages_read", {
            messageIds: senderMap[senderId],
          });
        }
      }
    } catch (err) {
      console.error("Error in read_message handler:", err.message);
    }
  });
});

export { io, app, server };
