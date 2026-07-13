import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import Group from "../models/group.model.js";
import AiMessage from "../models/aiMessage.model.js";

import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import { serializeUserForViewer } from "../lib/privacy.js";
import { formatConvoKnowledge, retrieveConvoKnowledge } from "../data/convoKnowledge.js";

const MAX_PINNED_MESSAGES = 3;
const MAX_FAVORITE_CHATS = 3;
const AI_ASSISTANT_ID = "convo-ai-assistant";
const AI_CHAT_HISTORY_LIMIT = 100;
const REPLY_SUGGESTION_CONTEXT_LIMIT = 100;
const MESSAGE_SEARCH_LIMIT = 50;

const fallbackSuggestions = [
  "Sounds good!",
  "I will get back to you on this.",
  "Can you tell me a little more?",
];

const replyPopulate = {
  path: "replyTo",
  select: "text image audio file senderId isDeleted createdAt groupId",
  populate: { path: "senderId", select: "fullName profilePic privacy friends" },
};

const messagePopulate = [
  replyPopulate,
  { path: "senderId", select: "fullName profilePic privacy friends" },
];

const starredPopulate = [
  { path: "senderId", select: "fullName profilePic privacy friends" },
  { path: "receiverId", select: "fullName profilePic privacy friends" },
  { path: "groupId", select: "name groupPic" },
  replyPopulate,
];

const toId = (value) => value?._id?.toString() || value?.toString();

const includesId = (values = [], id) =>
  values.some((value) => toId(value) === toId(id));

const cleanSuggestion = (value) =>
  String(value || "")
    .replace(/^[\s"'*\-\d.)]+/, "")
    .replace(/["']+$/g, "")
    .trim()
    .slice(0, 160);

const normalizeSuggestions = (value) => {
  let parsed = value;

  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      parsed = value
        .split(/\r?\n|;/)
        .map((line) => line.replace(/^\s*[-*\d.)]+\s*/, ""));
    }
  }

  const suggestions = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.suggestions)
      ? parsed.suggestions
      : [];

  return suggestions
    .map(cleanSuggestion)
    .filter(Boolean)
    .filter((suggestion, index, all) => all.indexOf(suggestion) === index)
    .slice(0, 3);
};

const normalizeAudioDataUri = (audio = "") =>
  typeof audio === "string"
    ? audio.replace(/^data:audio\/([^;,]+);[^,]*;base64,/, "data:audio/$1;base64,")
    : audio;

const uploadAudio = async (audio) => {
  const uploadResponse = await cloudinary.uploader.upload(normalizeAudioDataUri(audio), {
    resource_type: "video",
  });

  return uploadResponse.secure_url;
};

const sanitizeFileName = (name = "Shared file") =>
  String(name || "Shared file").replace(/[\\/:*?"<>|]+/g, "_").trim().slice(0, 160) ||
  "Shared file";

const sanitizePublicId = (name = "shared-file") =>
  sanitizeFileName(name)
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "_");

const getCloudinaryRawAssetParts = (url = "") => {
  if (typeof url !== "string" || !url.includes("/raw/upload/")) return null;

  const [, rawPath = ""] = url.split("/raw/upload/");
  const parts = rawPath.split("/").filter(Boolean);
  const versionIndex = parts.findIndex((part) => /^v\d+$/.test(part));

  if (versionIndex === -1 || versionIndex === parts.length - 1) return null;

  return {
    version: Number(parts[versionIndex].slice(1)) || undefined,
    publicId: parts
      .slice(versionIndex + 1)
      .map((part) => {
        try {
          return decodeURIComponent(part);
        } catch {
          return part;
        }
      })
      .join("/"),
  };
};

const getSignedFileDownloadUrl = (fileUrl = "") => {
  const assetParts = getCloudinaryRawAssetParts(fileUrl);
  if (!assetParts?.publicId) return fileUrl;

  return cloudinary.url(assetParts.publicId, {
    resource_type: "raw",
    secure: true,
    sign_url: true,
    flags: "attachment",
    version: assetParts.version,
  });
};

const getPrivateFileDownloadUrl = (fileUrl = "") => {
  const assetParts = getCloudinaryRawAssetParts(fileUrl);
  if (!assetParts?.publicId) return "";

  return cloudinary.utils.private_download_url(assetParts.publicId, undefined, {
    resource_type: "raw",
    type: "upload",
    attachment: true,
    expires_at: Math.floor(Date.now() / 1000) + 60,
  });
};

const uploadFile = async (file) => {
  if (!file?.data) return null;

  const cleanName = sanitizeFileName(file.name);
  const publicName = sanitizePublicId(cleanName);
  const uploadResponse = await cloudinary.uploader.upload(file.data, {
    resource_type: "raw",
    public_id: `convo/files/${Date.now()}-${publicName}`,
    filename_override: cleanName,
  });
  const fileUrl = uploadResponse.secure_url;
  const downloadUrl = getSignedFileDownloadUrl(fileUrl);

  return {
    url: fileUrl,
    downloadUrl,
    name: cleanName,
    size: Number(file.size) || uploadResponse.bytes || 0,
    type: String(file.type || uploadResponse.format || "application/octet-stream"),
  };
};

const getResponseText = (data) => {
  if (typeof data?.output_text === "string") return data.output_text;

  return (data?.output || [])
    .flatMap((item) => item?.content || [])
    .map((content) => content?.text || "")
    .join("\n")
    .trim();
};

const getGeminiResponseText = (data) =>
  (data?.candidates?.[0]?.content?.parts || [])
    .map((part) => part?.text || "")
    .join("\n")
    .trim();

const getCurrentAssistantTime = () => {
  const now = new Date();

  return {
    iso: now.toISOString(),
    india: new Intl.DateTimeFormat("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
      timeZoneName: "short",
      timeZone: "Asia/Kolkata",
    }).format(now),
  };
};

const getGeminiGroundingSources = (data) => {
  const chunks = data?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const seen = new Set();

  return chunks
    .map((chunk) => chunk?.web)
    .filter((source) => source?.uri)
    .map((source) => ({
      title: source.title || source.uri,
      uri: source.uri,
    }))
    .filter((source) => {
      if (seen.has(source.uri)) return false;
      seen.add(source.uri);
      return true;
    })
    .slice(0, 4);
};

const appendGroundingSources = (reply, sources) => {
  if (!sources.length) return reply;

  const sourceText = sources
    .map((source, index) => `${index + 1}. ${source.title}: ${source.uri}`)
    .join("\n");

  return `${reply}\n\nSources:\n${sourceText}`;
};

const needsGoogleSearchGrounding = (message = "") => {
  const text = String(message).toLowerCase();

  if (/\b(date|time)\b/.test(text) && !/\b(news|latest|current|today'?s\s+(match|score|news)|live)\b/.test(text)) {
    return false;
  }

  return /\b(latest|current|recent|today'?s|now|live|ongoing|breaking|news|headline|score|match|fixture|schedule|tournament|world cup|ipl|stock|price|weather|election|who won|winner|released|launched)\b/.test(text);
};

const shouldUseGoogleSearchGrounding = (message) => {
  const mode = String(process.env.CONVO_AI_GOOGLE_SEARCH || "auto").trim().toLowerCase();

  if (["false", "off", "none", "never"].includes(mode)) return false;
  if (["always", "force"].includes(mode)) return true;
  return needsGoogleSearchGrounding(message);
};

const getConversationQuery = (userA, userB) => ({
  groupId: null,
  $or: [
    { senderId: userA, receiverId: userB },
    { senderId: userB, receiverId: userA },
  ],
});

const getGroupMessageQuery = (groupId) => ({
  groupId,
});

const buildConversationContext = (messages, myId, receiverName) =>
  messages
    .map((message) => {
      const sender = message.senderId.toString() === myId.toString() ? "Me" : receiverName;
      const rawContent =
        message.text ||
        (message.image
          ? "[Image]"
          : message.audio
            ? "[Audio]"
            : message.file?.url
              ? `[File: ${message.file.name || "Shared file"}]`
              : "");
      const content = String(rawContent).replace(/\s+/g, " ").trim().slice(0, 500);
      return `${sender}: ${content}`;
    })
    .filter((line) => !line.endsWith(": "))
    .join("\n");

const buildSuggestionPrompt = (context, receiverName) =>
  context
    ? `Recent conversation with ${receiverName}:\n${context}\n\nSuggest exactly three natural replies I could send next.`
    : `Suggest exactly three friendly opening messages I could send to ${receiverName}.`;

const generateGeminiReplySuggestions = async ({ context, receiverName }) => {
  if (process.env.AI_PROVIDER !== "gemini" || !process.env.GEMINI_API_KEY || typeof fetch !== "function") {
    return [];
  }

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text:
                "You write concise, natural chat reply suggestions. Use the conversation context, tone, topic, and last message carefully. Return only a JSON array of exactly 3 strings. Each suggestion should be friendly, useful, and under 18 words. Do not add explanations.",
            },
          ],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: buildSuggestionPrompt(context, receiverName) }],
          },
        ],
        generationConfig: {
          temperature: 0.55,
          maxOutputTokens: 180,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini suggestions failed:", errorText);
    return [];
  }

  const data = await response.json();
  return normalizeSuggestions(getGeminiResponseText(data));
};

const getFallbackSuggestions = (messages) => {
  const lastText = messages.at(-1)?.text?.toLowerCase() || "";

  if (lastText.includes("?")) {
    return ["Let me check and tell you.", "Yes, that works for me.", "Can you clarify one thing?"];
  }

  if (lastText.includes("thank")) {
    return ["You're welcome!", "Happy to help.", "Anytime!"];
  }

  if (lastText.includes("sorry")) {
    return ["No worries.", "It's okay, I understand.", "Thanks for letting me know."];
  }

  return fallbackSuggestions;
};

const isPopulatedUser = (value) =>
  value && typeof value === "object" && value.fullName;

const sanitizeMessageUsersForViewer = (messageObject, viewer) => {
  const sanitizedMessage = { ...messageObject };

  if (isPopulatedUser(sanitizedMessage.senderId)) {
    sanitizedMessage.senderId = serializeUserForViewer(sanitizedMessage.senderId, viewer);
  }

  if (isPopulatedUser(sanitizedMessage.receiverId)) {
    sanitizedMessage.receiverId = serializeUserForViewer(sanitizedMessage.receiverId, viewer);
  }

  if (sanitizedMessage.replyTo && isPopulatedUser(sanitizedMessage.replyTo.senderId)) {
    sanitizedMessage.replyTo = {
      ...sanitizedMessage.replyTo,
      senderId: serializeUserForViewer(sanitizedMessage.replyTo.senderId, viewer),
    };
  }

  return sanitizedMessage;
};

const decorateGroupForViewer = (group, viewer, extra = {}) => {
  const groupObject = typeof group?.toObject === "function" ? group.toObject() : { ...(group || {}) };

  return {
    ...groupObject,
    ...extra,
    members: (groupObject.members || []).map((member) =>
      isPopulatedUser(member) ? serializeUserForViewer(member, viewer) : member
    ),
    admins: (groupObject.admins || []).map((admin) =>
      isPopulatedUser(admin) ? serializeUserForViewer(admin, viewer) : admin
    ),
  };
};

const decorateMessageForUser = (message, user) => {
  const rawMessageObject = typeof message.toObject === "function" ? message.toObject() : message;
  const messageObject = sanitizeMessageUsersForViewer(rawMessageObject, user);
  const file = messageObject.file?.url
    ? {
        ...messageObject.file,
        downloadUrl: getSignedFileDownloadUrl(messageObject.file.url),
      }
    : messageObject.file;

  return {
    ...messageObject,
    file,
    isStarredByMe: includesId(user.starredMessages || [], messageObject._id),
  };
};

const decorateMessagesForUser = (messages, user) =>
  messages.map((message) => decorateMessageForUser(message, user));

const emitMessageEvent = (message, eventName, payload) => {
  const senderId = toId(message.senderId);
  const receiverId = toId(message.receiverId);
  const receiverSocketId = getReceiverSocketId(receiverId);
  const senderSocketId = getReceiverSocketId(senderId);

  if (receiverSocketId && receiverId !== senderId) {
    io.to(receiverSocketId).emit(eventName, payload);
  }

  if (senderSocketId && eventName !== "newMessage") {
    io.to(senderSocketId).emit(eventName, payload);
  }
};

const emitMessageUpdateToParticipants = async (message, eventName = "messageUpdated") => {
  if (message.groupId) {
    const group = await Group.findById(message.groupId).populate(
      "members",
      "fullName profilePic privacy friends starredMessages"
    );

    group?.members.forEach((member) => {
      const memberSocketId = getReceiverSocketId(toId(member));
      if (memberSocketId) {
        io.to(memberSocketId).emit(eventName, decorateMessageForUser(message, member));
      }
    });
    return;
  }

  const participantIds = [message.senderId, message.receiverId].map(toId).filter(Boolean);
  const participants = await User.find({ _id: { $in: participantIds } }).select(
    "fullName profilePic privacy friends starredMessages"
  );

  participants.forEach((participant) => {
    const participantSocketId = getReceiverSocketId(toId(participant));
    if (participantSocketId) {
      io.to(participantSocketId).emit(eventName, decorateMessageForUser(message, participant));
    }
  });
};

const isConversationParticipant = (message, userId) =>
  toId(message.senderId) === toId(userId) ||
  toId(message.receiverId) === toId(userId);

const isInConversation = (message, senderId, receiverId) => {
  const messageSenderId = toId(message.senderId);
  const messageReceiverId = toId(message.receiverId);
  const currentSenderId = toId(senderId);
  const currentReceiverId = toId(receiverId);

  return (
    (messageSenderId === currentSenderId && messageReceiverId === currentReceiverId) ||
    (messageSenderId === currentReceiverId && messageReceiverId === currentSenderId)
  );
};

const isGroupMember = (group, userId) => includesId(group?.members || [], userId);

const isGroupAdmin = (group, userId) =>
  includesId(group?.admins || [], userId) ||
  (!(group?.admins || []).length && toId(group?.members?.[0]) === toId(userId));

const getGroupAdminIds = (group) => {
  const adminIds = (group?.admins || []).map(toId).filter(Boolean);
  if (adminIds.length) return adminIds;
  const fallbackAdminId = toId(group?.members?.[0]);
  return fallbackAdminId ? [fallbackAdminId] : [];
};

const populateGroupForProfile = (groupQuery) =>
  groupQuery
    .populate("members", "fullName email profilePic status lastSeen privacy friends")
    .populate("admins", "fullName profilePic privacy friends");

const emitGroupUpdatedToMembers = (group, excludedUserId = null) => {
  (group.members || []).forEach((member) => {
    const memberSocketId = getReceiverSocketId(toId(member));
    if (memberSocketId && toId(member) !== toId(excludedUserId)) {
      io.to(memberSocketId).emit(
        "groupUpdated",
        decorateGroupForViewer(group, member, { isGroup: true })
      );
    }
  });
};

const normalizeGroupMentions = (mentions = [], group) => {
  if (!Array.isArray(mentions) || !mentions.length) return [];

  const groupMembers = group?.members || [];
  const seen = new Set();

  return mentions
    .map((mention) => {
      const userId = toId(mention?.userId);
      if (!userId || seen.has(userId) || !isGroupMember(group, userId)) return null;
      const member = groupMembers.find((item) => toId(item) === userId);
      const name = String(member?.fullName || mention?.name || "").trim().slice(0, 80);
      if (!name) return null;
      seen.add(userId);
      return { userId, name };
    })
    .filter(Boolean)
    .slice(0, 20);
};

const getForwardMessagePayload = (message) => ({
  text: message.text || "",
  image: message.image || "",
  audio: message.audio || "",
  file: message.file?.url
    ? {
        url: message.file.url,
        downloadUrl: message.file.downloadUrl || "",
        name: message.file.name || "",
        size: message.file.size || 0,
        type: message.file.type || "",
      }
    : undefined,
});

const hasForwardableContent = (payload) =>
  Boolean(payload.text || payload.image || payload.audio || payload.file?.url);

const normalizeForwardTargets = (targets = []) => {
  const seen = new Set();

  return (Array.isArray(targets) ? targets : [])
    .map((target) => ({
      type: target?.type === "group" ? "group" : "direct",
      id: String(target?.id || "").trim(),
    }))
    .filter((target) => target.id)
    .filter((target) => {
      const key = `${target.type}:${target.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 20);
};

const toAiChatMessage = (message) => ({
  _id: message._id,
  senderId: message.senderId,
  text: message.text,
  createdAt: message.createdAt,
});

const deleteExpiredAiMessages = () =>
  AiMessage.deleteMany({ expiresAt: { $lte: new Date() } });

const escapeRegex = (value = "") =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeSearchQuery = (query = "") =>
  String(query || "").trim().slice(0, 80);

const isAssetSearch = (query, words) => {
  const cleanQuery = query.toLowerCase();
  return words.some((word) => word.includes(cleanQuery) || cleanQuery.includes(word));
};

const buildMessageSearchFilter = (query, userId) => {
  const regex = new RegExp(escapeRegex(query), "i");
  const searchConditions = [
    { text: regex },
    { "file.name": regex },
    { "file.type": regex },
  ];

  if (isAssetSearch(query, ["photo", "photos", "image", "images", "picture", "pictures"])) {
    searchConditions.push({ image: { $exists: true, $nin: ["", null] } });
  }

  if (isAssetSearch(query, ["audio", "audios", "voice", "recording"])) {
    searchConditions.push({ audio: { $exists: true, $nin: ["", null] } });
  }

  if (isAssetSearch(query, ["file", "files", "document", "documents", "pdf"])) {
    searchConditions.push({ "file.url": { $exists: true, $nin: ["", null] } });
  }

  if (isAssetSearch(query, ["link", "links", "url", "website"])) {
    searchConditions.push({ text: /(https?:\/\/|www\.)/i });
  }

  return {
    isDeleted: false,
    deletedFor: { $ne: userId },
    $or: searchConditions,
  };
};

const getSearchPreview = (message) => {
  if (message.text) return message.text;
  if (message.image) return "Photo";
  if (message.audio) return "Audio";
  if (message.file?.url) return message.file.name ? `File: ${message.file.name}` : "File";
  return "Message";
};

const getPopulatedSenderName = (message, userId) => {
  const senderId = toId(message.senderId);
  if (senderId === toId(userId)) return "You";
  return message.senderId?.fullName || "Unknown";
};

const buildSearchResult = (message, user, chat) => {
  const userId = toId(user);
  const decoratedMessage = decorateMessageForUser(message, user);

  return {
    _id: message._id,
    messageId: message._id,
    chat,
    senderName: getPopulatedSenderName(message, userId),
    preview: getSearchPreview(message),
    createdAt: message.createdAt,
    message: decoratedMessage,
  };
};

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const visibleUserIds = [loggedInUserId, ...(req.user.friends || [])];
    const users = await User.find({ _id: { $in: visibleUserIds } }).select("-password");

    const usersWithMetadata = await Promise.all(
      users.map(async (user) => {
        const lastMessage = await Message.findOne(
          getConversationQuery(loggedInUserId, user._id)
        )
          .sort({ createdAt: -1 })
          .limit(1);

        const isSelf = user._id.toString() === loggedInUserId.toString();
        const isFavorite = includesId(req.user.favoriteChats, user._id);
        const blockedByMe = includesId(req.user.blockedUsers, user._id);
        const hasBlockedMe = includesId(user.blockedUsers, loggedInUserId);

        const unreadMessages =
          isSelf || blockedByMe
            ? []
            : await Message.find({
                senderId: user._id,
                receiverId: loggedInUserId,
                status: "sent",
                readBy: { $ne: loggedInUserId },
              })
                .sort({ createdAt: -1 })
                .limit(100);

        return serializeUserForViewer(user, req.user, {
          isSelf,
          isFavorite,
          blockedByMe,
          hasBlockedMe,
          unreadCount: isSelf || blockedByMe ? 0 : Math.min(unreadMessages.length, 99),
          lastMessageTime: lastMessage?.createdAt || new Date(0),
        });
      })
    );

    const sortedUsers = usersWithMetadata.sort((a, b) => {
      if (a.isSelf) return -1;
      if (b.isSelf) return 1;
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return new Date(b.lastMessageTime) - new Date(a.lastMessageTime);
    });

    res.status(200).json(sortedUsers);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getFriendRequests = async (req, res) => {
  try {
    await req.user.populate([
      { path: "receivedFriendRequests", select: "fullName email profilePic status lastSeen privacy friends" },
      { path: "sentFriendRequests", select: "fullName email profilePic status lastSeen privacy friends" },
    ]);

    res.status(200).json({
      incoming: (req.user.receivedFriendRequests || []).map((user) =>
        serializeUserForViewer(user, req.user)
      ),
      outgoing: (req.user.sentFriendRequests || []).map((user) =>
        serializeUserForViewer(user, req.user)
      ),
    });
  } catch (error) {
    console.error("Error in getFriendRequests: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getFriendSuggestions = async (req, res) => {
  try {
    const excludedIds = [
      req.user._id,
      ...(req.user.friends || []),
      ...(req.user.sentFriendRequests || []),
      ...(req.user.receivedFriendRequests || []),
    ];

    const users = await User.find({ _id: { $nin: excludedIds } })
      .select("fullName email profilePic status lastSeen privacy friends")
      .sort({ fullName: 1 })
      .limit(30);

    res.status(200).json(users.map((user) => serializeUserForViewer(user, req.user)));
  } catch (error) {
    console.error("Error in getFriendSuggestions: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendFriendRequest = async (req, res) => {
  try {
    const { id: receiverId } = req.params;

    if (toId(receiverId) === toId(req.user._id)) {
      return res.status(400).json({ error: "You cannot send a friend request to yourself" });
    }

    const receiver = await User.findById(receiverId);

    if (!receiver) {
      return res.status(404).json({ error: "User not found" });
    }

    if (includesId(req.user.friends, receiverId)) {
      return res.status(400).json({ error: "You are already friends" });
    }

    if (includesId(req.user.sentFriendRequests, receiverId)) {
      return res.status(400).json({ error: "Friend request already sent" });
    }

    if (includesId(req.user.receivedFriendRequests, receiverId)) {
      req.user.receivedFriendRequests = req.user.receivedFriendRequests.filter(
        (requestId) => toId(requestId) !== toId(receiverId)
      );
      req.user.friends = [...(req.user.friends || []), receiver._id];
      receiver.sentFriendRequests = receiver.sentFriendRequests.filter(
        (requestId) => toId(requestId) !== toId(req.user._id)
      );
      receiver.friends = [...(receiver.friends || []), req.user._id];
      await req.user.save();
      await receiver.save();
      return res.status(200).json({ accepted: true });
    }

    req.user.sentFriendRequests = [...(req.user.sentFriendRequests || []), receiver._id];
    receiver.receivedFriendRequests = [...(receiver.receivedFriendRequests || []), req.user._id];

    await req.user.save();
    await receiver.save();

    res.status(200).json({ sent: true });
  } catch (error) {
    console.error("Error in sendFriendRequest: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const acceptFriendRequest = async (req, res) => {
  try {
    const { id: senderId } = req.params;
    const sender = await User.findById(senderId);

    if (!sender || !includesId(req.user.receivedFriendRequests, senderId)) {
      return res.status(404).json({ error: "Friend request not found" });
    }

    req.user.receivedFriendRequests = req.user.receivedFriendRequests.filter(
      (requestId) => toId(requestId) !== toId(senderId)
    );
    sender.sentFriendRequests = sender.sentFriendRequests.filter(
      (requestId) => toId(requestId) !== toId(req.user._id)
    );

    if (!includesId(req.user.friends, senderId)) {
      req.user.friends = [...(req.user.friends || []), sender._id];
    }

    if (!includesId(sender.friends, req.user._id)) {
      sender.friends = [...(sender.friends || []), req.user._id];
    }

    await req.user.save();
    await sender.save();

    res.status(200).json({ accepted: true });
  } catch (error) {
    console.error("Error in acceptFriendRequest: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const rejectFriendRequest = async (req, res) => {
  try {
    const { id: senderId } = req.params;
    const sender = await User.findById(senderId);

    req.user.receivedFriendRequests = (req.user.receivedFriendRequests || []).filter(
      (requestId) => toId(requestId) !== toId(senderId)
    );

    if (sender) {
      sender.sentFriendRequests = (sender.sentFriendRequests || []).filter(
        (requestId) => toId(requestId) !== toId(req.user._id)
      );
      await sender.save();
    }

    await req.user.save();

    res.status(200).json({ rejected: true });
  } catch (error) {
    console.error("Error in rejectFriendRequest: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getGroupsForSidebar = async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user._id })
      .populate("members", "fullName profilePic lastSeen privacy friends")
      .sort({ updatedAt: -1 });

    const groupsWithMetadata = await Promise.all(
      groups.map(async (group) => {
        const lastMessage = await Message.findOne(getGroupMessageQuery(group._id))
          .sort({ createdAt: -1 })
          .limit(1);
        const unreadCount = await Message.countDocuments({
          groupId: group._id,
          senderId: { $ne: req.user._id },
          isDeleted: false,
          deletedFor: { $ne: req.user._id },
          readBy: { $ne: req.user._id },
        });

        return decorateGroupForViewer(group, req.user, {
          isGroup: true,
          lastMessageTime: lastMessage?.createdAt || group.updatedAt,
          unreadCount: Math.min(unreadCount, 99),
        });
      })
    );

    res.status(200).json(groupsWithMetadata);
  } catch (error) {
    console.error("Error in getGroupsForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const createGroup = async (req, res) => {
  try {
    const { name, memberIds = [], details = "", groupPic = "" } = req.body;
    const cleanName = String(name || "").trim();
    const cleanDetails = String(details || "").trim();

    if (cleanName.length < 2) {
      return res.status(400).json({ error: "Group name must be at least 2 characters" });
    }

    const uniqueMemberIds = [...new Set(memberIds.map(String))].filter(
      (memberId) => memberId !== toId(req.user._id)
    );

    const allowedMemberIds = uniqueMemberIds.filter((memberId) =>
      includesId(req.user.friends, memberId)
    );

    if (allowedMemberIds.length !== uniqueMemberIds.length) {
      return res.status(403).json({ error: "Groups can only include your friends" });
    }

    if (allowedMemberIds.length < 1) {
      return res.status(400).json({ error: "Select at least one friend for the group" });
    }

    let groupPicUrl = "";
    if (groupPic) {
      const uploadResponse = await cloudinary.uploader.upload(groupPic);
      groupPicUrl = uploadResponse.secure_url;
    }

    const group = await Group.create({
      name: cleanName,
      details: cleanDetails,
      groupPic: groupPicUrl,
      members: [req.user._id, ...allowedMemberIds],
      admins: [req.user._id],
    });

    await group.populate("members", "fullName profilePic lastSeen privacy friends");

    res.status(201).json(decorateGroupForViewer(group, req.user, { isGroup: true }));
  } catch (error) {
    console.error("Error in createGroup: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getGroupById = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const group = await Group.findById(groupId)
      .populate("members", "fullName email profilePic status lastSeen privacy friends")
      .populate("admins", "fullName profilePic privacy friends");

    if (!group || !isGroupMember(group, req.user._id)) {
      return res.status(404).json({ error: "Group not found" });
    }

    res.status(200).json(decorateGroupForViewer(group, req.user, { isGroup: true }));
  } catch (error) {
    console.error("Error in getGroupById: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateGroupProfile = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const { name, details, groupPic } = req.body;
    const group = await Group.findById(groupId);

    if (!group || !isGroupMember(group, req.user._id)) {
      return res.status(404).json({ error: "Group not found" });
    }

    const updates = {};

    if (typeof name === "string") {
      const cleanName = name.trim();
      if (cleanName.length < 2) {
        return res.status(400).json({ error: "Group name must be at least 2 characters" });
      }
      updates.name = cleanName;
    }

    if (typeof details === "string") {
      updates.details = details.trim();
    }

    if (typeof groupPic === "string" && groupPic && groupPic !== group.groupPic) {
      const uploadResponse = await cloudinary.uploader.upload(groupPic);
      updates.groupPic = uploadResponse.secure_url;
    }

    const updatedGroup = await Group.findByIdAndUpdate(groupId, updates, {
      new: true,
    })
      .populate("members", "fullName email profilePic status lastSeen privacy friends")
      .populate("admins", "fullName profilePic privacy friends");

    res.status(200).json(decorateGroupForViewer(updatedGroup, req.user, { isGroup: true }));
  } catch (error) {
    console.error("Error in updateGroupProfile: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteGroup = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const group = await Group.findById(groupId);

    if (!group || !isGroupMember(group, req.user._id)) {
      return res.status(404).json({ error: "Group not found" });
    }

    if (!isGroupAdmin(group, req.user._id)) {
      return res.status(403).json({ error: "Only group admins can delete this group" });
    }

    const memberIds = [...(group.members || [])].map(toId);
    const groupMessageIds = await Message.find({ groupId }).distinct("_id");

    await Group.findByIdAndDelete(groupId);
    await Message.deleteMany({ groupId });

    if (groupMessageIds.length > 0) {
      try {
        await User.updateMany(
          { starredMessages: { $in: groupMessageIds } },
          { $pull: { starredMessages: { $in: groupMessageIds } } }
        );
      } catch (cleanupError) {
        console.error("Error cleaning group starred messages: ", cleanupError.message);
      }
    }

    memberIds.forEach((memberId) => {
      const memberSocketId = getReceiverSocketId(toId(memberId));
      if (memberSocketId) {
        io.to(memberSocketId).emit("groupDeleted", { groupId });
      }
    });

    res.status(200).json({ groupId });
  } catch (error) {
    console.error("Error in deleteGroup: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const leaveGroup = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const group = await Group.findById(groupId);

    if (!group || !isGroupMember(group, req.user._id)) {
      return res.status(404).json({ error: "Group not found" });
    }

    const adminIds = getGroupAdminIds(group);
    const isLeavingAdmin = adminIds.includes(toId(req.user._id));

    if (isLeavingAdmin && adminIds.length <= 1 && (group.members || []).length > 1) {
      return res.status(400).json({ error: "Promote another admin before leaving this group" });
    }

    group.members = group.members.filter((memberId) => toId(memberId) !== toId(req.user._id));
    group.admins = adminIds
      .filter((adminId) => adminId !== toId(req.user._id))
      .filter((adminId) => includesId(group.members, adminId));
    await group.save();

    const updatedGroup = await populateGroupForProfile(Group.findById(groupId));
    if (updatedGroup) emitGroupUpdatedToMembers(updatedGroup, req.user._id);

    res.status(200).json({ groupId });
  } catch (error) {
    console.error("Error in leaveGroup: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const removeGroupMember = async (req, res) => {
  try {
    const { id: groupId, memberId } = req.params;
    const group = await Group.findById(groupId);

    if (!group || !isGroupMember(group, req.user._id)) {
      return res.status(404).json({ error: "Group not found" });
    }

    if (!isGroupAdmin(group, req.user._id)) {
      return res.status(403).json({ error: "Only group admins can remove members" });
    }

    if (toId(memberId) === toId(req.user._id)) {
      return res.status(400).json({ error: "You cannot remove yourself" });
    }

    if (!isGroupMember(group, memberId)) {
      return res.status(404).json({ error: "Member not found in this group" });
    }

    group.members = group.members.filter((member) => toId(member) !== toId(memberId));
    group.admins = group.admins.filter((admin) => toId(admin) !== toId(memberId));
    await group.save();

    const groupMessages = await Message.find({ groupId }).select("_id");
    const groupMessageIds = groupMessages.map((message) => message._id);

    if (groupMessageIds.length > 0) {
      await User.findByIdAndUpdate(memberId, {
        $pull: { starredMessages: { $in: groupMessageIds } },
      });
    }

    const updatedGroup = await populateGroupForProfile(Group.findById(groupId));

    const removedMemberSocketId = getReceiverSocketId(memberId);
    if (removedMemberSocketId) {
      io.to(removedMemberSocketId).emit("groupRemoved", { groupId });
    }

    emitGroupUpdatedToMembers(updatedGroup, req.user._id);

    res.status(200).json(decorateGroupForViewer(updatedGroup, req.user, { isGroup: true }));
  } catch (error) {
    console.error("Error in removeGroupMember: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateGroupMemberRole = async (req, res) => {
  try {
    const { id: groupId, memberId } = req.params;
    const { role } = req.body;
    const group = await Group.findById(groupId);

    if (!group || !isGroupMember(group, req.user._id)) {
      return res.status(404).json({ error: "Group not found" });
    }

    if (!isGroupAdmin(group, req.user._id)) {
      return res.status(403).json({ error: "Only group admins can update roles" });
    }

    if (!isGroupMember(group, memberId)) {
      return res.status(404).json({ error: "Member not found in this group" });
    }

    const adminIds = getGroupAdminIds(group);
    const targetId = toId(memberId);

    if (role === "admin") {
      if (!adminIds.includes(targetId)) {
        group.admins = [...adminIds, targetId];
      }
    } else if (role === "member") {
      if (!adminIds.includes(targetId)) {
        return res.status(400).json({ error: "This member is not an admin" });
      }

      const nextAdminIds = adminIds.filter((adminId) => adminId !== targetId);
      if (!nextAdminIds.length) {
        return res.status(400).json({ error: "A group must have at least one admin" });
      }
      group.admins = nextAdminIds;
    } else {
      return res.status(400).json({ error: "Role must be admin or member" });
    }

    await group.save();

    const updatedGroup = await populateGroupForProfile(Group.findById(groupId));
    emitGroupUpdatedToMembers(updatedGroup, req.user._id);

    res.status(200).json(decorateGroupForViewer(updatedGroup, req.user, { isGroup: true }));
  } catch (error) {
    console.error("Error in updateGroupMemberRole: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getGroupMessages = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const group = await Group.findById(groupId);

    if (!group || !isGroupMember(group, req.user._id)) {
      return res.status(404).json({ error: "Group not found" });
    }

    const messages = await Message.find({
      ...getGroupMessageQuery(groupId),
      deletedFor: { $ne: req.user._id },
    })
      .populate(messagePopulate)
      .sort({ createdAt: 1 });

    await Message.updateMany(
      {
        groupId,
        senderId: { $ne: req.user._id },
        readBy: { $ne: req.user._id },
      },
      { $addToSet: { readBy: req.user._id } }
    );

    res.status(200).json(decorateMessagesForUser(messages, req.user));
  } catch (error) {
    console.error("Error in getGroupMessages: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendGroupMessage = async (req, res) => {
  try {
    const { text, image, audio, file, replyTo, mentions = [] } = req.body;
    const { id: groupId } = req.params;
    const senderId = req.user._id;
    const cleanText = String(text || "").trim();

    const group = await Group.findById(groupId).populate("members", "fullName profilePic lastSeen privacy friends");

    if (!group || !isGroupMember(group, senderId)) {
      return res.status(404).json({ error: "Group not found" });
    }

    if (!cleanText && !image && !audio && !file?.data) {
      return res.status(400).json({ error: "Message content is required" });
    }

    let imageUrl;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    let audioUrl;
    if (audio) {
      audioUrl = await uploadAudio(audio);
    }

    const uploadedFile = await uploadFile(file);
    const cleanMentions = normalizeGroupMentions(mentions, group);

    let replyToMessage = null;
    if (replyTo) {
      replyToMessage = await Message.findById(replyTo);

      if (
        !replyToMessage ||
        replyToMessage.isDeleted ||
        toId(replyToMessage.groupId) !== toId(groupId)
      ) {
        return res.status(400).json({ error: "Invalid reply target" });
      }
    }

    const newMessage = new Message({
      senderId,
      receiverId: null,
      groupId,
      text: cleanText,
      image: imageUrl,
      audio: audioUrl,
      file: uploadedFile || undefined,
      mentions: cleanMentions,
      replyTo: replyToMessage?._id || null,
      status: "sent",
    });

    await newMessage.save();
    await newMessage.populate(messagePopulate);
    await Group.findByIdAndUpdate(groupId, { updatedAt: new Date() });

    const decoratedMessage = decorateMessageForUser(newMessage, req.user);

    group.members.forEach((member) => {
      const memberSocketId = getReceiverSocketId(toId(member));
      if (memberSocketId && toId(member) !== toId(senderId)) {
        io.to(memberSocketId).emit("newGroupMessage", {
          groupId,
          message: decorateMessageForUser(newMessage, member),
        });
      }
    });

    res.status(201).json(decoratedMessage);
  } catch (error) {
    console.error("Error in sendGroupMessage: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    if (toId(myId) !== toId(userToChatId) && !includesId(req.user.friends, userToChatId)) {
      return res.status(403).json({ error: "You can only message friends" });
    }

    const messages = await Message.find({
      ...getConversationQuery(myId, userToChatId),
      deletedFor: { $ne: myId },
    })
      .populate(messagePopulate)
      .sort({ createdAt: 1 });

    res.status(200).json(decorateMessagesForUser(messages, req.user));
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const searchMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;
    const query = normalizeSearchQuery(req.query.q);

    if (!query) return res.status(200).json([]);

    if (toId(myId) !== toId(userToChatId) && !includesId(req.user.friends, userToChatId)) {
      return res.status(403).json({ error: "You can only search chats with friends" });
    }

    const chatUser = await User.findById(userToChatId).select("fullName profilePic status lastSeen privacy friends");

    if (!chatUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const messages = await Message.find({
      $and: [
        buildMessageSearchFilter(query, myId),
        getConversationQuery(myId, userToChatId),
      ],
    })
      .populate(messagePopulate)
      .sort({ createdAt: -1 })
      .limit(MESSAGE_SEARCH_LIMIT);

    const decoratedChatUser = serializeUserForViewer(chatUser, req.user, {
      isSelf: toId(chatUser._id) === toId(myId),
    });
    const chat = {
      type: "direct",
      _id: chatUser._id,
      name: toId(chatUser._id) === toId(myId) ? `${chatUser.fullName} (You)` : chatUser.fullName,
      profilePic: decoratedChatUser.profilePic,
      user: decoratedChatUser,
    };

    res.status(200).json(
      messages.map((message) => buildSearchResult(message, req.user, chat))
    );
  } catch (error) {
    console.log("Error in searchMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const searchGroupMessages = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const query = normalizeSearchQuery(req.query.q);
    const group = await Group.findById(groupId);

    if (!group || !isGroupMember(group, req.user._id)) {
      return res.status(404).json({ error: "Group not found" });
    }

    if (!query) return res.status(200).json([]);

    const messages = await Message.find({
      $and: [
        buildMessageSearchFilter(query, req.user._id),
        { groupId },
      ],
    })
      .populate(messagePopulate)
      .sort({ createdAt: -1 })
      .limit(MESSAGE_SEARCH_LIMIT);

    const chat = {
      type: "group",
      _id: group._id,
      name: group.name,
      groupPic: group.groupPic,
      group: { ...group.toObject(), isGroup: true },
    };

    res.status(200).json(
      messages.map((message) => buildSearchResult(message, req.user, chat))
    );
  } catch (error) {
    console.log("Error in searchGroupMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const searchAllMessages = async (req, res) => {
  try {
    const myId = req.user._id;
    const query = normalizeSearchQuery(req.query.q);

    if (!query) return res.status(200).json([]);

    const groups = await Group.find({ members: myId }).select("name groupPic members admins details createdAt updatedAt");
    const groupIds = groups.map((group) => group._id);
    const visibleUserIds = [myId, ...(req.user.friends || [])];

    const messages = await Message.find({
      $and: [
        buildMessageSearchFilter(query, myId),
        {
          $or: [
            {
              groupId: null,
              $or: [
                { senderId: myId, receiverId: { $in: visibleUserIds } },
                { senderId: { $in: visibleUserIds }, receiverId: myId },
              ],
            },
            { groupId: { $in: groupIds } },
          ],
        },
      ],
    })
      .populate(messagePopulate)
      .populate("receiverId", "fullName profilePic status lastSeen privacy friends")
      .populate("groupId", "name groupPic members admins details")
      .sort({ createdAt: -1 })
      .limit(MESSAGE_SEARCH_LIMIT);

    const results = messages.map((message) => {
      const group = message.groupId;

      if (group) {
        return buildSearchResult(message, req.user, {
          type: "group",
          _id: group._id,
          name: group.name,
          groupPic: group.groupPic,
          group: { ...group.toObject(), isGroup: true },
        });
      }

      const senderId = toId(message.senderId);
      const receiverId = toId(message.receiverId);
      const otherUser =
        senderId === toId(myId)
          ? message.receiverId
          : message.senderId;
      const isSelf = senderId === toId(myId) && receiverId === toId(myId);

      const decoratedOtherUser = otherUser
        ? serializeUserForViewer(otherUser, req.user, { isSelf: false })
        : null;

      return buildSearchResult(message, req.user, {
        type: "direct",
        _id: otherUser?._id || myId,
        name: isSelf ? `${req.user.fullName} (You)` : otherUser?.fullName || "Unknown",
        profilePic: isSelf ? req.user.profilePic : decoratedOtherUser?.profilePic,
        user: isSelf
          ? serializeUserForViewer(req.user, req.user, { isSelf: true })
          : decoratedOtherUser,
      });
    });

    res.status(200).json(results);
  } catch (error) {
    console.log("Error in searchAllMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getStarredMessages = async (req, res) => {
  try {
    await req.user.populate({
      path: "starredMessages",
      match: { isDeleted: false, deletedFor: { $ne: req.user._id } },
      populate: starredPopulate,
    });

    const messages = req.user.starredMessages || [];

    res.status(200).json(decorateMessagesForUser(messages, req.user));
  } catch (error) {
    console.log("Error in getStarredMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const downloadMessageFile = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const message = await Message.findById(messageId);

    if (!message || message.isDeleted || !message.file?.url) {
      return res.status(404).json({ error: "File not found" });
    }

    if (message.groupId) {
      const group = await Group.findById(message.groupId);
      if (!group || !isGroupMember(group, req.user._id)) {
        return res.status(403).json({ error: "You can only download files from your chats" });
      }
    } else if (!isConversationParticipant(message, req.user._id)) {
      return res.status(403).json({ error: "You can only download files from your chats" });
    }

    const downloadUrl = getPrivateFileDownloadUrl(message.file.url);

    if (!downloadUrl) {
      return res.status(404).json({ error: "File download is not available" });
    }

    res.redirect(downloadUrl);
  } catch (error) {
    console.log("Error in downloadMessageFile controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const suggestReplies = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    const receiver = await User.findById(userToChatId).select("fullName blockedUsers");

    if (!receiver) {
      return res.status(404).json({ error: "User not found" });
    }

    if (toId(myId) !== toId(userToChatId)) {
      if (includesId(req.user.blockedUsers, userToChatId)) {
        return res.status(403).json({ error: "Unblock this user to generate suggestions" });
      }

      if (includesId(receiver.blockedUsers, myId)) {
        return res.status(403).json({ error: "You cannot message this user" });
      }
    }

    const recentMessages = await Message.find({
      ...getConversationQuery(myId, userToChatId),
      isDeleted: false,
      deletedFor: { $ne: myId },
    })
      .sort({ createdAt: -1 })
      .limit(REPLY_SUGGESTION_CONTEXT_LIMIT)
      .lean();

    const messages = recentMessages.reverse();
    const fallback = getFallbackSuggestions(messages);
    const context = buildConversationContext(messages, myId, receiver.fullName);

    const geminiSuggestions = await generateGeminiReplySuggestions({
      context,
      receiverName: receiver.fullName,
    });

    if (geminiSuggestions.length) {
      return res.status(200).json({
        suggestions: geminiSuggestions,
        source: "gemini",
        contextMessages: messages.length,
      });
    }

    if (!process.env.OPENAI_API_KEY || typeof fetch !== "function") {
      return res.status(200).json({
        suggestions: fallback,
        source: "fallback",
        contextMessages: messages.length,
      });
    }

    const aiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5.5",
        reasoning: { effort: "low" },
        instructions:
          "You write concise, natural chat reply suggestions. Use the conversation context, tone, topic, and last message carefully. Return only a JSON array of exactly 3 strings. Each suggestion should be friendly, useful, and under 18 words.",
        input: buildSuggestionPrompt(context, receiver.fullName),
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("OpenAI suggestions failed:", errorText);
      return res.status(200).json({
        suggestions: fallback,
        source: "fallback",
        contextMessages: messages.length,
      });
    }

    const data = await aiResponse.json();
    const suggestions = normalizeSuggestions(getResponseText(data));

    res.status(200).json({
      suggestions: suggestions.length ? suggestions : fallback,
      source: suggestions.length ? "openai" : "fallback",
      contextMessages: messages.length,
    });
  } catch (error) {
    console.log("Error in suggestReplies controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

const buildConvoAssistantContext = (knowledgeEntries) => {
  const currentTime = getCurrentAssistantTime();

  return `
You are Convo AI, the built-in assistant inside Convo, an online chatting web application.
Help users with normal questions and with app navigation or feature questions.

Current date and time:
- India time: ${currentTime.india}
- UTC: ${currentTime.iso}

Use the official Convo knowledge below as the source of truth for app-specific questions.
If a user asks about Convo and the exact answer is not present in the official knowledge, say that you are not sure about that exact detail instead of guessing.
For non-Convo general questions, answer normally.
For current events, recent facts, live sports, ongoing tournaments, schedules, prices, news, or anything likely to have changed recently, use Google Search grounding when it is available and base the answer on current retrieved information.
If current information is needed but no reliable current source is available, say that you cannot verify the latest information instead of guessing.
Answer clearly and briefly. If a user asks how to do something in Convo, give direct steps.
Do not claim to perform actions in the app; explain how the user can do them.

Official Convo knowledge:
${knowledgeEntries.length ? formatConvoKnowledge(knowledgeEntries) : "No matching Convo knowledge was retrieved for this question."}
`;
};

export const getAiAssistantMessages = async (req, res) => {
  try {
    await deleteExpiredAiMessages();

    const messages = await AiMessage.find({
      userId: req.user._id,
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: 1 })
      .limit(AI_CHAT_HISTORY_LIMIT)
      .lean();

    res.status(200).json(messages.map(toAiChatMessage));
  } catch (error) {
    console.log("Error in getAiAssistantMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const chatWithAssistant = async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    const cleanMessage = String(message || "").trim();

    if (!cleanMessage) {
      return res.status(400).json({ error: "Message is required" });
    }

    if (process.env.AI_PROVIDER !== "gemini" || !process.env.GEMINI_API_KEY || typeof fetch !== "function") {
      return res.status(200).json({
        reply:
          "Convo AI is not fully configured yet. Add AI_PROVIDER=gemini and GEMINI_API_KEY in the backend .env, then restart the backend.",
        source: "fallback",
      });
    }

    await deleteExpiredAiMessages();

    const recentHistory = Array.isArray(history) ? history.slice(-10) : [];
    const savedHistory = await AiMessage.find({
      userId: req.user._id,
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const conversationHistory = savedHistory.length
      ? savedHistory
          .reverse()
          .map((item) => ({
            role: item.role,
            text: item.text,
          }))
      : recentHistory;

    const knowledgeEntries = retrieveConvoKnowledge(cleanMessage, conversationHistory);
    const contents = [
      ...conversationHistory
        .filter((item) => item?.text)
        .map((item) => ({
          role: item.role === "assistant" ? "model" : "user",
          parts: [{ text: String(item.text).slice(0, 1500) }],
        })),
      {
        role: "user",
        parts: [{ text: cleanMessage }],
      },
    ];

    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const useGoogleSearch = shouldUseGoogleSearchGrounding(cleanMessage);
    const geminiPayload = {
      systemInstruction: {
        parts: [{ text: buildConvoAssistantContext(knowledgeEntries) }],
      },
      contents,
      generationConfig: {
        temperature: 0.25,
        maxOutputTokens: 900,
      },
    };

    if (useGoogleSearch) {
      geminiPayload.tools = [{ google_search: {} }];
    }

    let aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY,
        },
        body: JSON.stringify(geminiPayload),
      }
    );

    let searchGroundingUsed = useGoogleSearch;

    if (!aiResponse.ok && useGoogleSearch) {
      console.warn("Gemini assistant Google Search grounding unavailable; retrying without Search.");
      delete geminiPayload.tools;
      searchGroundingUsed = false;

      aiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": process.env.GEMINI_API_KEY,
          },
          body: JSON.stringify(geminiPayload),
        }
      );
    }

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Gemini assistant failed:", errorText);
      return res.status(502).json({ error: "AI assistant failed to respond" });
    }

    const data = await aiResponse.json();
    const reply = getGeminiResponseText(data);
    const groundingSources = getGeminiGroundingSources(data);
    const cleanReply = appendGroundingSources(
      reply || "I could not generate a response. Please try again.",
      groundingSources
    );

    const savedMessages = await AiMessage.insertMany([
      {
        userId: req.user._id,
        senderId: req.user._id.toString(),
        role: "user",
        text: cleanMessage,
      },
      {
        userId: req.user._id,
        senderId: AI_ASSISTANT_ID,
        role: "assistant",
        text: cleanReply,
      },
    ]);

    res.status(200).json({
      reply: cleanReply,
      userMessage: toAiChatMessage(savedMessages[0]),
      assistantMessage: toAiChatMessage(savedMessages[1]),
      source: "gemini",
      searchGroundingUsed,
      sources: groundingSources,
      knowledge: knowledgeEntries.map((entry) => entry.id),
    });
  } catch (error) {
    console.log("Error in chatWithAssistant controller: ", error.message);
    const providerError =
      error?.name === "TypeError" ||
      /fetch|network|ENOTFOUND|ECONN|ETIMEDOUT|EAI_AGAIN/i.test(error?.message || "");

    res.status(providerError ? 502 : 500).json({
      error: providerError
        ? "Convo AI could not reach the AI service. Check your internet connection and Gemini configuration."
        : "Convo AI could not respond right now. Please try again.",
    });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image, audio, file, replyTo } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;
    const cleanText = String(text || "").trim();

    const receiver = await User.findById(receiverId);

    if (!receiver) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!cleanText && !image && !audio && !file?.data) {
      return res.status(400).json({ error: "Message content is required" });
    }

    if (senderId.toString() !== receiverId.toString()) {
      if (!includesId(req.user.friends, receiverId)) {
        return res.status(403).json({ error: "You can only message friends" });
      }

      if (includesId(req.user.blockedUsers, receiverId)) {
        return res.status(403).json({ error: "Unblock this user before sending messages" });
      }

      if (includesId(receiver.blockedUsers, senderId)) {
        return res.status(403).json({ error: "You cannot message this user" });
      }
    }

    let imageUrl;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    let audioUrl;
    if (audio) {
      audioUrl = await uploadAudio(audio);
    }

    const uploadedFile = await uploadFile(file);

    let replyToMessage = null;
    if (replyTo) {
      replyToMessage = await Message.findById(replyTo);

      if (
        !replyToMessage ||
        replyToMessage.isDeleted ||
        !isInConversation(replyToMessage, senderId, receiverId)
      ) {
        return res.status(400).json({ error: "Invalid reply target" });
      }
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text: cleanText,
      image: imageUrl,
      audio: audioUrl,
      file: uploadedFile || undefined,
      replyTo: replyToMessage?._id || null,
      status: "sent",
    });

    await newMessage.save();
    await newMessage.populate(messagePopulate);

    const decoratedMessage = decorateMessageForUser(newMessage, req.user);
    const receiverSocketId = getReceiverSocketId(toId(receiverId));
    if (receiverSocketId && toId(receiverId) !== toId(senderId)) {
      io.to(receiverSocketId).emit("newMessage", decorateMessageForUser(newMessage, receiver));
    }

    res.status(201).json(decoratedMessage);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const forwardMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const senderId = req.user._id;
    const targets = normalizeForwardTargets(req.body.targets);

    if (!targets.length) {
      return res.status(400).json({ error: "Select at least one chat to forward to" });
    }

    const originalMessage = await Message.findById(messageId);

    if (
      !originalMessage ||
      originalMessage.isDeleted ||
      includesId(originalMessage.deletedFor, senderId)
    ) {
      return res.status(404).json({ error: "Message not found" });
    }

    if (originalMessage.groupId) {
      const sourceGroup = await Group.findById(originalMessage.groupId);
      if (!sourceGroup || !isGroupMember(sourceGroup, senderId)) {
        return res.status(403).json({ error: "You can only forward messages from your chats" });
      }
    } else if (!isConversationParticipant(originalMessage, senderId)) {
      return res.status(403).json({ error: "You can only forward messages from your chats" });
    }

    const payload = getForwardMessagePayload(originalMessage);
    if (!hasForwardableContent(payload)) {
      return res.status(400).json({ error: "This message cannot be forwarded" });
    }

    const forwardedMessages = [];

    for (const target of targets) {
      if (target.type === "group") {
        const group = await Group.findById(target.id).populate("members", "fullName profilePic lastSeen privacy friends");

        if (!group || !isGroupMember(group, senderId)) {
          return res.status(403).json({ error: "You can only forward to groups you belong to" });
        }

        const newMessage = new Message({
          senderId,
          receiverId: null,
          groupId: group._id,
          ...payload,
          status: "sent",
        });

        await newMessage.save();
        await newMessage.populate(messagePopulate);
        await Group.findByIdAndUpdate(group._id, { updatedAt: new Date() });

        group.members.forEach((member) => {
          const memberSocketId = getReceiverSocketId(toId(member));
          if (memberSocketId && toId(member) !== toId(senderId)) {
            io.to(memberSocketId).emit("newGroupMessage", {
              groupId: group._id,
              message: decorateMessageForUser(newMessage, member),
            });
          }
        });

        forwardedMessages.push({
          target,
          message: decorateMessageForUser(newMessage, req.user),
        });
        continue;
      }

      const receiver = await User.findById(target.id);

      if (!receiver) {
        return res.status(404).json({ error: "Forward target not found" });
      }

      if (toId(receiver._id) !== toId(senderId)) {
        if (!includesId(req.user.friends, receiver._id)) {
          return res.status(403).json({ error: "You can only forward to friends" });
        }

        if (includesId(req.user.blockedUsers, receiver._id)) {
          return res.status(403).json({ error: "Unblock this user before forwarding messages" });
        }

        if (includesId(receiver.blockedUsers, senderId)) {
          return res.status(403).json({ error: "You cannot forward messages to this user" });
        }
      }

      const newMessage = new Message({
        senderId,
        receiverId: receiver._id,
        groupId: null,
        ...payload,
        status: "sent",
      });

      await newMessage.save();
      await newMessage.populate(messagePopulate);

      const receiverSocketId = getReceiverSocketId(toId(receiver._id));
      if (receiverSocketId && toId(receiver._id) !== toId(senderId)) {
        io.to(receiverSocketId).emit("newMessage", decorateMessageForUser(newMessage, receiver));
      }

      forwardedMessages.push({
        target,
        message: decorateMessageForUser(newMessage, req.user),
      });
    }

    res.status(201).json({
      count: forwardedMessages.length,
      messages: forwardedMessages,
    });
  } catch (error) {
    console.log("Error in forwardMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const editMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const { text } = req.body;
    const userId = req.user._id;
    const cleanText = String(text || "").trim();

    if (!cleanText) {
      return res.status(400).json({ error: "Message text is required" });
    }

    const message = await Message.findById(messageId);

    if (!message || message.isDeleted) {
      return res.status(404).json({ error: "Message not found" });
    }

    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "You can only edit your own messages" });
    }

    message.text = cleanText;
    message.editedAt = new Date();
    await message.save();
    await message.populate(messagePopulate);

    const decoratedMessage = decorateMessageForUser(message, req.user);
    emitMessageEvent(message, "messageUpdated", decoratedMessage);
    res.status(200).json(decoratedMessage);
  } catch (error) {
    console.log("Error in editMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);

    if (!message || message.isDeleted) {
      return res.status(404).json({ error: "Message not found" });
    }

    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "You can only delete your own messages" });
    }

    message.text = "";
    message.image = "";
    message.audio = "";
    message.file = undefined;
    message.isPinned = false;
    message.isDeleted = true;
    message.deletedAt = new Date();
    await message.save();
    await message.populate(messagePopulate);

    await User.updateMany(
      { starredMessages: message._id },
      { $pull: { starredMessages: message._id } }
    );

    const decoratedMessage = decorateMessageForUser(message, req.user);
    if (message.groupId) {
      const group = await Group.findById(message.groupId);
      group?.members.forEach((memberId) => {
        const memberSocketId = getReceiverSocketId(toId(memberId));
        if (memberSocketId) {
          io.to(memberSocketId).emit("messageDeleted", decoratedMessage);
        }
      });
    } else {
      emitMessageEvent(message, "messageDeleted", decoratedMessage);
    }
    res.status(200).json(decoratedMessage);
  } catch (error) {
    console.log("Error in deleteMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteMessageForMe = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    if (message.groupId) {
      const group = await Group.findById(message.groupId);
      if (!group || !isGroupMember(group, userId)) {
        return res.status(403).json({ error: "You can only delete messages in your chats" });
      }
    } else if (!isConversationParticipant(message, userId)) {
      return res.status(403).json({ error: "You can only delete messages in your chats" });
    }

    if (!includesId(message.deletedFor, userId)) {
      message.deletedFor = [...(message.deletedFor || []), userId];
      await message.save();
    }

    req.user.starredMessages = (req.user.starredMessages || []).filter(
      (starredMessageId) => starredMessageId.toString() !== message._id.toString()
    );
    await req.user.save();

    res.status(200).json({ messageId });
  } catch (error) {
    console.log("Error in deleteMessageForMe controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const togglePinMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);

    if (!message || message.isDeleted) {
      return res.status(404).json({ error: "Message not found" });
    }

    const pinQuery = message.groupId
      ? getGroupMessageQuery(message.groupId)
      : getConversationQuery(message.senderId, message.receiverId);

    if (message.groupId) {
      const group = await Group.findById(message.groupId);
      if (!group || !isGroupMember(group, userId)) {
        return res.status(403).json({ error: "You can only pin messages in your chats" });
      }
    } else if (!isConversationParticipant(message, userId)) {
      return res.status(403).json({ error: "You can only pin messages in your chats" });
    }

    if (!message.isPinned) {
      const pinnedCount = await Message.countDocuments({
        ...pinQuery,
        isPinned: true,
        isDeleted: false,
      });

      if (pinnedCount >= MAX_PINNED_MESSAGES) {
        return res.status(400).json({
          error: `Only ${MAX_PINNED_MESSAGES} messages can be pinned in a chat`,
        });
      }
    }

    message.isPinned = !message.isPinned;
    await message.save();
    await message.populate(messagePopulate);

    const decoratedMessage = decorateMessageForUser(message, req.user);
    await emitMessageUpdateToParticipants(message);
    res.status(200).json(decoratedMessage);
  } catch (error) {
    console.log("Error in togglePinMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const toggleStarMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const user = req.user;

    const message = await Message.findById(messageId).populate(messagePopulate);

    if (!message || message.isDeleted) {
      return res.status(404).json({ error: "Message not found" });
    }

    if (message.groupId) {
      const group = await Group.findById(message.groupId);
      if (!group || !isGroupMember(group, user._id)) {
        return res.status(403).json({ error: "You can only star messages in your chats" });
      }
    } else if (!isConversationParticipant(message, user._id)) {
      return res.status(403).json({ error: "You can only star messages in your chats" });
    }

    const isStarred = includesId(user.starredMessages, message._id);

    if (isStarred) {
      user.starredMessages = user.starredMessages.filter(
        (starredMessageId) => starredMessageId.toString() !== message._id.toString()
      );
    } else {
      user.starredMessages = [message._id, ...(user.starredMessages || [])];
    }

    await user.save();

    res.status(200).json({
      message: decorateMessageForUser(message, user),
      isStarred: !isStarred,
    });
  } catch (error) {
    console.log("Error in toggleStarMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const toggleFavoriteChat = async (req, res) => {
  try {
    const { id: userToFavoriteId } = req.params;

    if (req.user._id.toString() === userToFavoriteId) {
      return res.status(400).json({ error: "Your self-chat is always available" });
    }

    const targetUser = await User.findById(userToFavoriteId).select("_id");

    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const isFavorite = includesId(req.user.favoriteChats, userToFavoriteId);

    if (isFavorite) {
      req.user.favoriteChats = req.user.favoriteChats.filter(
        (favoriteId) => favoriteId.toString() !== userToFavoriteId
      );
    } else {
      if ((req.user.favoriteChats || []).length >= MAX_FAVORITE_CHATS) {
        return res.status(400).json({
          error: `You can favorite up to ${MAX_FAVORITE_CHATS} chats`,
        });
      }

      req.user.favoriteChats = [targetUser._id, ...(req.user.favoriteChats || [])];
    }

    await req.user.save();

    res.status(200).json({
      userId: userToFavoriteId,
      isFavorite: !isFavorite,
      favoriteCount: req.user.favoriteChats.length,
    });
  } catch (error) {
    console.log("Error in toggleFavoriteChat controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const toggleBlockUser = async (req, res) => {
  try {
    const { id: userToBlockId } = req.params;

    if (req.user._id.toString() === userToBlockId) {
      return res.status(400).json({ error: "You cannot block yourself" });
    }

    const targetUser = await User.findById(userToBlockId).select("_id");

    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const isBlocked = includesId(req.user.blockedUsers, userToBlockId);

    if (isBlocked) {
      req.user.blockedUsers = req.user.blockedUsers.filter(
        (blockedId) => blockedId.toString() !== userToBlockId
      );
    } else {
      req.user.blockedUsers = [targetUser._id, ...(req.user.blockedUsers || [])];
      req.user.favoriteChats = (req.user.favoriteChats || []).filter(
        (favoriteId) => favoriteId.toString() !== userToBlockId
      );
    }

    await req.user.save();

    res.status(200).json({
      userId: userToBlockId,
      blockedByMe: !isBlocked,
      isFavorite: isBlocked
        ? includesId(req.user.favoriteChats, userToBlockId)
        : false,
    });
  } catch (error) {
    console.log("Error in toggleBlockUser controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
