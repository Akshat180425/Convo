import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef, useState } from "react";
import UserAvatar from "./UserAvatar";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime, formatDay } from "../lib/utils";
import { Link } from "react-router-dom";
import ImageModel from "./ImageModel";

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
  } = useChatStore();

  const { authUser, socket } = useAuthStore();
  const [fullImageSrc, setFullImageSrc] = useState(null);
  const messageEndRef = useRef(null);

  useEffect(() => {
    getMessages(selectedUser._id);
    subscribeToMessages();

    return () => unsubscribeFromMessages();
  }, [selectedUser._id, getMessages, subscribeToMessages, unsubscribeFromMessages]);

  useEffect(() => {
    if (messageEndRef.current && messages) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (!messages || !selectedUser || !socket) return;

    const unreadMessageIds = messages
      .filter(
        (msg) =>
          msg.senderId === selectedUser._id && msg.status === "sent"
      )
      .map((msg) => msg._id);

    if (unreadMessageIds.length > 0) {
      socket.emit("read_message", {
        messageIds: unreadMessageIds,
      });
    }
  }, [messages, selectedUser, socket]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setFullImageSrc(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {(messages || []).map((message, index) => {
          const currentDate = formatDay(message.createdAt);
          const prevDate =
            index > 0 ? formatDay(messages[index - 1].createdAt) : null;

          const isFirstMessageOfDay = currentDate !== prevDate;

          return (
            <div key={message._id}>
              {isFirstMessageOfDay && (
                <div className="text-center my-4">
                  <span className="bg-base-200 text-xs text-gray-700 px-3 py-1 rounded-full">
                    {currentDate}
                  </span>
                </div>
              )}

              <div
                className={`chat ${message.senderId === authUser._id ? "chat-end" : "chat-start"}`}
                ref={messageEndRef}
              >
                {message.senderId !== authUser._id ? (
                  <Link to={`/profile/${selectedUser._id}`} className="relative mx-auto lg:mx-0 group">
                    {selectedUser.profilePic ? (
                      <img
                        src={selectedUser.profilePic}
                        alt={selectedUser.fullName}
                        className="size-12 object-cover rounded-full group-hover:brightness-90 transition"
                      />
                    ) : (
                      <UserAvatar name={selectedUser.fullName} size="48px" />
                    )}
                  </Link>
                ) : (
                  <div className="relative mx-auto lg:mx-0">
                    {authUser.profilePic ? (
                      <img
                        src={authUser.profilePic}
                        alt={authUser.fullName}
                        className="size-12 object-cover rounded-full"
                      />
                    ) : (
                      <UserAvatar name={authUser.fullName} size="48px" />
                    )}
                  </div>
                )}

                <div className="chat-header mb-1">
                  <time className="text-xs opacity-50 ml-1">
                    {formatMessageTime(message.createdAt)}
                  </time>
                </div>

                <div className="chat-bubble flex flex-col">
                  {message.image && (
                    <img
                      src={message.image}
                      alt="Attachment"
                      className="sm:max-w-[200px] rounded-md mb-2 cursor-pointer hover:opacity-80 transition"
                      onClick={() => setFullImageSrc(message.image)}
                    />
                  )}
                  {message.text && <p>{message.text}</p>}
                  {message.senderId === authUser._id && (
                    <span className="text-[10px] text-right mt-1 opacity-70">
                      {message.status === "read" ? "✔✔" : "✓"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <MessageInput />

      {fullImageSrc && (
        <ImageModel src={fullImageSrc} onClose={() => setFullImageSrc(null)} />
      )}
    </div>
  );
};

export default ChatContainer;
