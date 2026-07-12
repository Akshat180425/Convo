import { useEffect } from "react";
import { MessageSquare, Star } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { formatMessageTime } from "../lib/utils";

const NoChatSelected = () => {
  const { authUser } = useAuthStore();
  const {
    getStarredMessages,
    groups,
    isStarredMessagesLoading,
    openChatAtMessage,
    setSelectedUser,
    starredMessages,
    users,
  } = useChatStore();

  useEffect(() => {
    getStarredMessages();
  }, [getStarredMessages]);

  const getMessageText = (message) =>
    message.text || (message.image ? "Photo" : message.audio ? "Audio" : message.file?.url ? "File" : "Message");

  const getParticipantName = (participant) =>
    participant?._id === authUser?._id ? "You" : participant?.fullName;

  const getUserForParticipant = (participant) => {
    if (!participant || participant._id === authUser?._id) return null;
    return users.find((user) => user._id === participant._id) || null;
  };

  const openStarredChat = (message) => {
    if (message.groupId) {
      const groupId =
        typeof message.groupId === "object" ? message.groupId._id : message.groupId;
      const groupToOpen = groups.find((group) => group._id === groupId);

      if (groupToOpen) {
        openChatAtMessage(groupToOpen, message._id);
      }
      return;
    }

    const sender = message.senderId;
    const receiver = message.receiverId;
    const otherParticipant =
      sender?._id === authUser?._id ? receiver : sender;
    const userToOpen =
      sender?._id === receiver?._id
        ? users.find((user) => user._id === authUser?._id)
        : users.find((user) => user._id === otherParticipant?._id);

    if (userToOpen) {
      openChatAtMessage(userToOpen, message._id);
    }
  };

  const openParticipantChat = (participant) => {
    const userToOpen = getUserForParticipant(participant);

    if (userToOpen) {
      setSelectedUser(userToOpen);
    }
  };

  const renderParticipant = (participant) => {
    const participantName = getParticipantName(participant);
    const userToOpen = getUserForParticipant(participant);

    if (!userToOpen) return <span>{participantName}</span>;

    return (
      <button
        type="button"
        onClick={() => openParticipantChat(participant)}
        className="font-medium hover:underline"
      >
        {participantName}
      </button>
    );
  };

  return (
    <div className="w-full flex flex-1 flex-col items-center justify-center p-6 sm:p-16 bg-base-100/50">
      <div className="w-full max-w-xl text-center space-y-6">
        <div className="flex justify-center gap-4 mb-4">
          <div className="relative">
            <div
              className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center
             justify-center animate-bounce"
            >
              <MessageSquare className="w-8 h-8 text-primary " />
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold">Welcome to Convo!</h2>
          <p className="mt-2 text-base-content/60">
            Select a conversation from the sidebar to start chatting
          </p>
        </div>

        <div className="mx-auto w-full max-w-lg rounded-lg border border-base-300 bg-base-100 text-left">
          <div className="flex items-center gap-2 border-b border-base-300 px-4 py-3">
            <Star className="size-4 text-yellow-500" fill="currentColor" />
            <h3 className="font-medium">Starred Messages</h3>
          </div>

          {isStarredMessagesLoading ? (
            <div className="p-4 text-sm text-base-content/60">Loading starred messages...</div>
          ) : starredMessages.length === 0 ? (
            <div className="p-4 text-sm text-base-content/60">
              Star messages from any chat and they will appear here.
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto overscroll-contain">
              {starredMessages.map((message) => (
                <div
                  key={message._id}
                  className="border-b border-base-200 px-4 py-3 text-left last:border-b-0 hover:bg-base-200"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-sm">
                      {message.groupId
                        ? `${getParticipantName(message.senderId)} in ${
                            typeof message.groupId === "object" ? message.groupId.name : "Group"
                          }`
                        : (
                          <>
                            {renderParticipant(message.senderId)} to {renderParticipant(message.receiverId)}
                          </>
                        )}
                    </span>
                    <time className="shrink-0 text-xs text-base-content/50">
                      {formatMessageTime(message.createdAt)}
                    </time>
                  </div>
                  <button
                    type="button"
                    onClick={() => openStarredChat(message)}
                    className="mt-1 block w-full truncate text-left text-sm text-base-content/70"
                  >
                    {getMessageText(message)}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NoChatSelected;
