import { Server } from "socket.io";
import http from "http";
import express from "express";
import Message from "../models/message.model.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"],
  },
});

export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

const userSocketMap = {};

io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  const userId = socket.handshake.query.userId;
  if (userId) userSocketMap[userId] = socket.id;

  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  socket.on("disconnect", () => {
    console.log("A user disconnected", socket.id);
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });

  socket.on("read_message", async ({ messageIds }) => {
    try {
      
      await Message.updateMany(
        { _id: { $in: messageIds } },
        { $set: { status: "read" } }
      );

      const updatedMessages = await Message.find({ _id: { $in: messageIds } });

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
