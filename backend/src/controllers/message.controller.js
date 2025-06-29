import User from "../models/user.model.js";
import Message from "../models/message.model.js";

import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;

    const users = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");

    const usersWithMetadata = await Promise.all(
      users.map(async (user) => {
        // Find the last message between user and logged-in user
        const lastMessage = await Message.findOne({
          $or: [
            { senderId: user._id, receiverId: loggedInUserId },
            { senderId: loggedInUserId, receiverId: user._id },
          ],
        })
          .sort({ createdAt: -1 })
          .limit(1);

        // Find unread messages from this user to me
        const unreadMessages = await Message.find({
          senderId: user._id,
          receiverId: loggedInUserId,
          status: "sent",
        })
          .sort({ createdAt: -1 })
          .limit(100);

        return {
          ...user.toObject(),
          unreadCount: Math.min(unreadMessages.length, 99),
          lastMessageTime: lastMessage?.createdAt || new Date(0), // Fallback: very old time
        };
      })
    );

    // Sort by latest message timestamp
    const sortedUsers = usersWithMetadata.sort(
      (a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime)
    );

    res.status(200).json(sortedUsers);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    });

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    let imageUrl;
    if (image) {
      // Upload base64 image to cloudinary
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
      status: 'sent',
    });

    await newMessage.save();

    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
