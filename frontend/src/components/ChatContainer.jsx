import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef, useState } from "react";
import { Bot, Check, CheckCheck, Download, FileText, Flag, Forward, Mic, Pause, Pencil, Pin, PinOff, Play, Reply, Search, Star, Trash2, Upload, UsersRound, X } from "lucide-react";
import UserAvatar from "./UserAvatar";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import ReportModal from "./ReportModal";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime, formatDay, formatFileSize, getMessageFileDownloadUrl } from "../lib/utils";
import { Link } from "react-router-dom";
import ImageModel from "./ImageModel";

const formatAudioTime = (value) => {
  if (!Number.isFinite(value)) return "0:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
};

const AUDIO_PLAYBACK_SPEEDS = [1, 1.5, 2];

const AudioMessage = ({ src }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  const progress = duration ? Math.min((currentTime / duration) * 100, 100) : 0;

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      await audio.play();
    } else {
      audio.pause();
    }
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;

    const nextTime = (Number(e.target.value) / 100) * duration;
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const handleSpeedChange = (e) => {
    setPlaybackSpeed(Number(e.target.value));
  };

  return (
    <div className="mb-2 flex w-80 max-w-full min-w-0 items-center gap-3 rounded-lg border border-base-content/10 bg-base-100/40 px-3 py-2 shadow-sm">
      <button
        type="button"
        onClick={togglePlayback}
        className="btn btn-primary btn-sm btn-circle shrink-0"
        aria-label={isPlaying ? "Pause audio" : "Play audio"}
        title={isPlaying ? "Pause audio" : "Play audio"}
      >
        {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
      </button>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2 text-xs opacity-80">
          <Mic className="size-3.5" />
          <span className="min-w-0 flex-1 truncate">Voice message</span>
          <select
            className="select select-bordered h-7 min-h-7 w-[4.5rem] shrink-0 rounded-full bg-base-100/80 pl-3 pr-7 text-center text-xs font-medium leading-none [text-align-last:center]"
            value={playbackSpeed}
            onChange={handleSpeedChange}
            aria-label="Audio playback speed"
            title="Playback speed"
          >
            {AUDIO_PLAYBACK_SPEEDS.map((speed) => (
              <option key={speed} value={speed}>
                {speed}x
              </option>
            ))}
          </select>
        </div>
        <div className="mb-1 text-right text-[10px] tabular-nums opacity-70">
          {formatAudioTime(currentTime)} / {formatAudioTime(duration)}
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={progress}
          onChange={handleSeek}
          className="range range-primary range-xs"
          aria-label="Audio progress"
        />
      </div>

      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={(e) => {
          e.currentTarget.playbackRate = playbackSpeed;
          setDuration(e.currentTarget.duration || 0);
        }}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime || 0)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
      />
    </div>
  );
};

const FileMessage = ({ file, messageId }) => {
  if (!file?.url) return null;
  const fileUrl = getMessageFileDownloadUrl(messageId);

  return (
    <a
      href={fileUrl}
      target="_blank"
      download={file.name || true}
      rel="noreferrer"
      className="mb-2 flex w-72 max-w-full min-w-0 items-center gap-3 rounded-lg border border-base-content/10 bg-base-100/40 px-3 py-2 shadow-sm transition hover:bg-base-100/60"
      title={file.name || "Download file"}
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <FileText className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{file.name || "Shared file"}</p>
        <p className="text-xs opacity-70">{formatFileSize(file.size) || "File"}</p>
      </div>
      <Download className="size-4 shrink-0 opacity-70" />
    </a>
  );
};

const MessageStatus = ({ status, className = "" }) => (
  <span
    className={className}
    title={status === "read" ? "Read" : "Sent"}
  >
    {status === "read" ? (
      <CheckCheck className="size-3.5" />
    ) : (
      <Check className="size-3.5" />
    )}
  </span>
);

const escapeRegExp = (value = "") =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const hasDraggedFiles = (event) =>
  Array.from(event.dataTransfer?.types || []).includes("Files");

const getMessageSenderId = (message) =>
  typeof message?.senderId === "object" ? message.senderId._id : message?.senderId;

const isSameSenderRun = (message, previousMessage) =>
  Boolean(previousMessage) &&
  getMessageSenderId(message) === getMessageSenderId(previousMessage) &&
  formatDay(message.createdAt) === formatDay(previousMessage.createdAt);

const ChatContainer = () => {
  const {
    groups,
    messages,
    clearScrollTargetMessageId,
    forwardMessage,
    getMessages,
    isAiAssistantResponding,
    isMessagesLoading,
    scrollTargetMessageId,
    selectedUser,
    setEditingMessage,
    setReplyingTo,
    subscribeToMessages,
    deleteMessage,
    deleteMessageForMe,
    togglePinMessage,
    toggleStarMessage,
    unsubscribeFromMessages,
    users,
  } = useChatStore();

  const { authUser, socket } = useAuthStore();
  const [fullImageSrc, setFullImageSrc] = useState(null);
  const [messageToDelete, setMessageToDelete] = useState(null);
  const [messageToForward, setMessageToForward] = useState(null);
  const [messageToReport, setMessageToReport] = useState(null);
  const [forwardTargets, setForwardTargets] = useState([]);
  const [forwardSearchQuery, setForwardSearchQuery] = useState("");
  const [isForwardingMessage, setIsForwardingMessage] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const messageEndRef = useRef(null);
  const messageRefs = useRef({});
  const dragDepthRef = useRef(0);
  const previousMessagesRef = useRef({
    userId: null,
    length: 0,
    lastMessageId: null,
  });

  useEffect(() => {
    messageRefs.current = {};
    setHighlightedMessageId(null);
  }, [selectedUser?._id]);

  useEffect(() => {
    getMessages(selectedUser._id);

    if (selectedUser.isAiAssistant) return;

    subscribeToMessages();

    return () => unsubscribeFromMessages();
  }, [
    getMessages,
    selectedUser._id,
    selectedUser.isAiAssistant,
    subscribeToMessages,
    unsubscribeFromMessages,
  ]);

  useEffect(() => {
    const lastMessageId = messages?.at(-1)?._id || null;
    const previousMessages = previousMessagesRef.current;
    const currentUserId = selectedUser?._id || null;
    const shouldScroll =
      currentUserId !== previousMessages.userId ||
      ((messages?.length || 0) >= previousMessages.length &&
        lastMessageId !== previousMessages.lastMessageId);

    previousMessagesRef.current = {
      userId: currentUserId,
      length: messages?.length || 0,
      lastMessageId,
    };

    if (!scrollTargetMessageId && shouldScroll && messageEndRef.current && messages) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, scrollTargetMessageId, selectedUser?._id]);

  useEffect(() => {
    if (!scrollTargetMessageId || isMessagesLoading) return;

    let timeoutId;
    let attempts = 0;

    const scrollWhenReady = () => {
      const targetElement = messageRefs.current[scrollTargetMessageId];
      const targetExists = messages?.some((message) => message._id === scrollTargetMessageId);

      if (targetElement && targetExists) {
        targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
        setHighlightedMessageId(scrollTargetMessageId);
        clearScrollTargetMessageId();

        window.setTimeout(() => {
          setHighlightedMessageId(null);
        }, 1400);
        return;
      }

      attempts += 1;
      if (attempts < 12) {
        timeoutId = window.setTimeout(scrollWhenReady, 80);
      }
    };

    timeoutId = window.setTimeout(scrollWhenReady, 80);

    return () => window.clearTimeout(timeoutId);
  }, [
    clearScrollTargetMessageId,
    isMessagesLoading,
    messages,
    scrollTargetMessageId,
  ]);

  useEffect(() => {
    if (!messages || !selectedUser || !socket) return;

    const unreadMessageIds = messages
      .filter(
        (msg) =>
          getSenderId(msg) !== authUser._id &&
          (selectedUser.isGroup
            ? !(msg.readBy || []).some((readerId) => readerId?.toString?.() === authUser._id || readerId === authUser._id)
            : getSenderId(msg) === selectedUser._id && msg.status === "sent")
      )
      .map((msg) => msg._id);

    if (unreadMessageIds.length > 0) {
      socket.emit("read_message", {
        messageIds: unreadMessageIds,
      });
    }
  }, [authUser._id, messages, selectedUser, socket]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setFullImageSrc(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const getPreviewText = (message) => {
    if (!message) return "Message";
    if (message.isDeleted) return "Deleted message";
    return message.text || (message.image ? "Photo" : message.audio ? "Audio" : message.file?.url ? "File" : "Message");
  };

  const getPreviewSender = (message) => {
    if (!message) return "";
    const senderId = getSenderId(message);
    if (senderId === authUser._id) return "You";
    if (typeof message.senderId === "object") return message.senderId.fullName;
    return selectedUser.isGroup ? "Member" : selectedUser.fullName;
  };

  const getSenderId = (message) => getMessageSenderId(message);

  const getSenderName = (message) => {
    if (getSenderId(message) === authUser._id) return authUser.fullName;
    if (typeof message?.senderId === "object") return message.senderId.fullName;
    return selectedUser.fullName;
  };

  const scrollToMessage = (messageId) => {
    messageRefs.current[messageId]?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };

  const renderMessageText = (message) => {
    const text = message.text || "";
    const mentions = (message.mentions || [])
      .filter((mention) => mention?.userId && mention?.name && text.includes(`@${mention.name}`))
      .sort((a, b) => b.name.length - a.name.length);

    if (!mentions.length) return text;

    const mentionByToken = new Map(
      mentions.map((mention) => [`@${mention.name}`, mention])
    );
    const pattern = new RegExp(
      `(${mentions.map((mention) => `@${escapeRegExp(mention.name)}`).join("|")})`,
      "g"
    );

    return text.split(pattern).map((part, index) => {
      const mention = mentionByToken.get(part);
      if (!mention) return <span key={`${part}-${index}`}>{part}</span>;

      return (
        <Link
          key={`${mention.userId}-${index}`}
          to={`/profile/${mention.userId}`}
          className="rounded px-0.5 font-semibold text-primary hover:bg-primary/10 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </Link>
      );
    });
  };

  const renderMessageMeta = (message, isMine, isDeleted, inline = false) => {
    const className = inline
      ? "ml-2 inline-flex items-end justify-end gap-1 whitespace-nowrap align-baseline leading-none"
      : "mt-1 flex items-end justify-end gap-1 self-end whitespace-nowrap leading-none";

    return (
      <span className={className}>
        <time className="text-[10px] tabular-nums opacity-60">
          {formatMessageTime(message.createdAt)}
        </time>
        {message.editedAt && !isDeleted && (
          <span className="text-[10px] opacity-60">edited</span>
        )}
        {isMine && !isAiChat && (
          <MessageStatus
            status={message.status}
            className="opacity-70"
          />
        )}
      </span>
    );
  };

  const handleDeleteMessage = (messageId) => {
    const message = messages.find((item) => item._id === messageId);
    setMessageToDelete(message || null);
  };

  const handleDragEnter = (event) => {
    if (!hasDraggedFiles(event)) return;
    event.preventDefault();
    dragDepthRef.current += 1;
    setIsDraggingFile(true);
  };

  const handleDragOver = (event) => {
    if (!hasDraggedFiles(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  };

  const handleDragLeave = (event) => {
    if (!hasDraggedFiles(event)) return;
    event.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setIsDraggingFile(false);
  };

  const handleDrop = (event) => {
    if (!hasDraggedFiles(event)) return;
    event.preventDefault();
    dragDepthRef.current = 0;
    setIsDraggingFile(false);

    const file = event.dataTransfer.files?.[0];
    if (!file) return;

    window.dispatchEvent(
      new CustomEvent("convo:chat-file-drop", {
        detail: { file },
      })
    );
  };

  const confirmDeleteForEveryone = async () => {
    if (!messageToDelete) return;
    await deleteMessage(messageToDelete._id);
    setMessageToDelete(null);
  };

  const confirmDeleteForMe = async () => {
    if (!messageToDelete) return;
    await deleteMessageForMe(messageToDelete._id);
    setMessageToDelete(null);
  };

  const openForwardModal = (message) => {
    setMessageToForward(message);
    setForwardTargets([]);
    setForwardSearchQuery("");
  };

  const closeForwardModal = () => {
    if (isForwardingMessage) return;
    setMessageToForward(null);
    setForwardTargets([]);
    setForwardSearchQuery("");
  };

  const toggleForwardTarget = (target) => {
    const key = `${target.type}:${target.id}`;
    setForwardTargets((targets) =>
      targets.some((item) => `${item.type}:${item.id}` === key)
        ? targets.filter((item) => `${item.type}:${item.id}` !== key)
        : [...targets, { type: target.type, id: target.id }]
    );
  };

  const confirmForwardMessage = async () => {
    if (!messageToForward || !forwardTargets.length) return;

    setIsForwardingMessage(true);
    const result = await forwardMessage(messageToForward._id, forwardTargets);
    setIsForwardingMessage(false);

    if (result) {
      closeForwardModal();
    }
  };

  const renderMessageActions = (message, isMine, isDeleted) => {
    if (isAiChat) return null;

    return (
      <div
        className={`absolute top-1/2 z-10 flex -translate-y-1/2 gap-0.5 rounded-full bg-base-100/95 p-0.5 opacity-0 shadow-sm transition-opacity duration-150 pointer-events-none group-hover/message:opacity-100 group-hover/message:pointer-events-auto group-focus-within/message:opacity-100 group-focus-within/message:pointer-events-auto ${
          isMine ? "right-full mr-1" : "left-full ml-1"
        }`}
      >
        {!isDeleted && (
          <button
            type="button"
            className={`btn btn-ghost btn-xs btn-circle min-h-7 h-7 w-7 ${
              message.isStarredByMe ? "text-yellow-500" : ""
            }`}
            onClick={() => toggleStarMessage(message._id)}
            aria-label={message.isStarredByMe ? "Unstar message" : "Star message"}
            title={message.isStarredByMe ? "Unstar message" : "Star message"}
          >
            <Star size={14} fill={message.isStarredByMe ? "currentColor" : "none"} />
          </button>
        )}
        {!isDeleted && (
          <button
            type="button"
            className="btn btn-ghost btn-xs btn-circle min-h-7 h-7 w-7"
            onClick={() => setReplyingTo(message)}
            aria-label="Reply"
            title="Reply"
          >
            <Reply size={14} />
          </button>
        )}
        {!isDeleted && (
          <button
            type="button"
            className="btn btn-ghost btn-xs btn-circle min-h-7 h-7 w-7"
            onClick={() => openForwardModal(message)}
            aria-label="Forward"
            title="Forward"
          >
            <Forward size={14} />
          </button>
        )}
        {!isMine && !isDeleted && (
          <button
            type="button"
            className="btn btn-ghost btn-xs btn-circle min-h-7 h-7 w-7 text-error"
            onClick={() => setMessageToReport(message)}
            aria-label="Report message"
            title="Report message"
          >
            <Flag size={14} />
          </button>
        )}
        {!isDeleted && (
          <button
            type="button"
            className="btn btn-ghost btn-xs btn-circle min-h-7 h-7 w-7"
            onClick={() => togglePinMessage(message._id)}
            aria-label={message.isPinned ? "Unpin message" : "Pin message"}
            title={message.isPinned ? "Unpin message" : "Pin message"}
          >
            {message.isPinned ? <PinOff size={14} /> : <Pin size={14} />}
          </button>
        )}
        {isMine && !isDeleted && message.text && (
          <button
            type="button"
            className="btn btn-ghost btn-xs btn-circle min-h-7 h-7 w-7"
            onClick={() => setEditingMessage(message)}
            aria-label="Edit message"
            title="Edit message"
          >
            <Pencil size={14} />
          </button>
        )}
        <button
          type="button"
          className="btn btn-ghost btn-xs btn-circle min-h-7 h-7 w-7 text-error"
          onClick={() => handleDeleteMessage(message._id)}
          aria-label="Delete message"
          title="Delete message"
        >
          <Trash2 size={14} />
        </button>
      </div>
    );
  };

  const isAiChat = Boolean(selectedUser.isAiAssistant);
  const pinnedMessages = isAiChat ? [] : (messages || []).filter(
    (message) => message.isPinned && !message.isDeleted
  );
  const cleanForwardSearchQuery = forwardSearchQuery.trim().toLowerCase();
  const forwardTargetOptions = [
    ...users
      .filter((user) => user._id !== authUser._id && !user.isAiAssistant && !user.blockedByMe && !user.hasBlockedMe)
      .map((user) => ({
        type: "direct",
        id: user._id,
        name: user.fullName,
        detail: user.status || user.email || "Friend",
        profilePic: user.profilePic,
      })),
    ...groups.map((group) => ({
      type: "group",
      id: group._id,
      name: group.name,
      detail: `${group.members?.length || 0} members`,
      profilePic: group.groupPic,
      isGroup: true,
    })),
  ].filter((target) =>
    cleanForwardSearchQuery
      ? [target.name, target.detail]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(cleanForwardSearchQuery))
      : true
  );

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-x-hidden overflow-y-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div
      className="relative flex-1 flex flex-col overflow-x-hidden overflow-y-auto"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDraggingFile && (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-base-100/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-primary bg-base-200 px-8 py-6 text-center shadow-xl">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Upload className="size-6" />
            </div>
            <div>
              <p className="font-semibold">Drop to attach</p>
              <p className="text-sm text-base-content/60">
                Images and files will appear in the message preview.
              </p>
            </div>
          </div>
        </div>
      )}
      <ChatHeader />

      {pinnedMessages.length > 0 && (
        <div className="border-b border-base-300 bg-base-100 px-4 py-2">
          <div className="flex items-center gap-2 overflow-x-auto">
            <Pin size={16} className="shrink-0 text-primary" />
            {pinnedMessages.map((message) => (
              <button
                key={message._id}
                type="button"
                onClick={() => scrollToMessage(message._id)}
                className="btn btn-xs max-w-56 justify-start normal-case"
                title={getPreviewText(message)}
              >
                <span className="truncate">
                  {getPreviewSender(message)}: {getPreviewText(message)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {isAiChat && (
        <div className="border-b border-base-300 bg-base-100/80 px-4 py-2 text-center text-xs text-base-content/70">
          Convo AI chats are stored for 1 day only.
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        {(messages || []).map((message, index) => {
          const previousMessage = index > 0 ? messages[index - 1] : null;
          const currentDate = formatDay(message.createdAt);
          const prevDate =
            previousMessage ? formatDay(previousMessage.createdAt) : null;

          const isFirstMessageOfDay = currentDate !== prevDate;
          const isGroupedWithPrevious = !isFirstMessageOfDay && isSameSenderRun(message, previousMessage);
          const isMine = getSenderId(message) === authUser._id;
          const isDeleted = message.isDeleted;
          const senderId = getSenderId(message);
          const isAiMessage = isAiChat && !isMine;
          const senderName = getSenderName(message);
          const senderProfilePic =
            typeof message.senderId === "object" ? message.senderId.profilePic : selectedUser.profilePic;
          const profilePath =
            senderId === authUser._id ? "/profile" : `/profile/${senderId || selectedUser._id}`;
          const isHighlighted = highlightedMessageId === message._id;

          return (
            <div
              key={message._id}
              className={isGroupedWithPrevious ? "mb-1" : "mb-4"}
              ref={(element) => {
                messageRefs.current[message._id] = element;
              }}
            >
              {isFirstMessageOfDay && (
                <div className="text-center my-4">
                  <span className="bg-base-200 text-xs text-gray-700 px-3 py-1 rounded-full">
                    {currentDate}
                  </span>
                </div>
              )}

              <div className={`group/message relative flex ${isMine ? "justify-end" : "justify-start"}`}>
                {!isGroupedWithPrevious && !isMine && (
                  isAiMessage ? (
                    <div className="absolute left-0 top-0 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Bot className="size-6" />
                    </div>
                  ) : (
                    <Link to={profilePath} className="absolute left-0 top-0 group">
                      <UserAvatar name={senderName} profilePic={senderProfilePic} size="48px" />
                    </Link>
                  )
                )}

                {!isGroupedWithPrevious && isMine && (
                  <div className="absolute right-0 top-0">
                    <UserAvatar name={authUser.fullName} profilePic={authUser.profilePic} size="48px" />
                  </div>
                )}

                <div
                  className={`flex w-fit max-w-[calc(85%-3.5rem)] flex-col sm:max-w-[calc(70%-3.5rem)] ${
                    isMine ? "mr-14 items-end" : "ml-14 items-start"
                  }`}
                >
                  {!isGroupedWithPrevious && selectedUser.isGroup && !isMine && !isAiMessage && (
                  <div className="mb-0.5 flex w-full justify-start">
                    <span className="text-xs font-medium opacity-60">
                      {senderName}
                    </span>
                  </div>
                  )}

                  <div className="relative w-fit max-w-full">
                    {renderMessageActions(message, isMine, isDeleted)}
                    <div
                      className={`chat-bubble flex w-fit max-w-full min-w-0 flex-col transition duration-300 ${
                        isHighlighted ? "brightness-75" : "brightness-100"
                      }`}
                    >
                    {message.replyTo && (
                      <button
                        type="button"
                        onClick={() => scrollToMessage(message.replyTo._id)}
                        className="mb-2 max-w-60 rounded-md border-l-2 border-base-content/40 bg-base-100/20 px-3 py-2 text-left"
                      >
                        <span className="block text-xs font-medium opacity-80">
                          {getPreviewSender(message.replyTo)}
                        </span>
                        <span className="block truncate text-xs opacity-70">
                          {getPreviewText(message.replyTo)}
                        </span>
                      </button>
                    )}
                    {isDeleted ? (
                      <p className="italic opacity-70">Message deleted</p>
                    ) : (
                      <>
                        {message.image && (
                          <img
                            src={message.image}
                            alt="Attachment"
                            className="sm:max-w-[200px] rounded-md mb-2 cursor-pointer hover:opacity-80 transition"
                            onClick={() => setFullImageSrc(message.image)}
                          />
                        )}
                        {message.audio && (
                          <AudioMessage src={message.audio} />
                        )}
                        {message.file?.url && (
                          <FileMessage file={message.file} messageId={message._id} />
                        )}
                        {message.text && (
                          <p className="whitespace-pre-wrap break-words">
                            {renderMessageText(message)}
                            {renderMessageMeta(message, isMine, isDeleted, true)}
                          </p>
                        )}
                      </>
                    )}
                    {(!message.text || isDeleted) && renderMessageMeta(message, isMine, isDeleted)}
                  </div>
                </div>
                </div>
              </div>
            </div>
          );
        })}
        {isAiAssistantResponding && (
          <div className="flex items-start gap-2">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Bot className="size-6" />
            </div>
            <div className="chat-bubble">
              <span className="loading loading-dots loading-sm" />
            </div>
          </div>
        )}
        <div ref={messageEndRef} />
      </div>

      <MessageInput />

      {fullImageSrc && (
        <ImageModel src={fullImageSrc} onClose={() => setFullImageSrc(null)} />
      )}

      {messageToForward && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[85vh] w-full max-w-md flex-col rounded-lg bg-base-100 shadow-xl">
            <div className="flex items-center justify-between gap-3 border-b border-base-300 p-4">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold">Forward message</h3>
                <p className="truncate text-sm text-base-content/60">
                  {getPreviewText(messageToForward)}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-circle"
                onClick={closeForwardModal}
                disabled={isForwardingMessage}
                aria-label="Close forward dialog"
                title="Close"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="border-b border-base-300 p-3">
              <label className="input input-bordered input-sm flex items-center gap-2">
                <Search className="size-4 opacity-60" />
                <input
                  type="search"
                  className="min-w-0 flex-1"
                  value={forwardSearchQuery}
                  onChange={(e) => setForwardSearchQuery(e.target.value)}
                  placeholder="Search chats"
                  autoFocus
                />
              </label>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {forwardTargetOptions.length > 0 ? (
                forwardTargetOptions.map((target) => {
                  const isSelected = forwardTargets.some(
                    (item) => item.type === target.type && item.id === target.id
                  );

                  return (
                    <button
                      key={`${target.type}:${target.id}`}
                      type="button"
                      onClick={() => toggleForwardTarget(target)}
                      className={`flex w-full items-center gap-3 rounded-md p-2 text-left transition hover:bg-base-200 ${
                        isSelected ? "bg-primary/10" : ""
                      }`}
                    >
                      {target.isGroup ? (
                        target.profilePic ? (
                          <img
                            src={target.profilePic}
                            alt={target.name}
                            className="size-10 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <UsersRound className="size-5" />
                          </div>
                        )
                      ) : (
                        <UserAvatar name={target.name} profilePic={target.profilePic} size="40px" />
                      )}

                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{target.name}</span>
                        <span className="block truncate text-sm text-base-content/60">
                          {target.isGroup ? "Group" : target.detail}
                        </span>
                      </span>

                      <span
                        className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${
                          isSelected ? "border-primary bg-primary text-primary-content" : "border-base-content/30"
                        }`}
                      >
                        {isSelected && <Check className="size-3" />}
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="px-4 py-8 text-center text-sm text-base-content/60">
                  No chats found.
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-base-300 p-4">
              <span className="text-sm text-base-content/60">
                {forwardTargets.length} selected
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={closeForwardModal}
                  disabled={isForwardingMessage}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={confirmForwardMessage}
                  disabled={!forwardTargets.length || isForwardingMessage}
                >
                  {isForwardingMessage ? "Forwarding..." : "Forward"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {messageToReport && (
        <ReportModal
          type="message"
          targetId={messageToReport._id}
          targetName={getPreviewSender(messageToReport)}
          preview={getPreviewText(messageToReport)}
          onClose={() => setMessageToReport(null)}
        />
      )}

      {messageToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-base-100 p-5 shadow-xl">
            <h3 className="text-lg font-semibold">Delete message?</h3>
            <p className="mt-2 text-sm text-base-content/70">
              {messageToDelete.isDeleted
                ? "Remove this deleted-message placeholder from your conversation."
                : getSenderId(messageToDelete) === authUser._id
                ? "Delete this message just for you, or remove it for everyone in the conversation."
                : "This message will be removed from your conversation only."}
            </p>
            <div className="mt-4 rounded-md bg-base-200 px-3 py-2 text-sm text-base-content/70">
              <p className="line-clamp-2">
                {getPreviewText(messageToDelete)}
              </p>
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setMessageToDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={confirmDeleteForMe}
              >
                Delete for me
              </button>
              {getSenderId(messageToDelete) === authUser._id && !messageToDelete.isDeleted && (
                <button
                  type="button"
                  className="btn btn-error btn-sm"
                  onClick={confirmDeleteForEveryone}
                >
                  Delete for everyone
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatContainer;
