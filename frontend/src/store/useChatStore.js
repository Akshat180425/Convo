import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

const applyMessageUpdate = (messages, updatedMessage) =>
  messages.map((message) => {
    const mergedMessage =
      message._id === updatedMessage._id
        ? {
            ...message,
            ...updatedMessage,
            isStarredByMe: updatedMessage.isStarredByMe ?? message.isStarredByMe,
          }
        : message;

    if (mergedMessage.replyTo?._id === updatedMessage._id) {
      return { ...mergedMessage, replyTo: updatedMessage };
    }

    return mergedMessage;
  });

let starredMessagesRequestId = 0;

const getMessageSenderId = (message) =>
  typeof message?.senderId === "object" ? message.senderId._id : message?.senderId;

export const AI_ASSISTANT_ID = "convo-ai-assistant";

export const AI_ASSISTANT_USER = {
  _id: AI_ASSISTANT_ID,
  fullName: "Convo AI",
  status: "Ask about Convo or anything else",
  profilePic: "",
  isAiAssistant: true,
};

const AI_WELCOME_MESSAGE = {
  _id: "ai-welcome",
  senderId: AI_ASSISTANT_ID,
  text: "Hi, I am Convo AI. Ask me anything, including how to use this app.",
  createdAt: new Date().toISOString(),
};

const removeGroupFromState = (state, groupId) => ({
  groups: state.groups.filter((group) => group._id !== groupId),
  selectedUser:
    state.selectedUser?.isGroup && state.selectedUser._id === groupId
      ? null
      : state.selectedUser,
  messages:
    state.selectedUser?.isGroup && state.selectedUser._id === groupId
      ? []
      : state.messages,
  suggestions: [],
  replyingTo: null,
  editingMessage: null,
});

const updateGroupInState = (state, updatedGroup) => ({
  groups: state.groups.map((group) =>
    group._id === updatedGroup._id ? { ...group, ...updatedGroup } : group
  ),
  selectedUser:
    state.selectedUser?.isGroup && state.selectedUser._id === updatedGroup._id
      ? { ...state.selectedUser, ...updatedGroup }
      : state.selectedUser,
});

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  groups: [],
  friendRequests: { incoming: [], outgoing: [] },
  friendSuggestions: [],
  selectedUser: null,
  activeSidebarTab: "friends",
  sidebarSearchQuery: "",
  aiMessages: [AI_WELCOME_MESSAGE],
  isAiAssistantResponding: false,
  groupDraft: {
    name: "",
    details: "",
    groupPic: null,
    memberIds: [],
    isSelectingMembers: false,
  },
  starredMessages: [],
  scrollTargetMessageId: null,
  messageSearchResults: [],
  suggestions: [],
  replyingTo: null,
  editingMessage: null,
  isUsersLoading: false,
  isGroupsLoading: false,
  isFriendDataLoading: false,
  isMessagesLoading: false,
  isStarredMessagesLoading: false,
  isMessageSearchLoading: false,
  isSuggestionsLoading: false,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load users");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getGroups: async () => {
    set({ isGroupsLoading: true });
    try {
      const res = await axiosInstance.get("/messages/groups");
      set({ groups: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load groups");
    } finally {
      set({ isGroupsLoading: false });
    }
  },

  getFriendData: async () => {
    set({ isFriendDataLoading: true });
    try {
      const [requestsRes, suggestionsRes] = await Promise.all([
        axiosInstance.get("/messages/friends/requests"),
        axiosInstance.get("/messages/friends/suggestions"),
      ]);
      set({
        friendRequests: requestsRes.data,
        friendSuggestions: suggestionsRes.data,
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load friend requests");
    } finally {
      set({ isFriendDataLoading: false });
    }
  },

  sendFriendRequest: async (userId) => {
    try {
      await axiosInstance.post(`/messages/friends/requests/${userId}`);
      toast.success("Friend request sent");
      await get().getFriendData();
      await get().getUsers();
    } catch (error) {
      toast.error(error.response?.data?.error || error.response?.data?.message || "Failed to send friend request");
    }
  },

  acceptFriendRequest: async (userId) => {
    try {
      await axiosInstance.patch(`/messages/friends/requests/${userId}/accept`);
      toast.success("Friend request accepted");
      await get().getFriendData();
      await get().getUsers();
    } catch (error) {
      toast.error(error.response?.data?.error || error.response?.data?.message || "Failed to accept friend request");
    }
  },

  rejectFriendRequest: async (userId) => {
    try {
      await axiosInstance.delete(`/messages/friends/requests/${userId}`);
      await get().getFriendData();
    } catch (error) {
      toast.error(error.response?.data?.error || error.response?.data?.message || "Failed to reject friend request");
    }
  },

  createGroup: async ({ name, details, groupPic, memberIds }) => {
    try {
      const res = await axiosInstance.post("/messages/groups", {
        name,
        details,
        groupPic,
        memberIds,
      });
      set((state) => ({ groups: [res.data, ...state.groups] }));
      toast.success("Group created");
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.error || error.response?.data?.message || "Failed to create group");
      return null;
    }
  },

  setGroupDraft: (updates) =>
    set((state) => ({
      groupDraft: { ...state.groupDraft, ...updates },
    })),

  toggleGroupDraftMember: (userId) =>
    set((state) => ({
      groupDraft: {
        ...state.groupDraft,
        memberIds: state.groupDraft.memberIds.includes(userId)
          ? state.groupDraft.memberIds.filter((id) => id !== userId)
          : [...state.groupDraft.memberIds, userId],
      },
    })),

  resetGroupDraft: () =>
    set({
      groupDraft: {
        name: "",
        details: "",
        groupPic: null,
        memberIds: [],
        isSelectingMembers: false,
      },
    }),

  updateGroupProfile: async (groupId, profileData) => {
    try {
      const res = await axiosInstance.put(`/messages/groups/${groupId}/profile`, profileData);
      set((state) => updateGroupInState(state, res.data));
      toast.success("Group profile updated");
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.error || error.response?.data?.message || "Failed to update group");
      return null;
    }
  },

  deleteGroup: async (groupId) => {
    try {
      await axiosInstance.delete(`/messages/groups/${groupId}`);
      set((state) => removeGroupFromState(state, groupId));
      toast.success("Group deleted");
      return true;
    } catch (error) {
      toast.error(error.response?.data?.error || error.response?.data?.message || "Failed to delete group");
      return false;
    }
  },

  leaveGroup: async (groupId) => {
    try {
      await axiosInstance.patch(`/messages/groups/${groupId}/leave`);
      set((state) => removeGroupFromState(state, groupId));
      toast.success("You left the group");
      return true;
    } catch (error) {
      toast.error(error.response?.data?.error || error.response?.data?.message || "Failed to leave group");
      return false;
    }
  },

  removeGroupMember: async (groupId, memberId) => {
    try {
      const res = await axiosInstance.delete(`/messages/groups/${groupId}/members/${memberId}`);
      set((state) => updateGroupInState(state, res.data));
      toast.success("Member removed");
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.error || error.response?.data?.message || "Failed to remove member");
      return null;
    }
  },

  updateGroupMemberRole: async (groupId, memberId, role) => {
    try {
      const res = await axiosInstance.patch(`/messages/groups/${groupId}/members/${memberId}/role`, { role });
      set((state) => updateGroupInState(state, res.data));
      toast.success(role === "admin" ? "Admin added" : "Admin removed");
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.error || error.response?.data?.message || "Failed to update role");
      return null;
    }
  },

  getMessages: async (userId) => {
    if (get().selectedUser?.isAiAssistant) {
      set({ isMessagesLoading: true });
      try {
        const res = await axiosInstance.get("/messages/ai/assistant");
        const nextMessages = [AI_WELCOME_MESSAGE, ...(res.data || [])];
        set({
          aiMessages: nextMessages,
          messages: nextMessages,
          suggestions: [],
          replyingTo: null,
          editingMessage: null,
        });
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to load Convo AI chat");
        set({ messages: get().aiMessages, suggestions: [], replyingTo: null, editingMessage: null });
      } finally {
        set({ isMessagesLoading: false });
      }
      return;
    }

    set({ isMessagesLoading: true });
    try {
      const { selectedUser } = get();
      const endpoint = selectedUser?.isGroup
        ? `/messages/groups/${userId}`
        : `/messages/${userId}`;
      const res = await axiosInstance.get(endpoint);
      set({ messages: res.data, suggestions: [], replyingTo: null, editingMessage: null });
      if (selectedUser?.isGroup) {
        set((state) => ({
          groups: state.groups.map((group) =>
            group._id === userId && group.unreadCount
              ? { ...group, unreadCount: 0 }
              : group
          ),
        }));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  getStarredMessages: async () => {
    const requestId = ++starredMessagesRequestId;
    set({ isStarredMessagesLoading: true });
    try {
      const res = await axiosInstance.get("/messages/starred");
      if (requestId === starredMessagesRequestId) {
        set({ starredMessages: res.data });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load starred messages");
    } finally {
      if (requestId === starredMessagesRequestId) {
        set({ isStarredMessagesLoading: false });
      }
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    if (selectedUser?.isAiAssistant) {
      return get().sendAiAssistantMessage(messageData.text);
    }

    try {
      const endpoint = selectedUser?.isGroup
        ? `/messages/send/group/${selectedUser._id}`
        : `/messages/send/${selectedUser._id}`;
      const res = await axiosInstance.post(endpoint, messageData);
      set({ messages: [...messages, res.data], suggestions: [], replyingTo: null });
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.error || error.response?.data?.message || "Failed to send message");
      return null;
    }
  },

  forwardMessage: async (messageId, targets) => {
    try {
      const res = await axiosInstance.post(`/messages/${messageId}/forward`, { targets });
      const forwardedMessages = res.data.messages || [];

      set((state) => {
        const selectedUser = state.selectedUser;
        const messagesToAppend = forwardedMessages
          .filter(({ target }) => {
            if (!selectedUser || selectedUser.isAiAssistant) return false;
            return selectedUser.isGroup
              ? target.type === "group" && target.id === selectedUser._id
              : target.type === "direct" && target.id === selectedUser._id;
          })
          .map(({ message }) => message);

        return {
          messages: messagesToAppend.length
            ? [...state.messages, ...messagesToAppend]
            : state.messages,
          groups: state.groups.map((group) => {
            const forwardedGroup = forwardedMessages.find(
              ({ target }) => target.type === "group" && target.id === group._id
            );
            return forwardedGroup
              ? { ...group, lastMessageTime: forwardedGroup.message.createdAt }
              : group;
          }),
          suggestions: [],
          replyingTo: null,
        };
      });

      toast.success(
        forwardedMessages.length === 1
          ? "Message forwarded"
          : `Message forwarded to ${forwardedMessages.length} chats`
      );
      return forwardedMessages;
    } catch (error) {
      toast.error(error.response?.data?.error || error.response?.data?.message || "Failed to forward message");
      return null;
    }
  },

  sendAiAssistantMessage: async (text) => {
    const cleanText = String(text || "").trim();
    if (!cleanText) return null;

    const previousAiMessages = get().aiMessages;
    const tempMessageId = `ai-user-${Date.now()}`;
    const userMessage = {
      _id: tempMessageId,
      senderId: useAuthStore.getState().authUser?._id,
      text: cleanText,
      createdAt: new Date().toISOString(),
    };

    set((state) => {
      const nextMessages = [...state.aiMessages, userMessage];
      return {
        aiMessages: nextMessages,
        messages: state.selectedUser?.isAiAssistant ? nextMessages : state.messages,
        isAiAssistantResponding: true,
        suggestions: [],
        replyingTo: null,
      };
    });

    try {
      const history = previousAiMessages
        .filter((message) => message._id !== "ai-welcome")
        .slice(-10)
        .map((message) => ({
          role: message.senderId === AI_ASSISTANT_ID ? "assistant" : "user",
          text: message.text,
        }));

      const res = await axiosInstance.post("/messages/ai/assistant", {
        message: cleanText,
        history,
      });

      const savedUserMessage = res.data.userMessage || userMessage;
      const assistantMessage =
        res.data.assistantMessage || {
          _id: `ai-assistant-${Date.now()}`,
          senderId: AI_ASSISTANT_ID,
          text: res.data.reply,
          createdAt: new Date().toISOString(),
        };

      set((state) => {
        const nextMessages = [
          ...state.aiMessages.map((message) =>
            message._id === tempMessageId ? savedUserMessage : message
          ),
          assistantMessage,
        ];
        return {
          aiMessages: nextMessages,
          messages: state.selectedUser?.isAiAssistant ? nextMessages : state.messages,
          isAiAssistantResponding: false,
        };
      });

      return userMessage;
    } catch (error) {
      toast.error(error.response?.data?.error || error.response?.data?.message || "Failed to reach Convo AI");
      set((state) => {
        const nextMessages = state.aiMessages.filter((message) => message._id !== tempMessageId);
        return {
          aiMessages: nextMessages,
          messages: state.selectedUser?.isAiAssistant ? nextMessages : state.messages,
          isAiAssistantResponding: false,
        };
      });
      return null;
    }
  },

  editMessage: async (messageId, text) => {
    try {
      const res = await axiosInstance.patch(`/messages/${messageId}`, { text });
      set((state) => ({
        messages: applyMessageUpdate(state.messages, res.data),
        starredMessages: applyMessageUpdate(state.starredMessages, res.data),
        editingMessage: null,
        suggestions: [],
      }));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to edit message");
    }
  },

  deleteMessage: async (messageId) => {
    try {
      const res = await axiosInstance.delete(`/messages/${messageId}`);
      set((state) => ({
        messages: applyMessageUpdate(state.messages, res.data),
        starredMessages: state.starredMessages.filter((message) => message._id !== messageId),
        replyingTo: state.replyingTo?._id === messageId ? null : state.replyingTo,
        editingMessage: state.editingMessage?._id === messageId ? null : state.editingMessage,
      }));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete message");
    }
  },

  deleteMessageForMe: async (messageId) => {
    try {
      await axiosInstance.delete(`/messages/${messageId}/me`);
      set((state) => ({
        messages: state.messages.filter((message) => message._id !== messageId),
        starredMessages: state.starredMessages.filter((message) => message._id !== messageId),
        replyingTo: state.replyingTo?._id === messageId ? null : state.replyingTo,
        editingMessage: state.editingMessage?._id === messageId ? null : state.editingMessage,
      }));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete message");
    }
  },

  togglePinMessage: async (messageId) => {
    try {
      const res = await axiosInstance.patch(`/messages/${messageId}/pin`);
      set((state) => ({
        messages: applyMessageUpdate(state.messages, res.data),
      }));
    } catch (error) {
      toast.error(error.response?.data?.error || error.response?.data?.message || "Failed to update pinned message");
    }
  },

  toggleStarMessage: async (messageId) => {
    try {
      const res = await axiosInstance.patch(`/messages/${messageId}/star`);
      const updatedMessage = res.data.message;

      set((state) => ({
        messages: applyMessageUpdate(state.messages, updatedMessage),
        starredMessages: res.data.isStarred
          ? [
              updatedMessage,
              ...state.starredMessages.filter((message) => message._id !== messageId),
            ]
          : state.starredMessages.filter((message) => message._id !== messageId),
      }));

      await get().getStarredMessages();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update starred message");
    }
  },

  toggleFavoriteChat: async (userId) => {
    try {
      const res = await axiosInstance.patch(`/messages/users/${userId}/favorite`);
      set((state) => ({
        users: state.users
          .map((user) =>
            user._id === userId
              ? { ...user, isFavorite: res.data.isFavorite }
              : user
          )
          .sort((a, b) => {
            if (a.isSelf) return -1;
            if (b.isSelf) return 1;
            if (a.isFavorite && !b.isFavorite) return -1;
            if (!a.isFavorite && b.isFavorite) return 1;
            return new Date(b.lastMessageTime) - new Date(a.lastMessageTime);
          }),
        selectedUser:
          state.selectedUser?._id === userId
            ? { ...state.selectedUser, isFavorite: res.data.isFavorite }
            : state.selectedUser,
      }));
    } catch (error) {
      toast.error(error.response?.data?.error || error.response?.data?.message || "Failed to update favorite chat");
    }
  },

  toggleBlockUser: async (userId) => {
    try {
      const res = await axiosInstance.patch(`/messages/users/${userId}/block`);
      set((state) => ({
        users: state.users.map((user) =>
          user._id === userId
            ? {
                ...user,
                blockedByMe: res.data.blockedByMe,
                isFavorite: res.data.isFavorite,
                unreadCount: res.data.blockedByMe ? 0 : user.unreadCount,
              }
            : user
        ),
        selectedUser:
          state.selectedUser?._id === userId
            ? {
                ...state.selectedUser,
                blockedByMe: res.data.blockedByMe,
                isFavorite: res.data.isFavorite,
              }
            : state.selectedUser,
      }));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update blocked user");
    }
  },

  getReplySuggestions: async () => {
    const { selectedUser } = get();
    if (!selectedUser || selectedUser.isGroup) return;

    set({ isSuggestionsLoading: true });
    try {
      const res = await axiosInstance.post(`/messages/ai/suggestions/${selectedUser._id}`);
      set({ suggestions: res.data.suggestions || [] });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to generate suggestions");
    } finally {
      set({ isSuggestionsLoading: false });
    }
  },

  searchMessages: async ({ query, scope = "current" }) => {
    const cleanQuery = String(query || "").trim();
    const { selectedUser } = get();

    if (!cleanQuery) {
      set({ messageSearchResults: [] });
      return [];
    }

    if (scope === "current" && (!selectedUser || selectedUser.isAiAssistant)) {
      set({ messageSearchResults: [] });
      return [];
    }

    set({ isMessageSearchLoading: true });
    try {
      const endpoint =
        scope === "all"
          ? "/messages/search/all"
          : selectedUser.isGroup
            ? `/messages/groups/${selectedUser._id}/search`
            : `/messages/${selectedUser._id}/search`;
      const res = await axiosInstance.get(endpoint, {
        params: { q: cleanQuery },
      });
      const results = res.data || [];
      set({ messageSearchResults: results });
      return results;
    } catch (error) {
      toast.error(error.response?.data?.error || error.response?.data?.message || "Failed to search messages");
      set({ messageSearchResults: [] });
      return [];
    } finally {
      set({ isMessageSearchLoading: false });
    }
  },

  clearMessageSearch: () => set({ messageSearchResults: [] }),

  openSearchResult: (result) => {
    if (!result?.messageId || !result?.chat) return;

    set((state) => {
      const chat = result.chat;
      const isSameChat =
        state.selectedUser?._id === chat._id ||
        state.selectedUser?._id === chat._id?.toString?.();
      const selectedUser = isSameChat
        ? state.selectedUser
        : chat.type === "group"
          ? { ...(chat.group || {}), _id: chat._id, name: chat.name, groupPic: chat.groupPic, isGroup: true }
          : {
              ...(chat.user || {}),
              _id: chat._id,
              fullName: chat.user?.fullName || chat.name,
              profilePic: chat.profilePic,
            };

      return {
        selectedUser,
        activeSidebarTab: chat.type === "group" ? "groups" : "friends",
        scrollTargetMessageId: result.messageId,
        suggestions: [],
        replyingTo: null,
        editingMessage: null,
        users: chat.type === "direct"
          ? state.users.map((user) =>
              user._id === chat._id ? { ...user, unreadCount: 0 } : user
            )
          : state.users,
        groups: chat.type === "group"
          ? state.groups.map((group) =>
              group._id === chat._id ? { ...group, unreadCount: 0 } : group
            )
          : state.groups,
      };
    });
  },

  clearReplySuggestions: () => set({ suggestions: [] }),

  setActiveSidebarTab: (activeSidebarTab) => set({ activeSidebarTab }),

  setSidebarSearchQuery: (sidebarSearchQuery) => set({ sidebarSearchQuery }),

  setScrollTargetMessageId: (messageId) => set({ scrollTargetMessageId: messageId }),

  clearScrollTargetMessageId: () => set({ scrollTargetMessageId: null }),

  openChatAtMessage: (selectedUser, messageId) => {
    set((state) => {
      if (!selectedUser) return {};

      return {
        selectedUser,
        scrollTargetMessageId: messageId,
        suggestions: [],
        replyingTo: null,
        editingMessage: null,
        users: state.users.map((user) =>
          user._id === selectedUser._id
            ? { ...user, unreadCount: 0 }
            : user
        ),
        groups: selectedUser.isGroup
          ? state.groups.map((group) =>
              group._id === selectedUser._id ? { ...group, unreadCount: 0 } : group
            )
          : state.groups,
      };
    });
  },

  setReplyingTo: (replyingTo) =>
    set({ replyingTo, editingMessage: null, suggestions: [] }),

  clearReplyingTo: () => set({ replyingTo: null }),

  setEditingMessage: (editingMessage) =>
    set({ editingMessage, replyingTo: null, suggestions: [] }),

  clearEditingMessage: () => set({ editingMessage: null }),

  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;

    socket.on("newMessage", (newMessage) => {
      const { selectedUser, messages, users } = get();

      const senderId = getMessageSenderId(newMessage);

      if (senderId === selectedUser?._id) {
        set({
          messages: [...messages, newMessage],
          suggestions: [],
        });
      } else {
        set({
          users: users.map((user) =>
            user._id === senderId
              ? { ...user, unreadCount: (user.unreadCount || 0) + 1 }
              : user
          ),
        });
      }
    });

    socket.on("newGroupMessage", ({ groupId, message }) => {
      const { selectedUser, messages, groups } = get();
      const isCurrentGroup = selectedUser?.isGroup && selectedUser._id === groupId;

      if (isCurrentGroup) {
        const authUserId = useAuthStore.getState().authUser?._id;
        const visibleMessage = authUserId
          ? {
              ...message,
              readBy: [
                ...(message.readBy || []).filter((readerId) => readerId !== authUserId),
                authUserId,
              ],
            }
          : message;
        set({
          messages: [...messages, visibleMessage],
          suggestions: [],
        });
      }

      set({
        groups: groups.map((group) =>
          group._id === groupId
            ? {
                ...group,
                lastMessageTime: message.createdAt,
                unreadCount: isCurrentGroup ? 0 : Math.min((group.unreadCount || 0) + 1, 99),
              }
            : group
        ),
      });
    });

    socket.on("messages_read", ({ messageIds }) => {
      const { messages } = get();
      const updatedMessages = messages.map((msg) =>
        messageIds.includes(msg._id) ? { ...msg, status: "read" } : msg
      );

      set({ messages: updatedMessages });
    });

    socket.on("messageUpdated", (updatedMessage) => {
      const { messages } = get();
      set({
        messages: applyMessageUpdate(messages, updatedMessage),
      });
    });

    socket.on("messageDeleted", (deletedMessage) => {
      const { messages, replyingTo, editingMessage, starredMessages } = get();
      set({
        messages: applyMessageUpdate(messages, deletedMessage),
        starredMessages: starredMessages.filter((message) => message._id !== deletedMessage._id),
        replyingTo: replyingTo?._id === deletedMessage._id ? null : replyingTo,
        editingMessage: editingMessage?._id === deletedMessage._id ? null : editingMessage,
      });
    });

    socket.on("groupDeleted", ({ groupId }) => {
      set((state) => removeGroupFromState(state, groupId));
    });

    socket.on("groupRemoved", ({ groupId }) => {
      set((state) => removeGroupFromState(state, groupId));
    });

    socket.on("groupUpdated", (updatedGroup) => {
      set((state) => updateGroupInState(state, updatedGroup));
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
    socket.off("newGroupMessage");
    socket.off("messages_read");
    socket.off("messageUpdated");
    socket.off("messageDeleted");
    socket.off("groupDeleted");
    socket.off("groupRemoved");
    socket.off("groupUpdated");
  },

  setSelectedUser: (selectedUser) => {
    set((state) => {
      if (!selectedUser) {
        return {
          selectedUser: null,
          messageSearchResults: [],
          suggestions: [],
          replyingTo: null,
          editingMessage: null,
        };
      }

      return {
        selectedUser,
        activeSidebarTab: selectedUser.isGroup ? "groups" : "friends",
        messageSearchResults: [],
        suggestions: [],
        replyingTo: null,
        editingMessage: null,
        users: state.users.map((user) =>
          user._id === selectedUser._id
            ? { ...user, unreadCount: 0 }
            : user
        ),
        groups: selectedUser.isGroup
          ? state.groups.map((group) =>
              group._id === selectedUser._id ? { ...group, unreadCount: 0 } : group
            )
          : state.groups,
      };
    });
  },
}));
