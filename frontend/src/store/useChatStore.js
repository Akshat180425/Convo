import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isMessagesLoading: false });
    }
  },
  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      set({ messages: [...messages, res.data] });
    } catch (error) {
      toast.error(error.response.data.message);
    }
  },

  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;

    socket.on("newMessage", (newMessage) => {
      const { selectedUser, messages, users } = get();

      if (newMessage.senderId === selectedUser?._id) {
        set({
          messages: [...messages, newMessage],
        });
      } else {
        set({
          users: users.map((user) =>
            user._id === newMessage.senderId
              ? { ...user, unreadCount: (user.unreadCount || 0) + 1 }
              : user
          ),
        });
      }
    });

    socket.on("messages_read", ({ messageIds }) => {
      const { messages } = get();
      const updatedMessages = messages.map((msg) =>
        messageIds.includes(msg._id) ? { ...msg, status: "read" } : msg
      );

      set({ messages: updatedMessages });
    });
},

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
    socket.off("messages_read");
  },

  setSelectedUser: (selectedUser) => {
    set((state) => {
      if (!selectedUser) {
        return { selectedUser: null };
      }

      return {
        selectedUser,
        users: state.users.map((user) =>
          user._id === selectedUser._id
            ? { ...user, unreadCount: 0 }
            : user
        ),
      };
    });
  },
}));
