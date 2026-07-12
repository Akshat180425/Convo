import { useEffect, useMemo, useState } from "react";
import { CircleHelp, Keyboard, Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AI_ASSISTANT_USER, useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";

const isEditableTarget = (target) =>
  target instanceof HTMLElement &&
  ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);

const shortcutGroups = [
  {
    title: "General",
    shortcuts: [
      { keys: ["Ctrl", "/"], action: "Open shortcuts" },
      { keys: ["/"], action: "Focus sidebar search" },
      { keys: ["Esc"], action: "Close this panel or clear reply/edit mode" },
      { keys: ["Ctrl", "Enter"], action: "Send message from the typing box" },
    ],
  },
  {
    title: "Navigate",
    shortcuts: [
      { keys: ["Ctrl", "Alt", "F"], action: "Friends tab" },
      { keys: ["Ctrl", "Alt", "G"], action: "Groups tab" },
      { keys: ["Ctrl", "Alt", "R"], action: "Requests tab" },
      { keys: ["Ctrl", "Alt", "N"], action: "Add people tab" },
      { keys: ["Ctrl", "Alt", "S"], action: "Home / starred messages" },
      { keys: ["Ctrl", "Alt", "T"], action: "Settings" },
      { keys: ["Alt", "Up / Down"], action: "Move through current chat list" },
    ],
  },
  {
    title: "Current Chat",
    shortcuts: [
      { keys: ["Ctrl", "Alt", "A"], action: "Open Convo AI" },
      { keys: ["Ctrl", "Alt", "M"], action: "Open media collection" },
      { keys: ["Ctrl", "Alt", "P"], action: "Open current profile" },
      { keys: ["Ctrl", "Alt", "B"], action: "Block or unblock current user" },
    ],
  },
];

const ShortcutKeys = ({ keys }) => (
  <span className="flex min-w-0 max-w-full shrink-0 flex-wrap justify-end gap-1">
    {keys.map((key) => (
      <kbd key={key} className="kbd kbd-sm shrink-0">
        {key}
      </kbd>
    ))}
  </span>
);

const KeyboardShortcuts = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { authUser } = useAuthStore();
  const {
    activeSidebarTab,
    clearEditingMessage,
    clearReplyingTo,
    editingMessage,
    groups,
    replyingTo,
    selectedUser,
    setActiveSidebarTab,
    setSelectedUser,
    toggleBlockUser,
    users,
  } = useChatStore();

  const activeTabLabel = activeSidebarTab
    ? activeSidebarTab.charAt(0).toUpperCase() + activeSidebarTab.slice(1)
    : "";

  const currentProfilePath = useMemo(() => {
    if (!selectedUser) return null;
    if (selectedUser.isAiAssistant) return null;
    if (selectedUser.isGroup) return `/group/${selectedUser._id}`;
    if (selectedUser._id === authUser?._id) return "/profile";
    return `/profile/${selectedUser._id}`;
  }, [authUser?._id, selectedUser]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      const isCtrlSlash = e.ctrlKey && key === "/";

      if (isCtrlSlash) {
        e.preventDefault();
        setIsOpen((value) => !value);
        return;
      }

      if (e.key === "Escape") {
        if (isOpen) {
          e.preventDefault();
          setIsOpen(false);
          return;
        }

        if (editingMessage || replyingTo) {
          e.preventDefault();
          clearEditingMessage();
          clearReplyingTo();
        }
        return;
      }

      if (isEditableTarget(e.target)) return;

      if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("convo:focus-sidebar-search"));
        return;
      }

      if (e.altKey && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
        const selfUser = users.find((user) => user._id === authUser?._id);
        const friendUsers = users.filter((user) => user._id !== authUser?._id);
        const currentList =
          activeSidebarTab === "groups"
            ? groups
            : activeSidebarTab === "friends"
              ? [selfUser, AI_ASSISTANT_USER, ...friendUsers].filter(Boolean)
              : [];

        if (!currentList.length) return;

        e.preventDefault();

        const currentIndex = currentList.findIndex((item) => item._id === selectedUser?._id);
        const direction = e.key === "ArrowDown" ? 1 : -1;
        const nextIndex =
          currentIndex === -1
            ? direction === 1
              ? 0
              : currentList.length - 1
            : (currentIndex + direction + currentList.length) % currentList.length;

        setSelectedUser(currentList[nextIndex]);
        return;
      }

      if (!e.ctrlKey || !e.altKey) return;

      if (key === "a") {
        e.preventDefault();
        setActiveSidebarTab("friends");
        setSelectedUser(AI_ASSISTANT_USER);
      } else if (key === "f") {
        e.preventDefault();
        setActiveSidebarTab("friends");
      } else if (key === "g") {
        e.preventDefault();
        setActiveSidebarTab("groups");
      } else if (key === "r") {
        e.preventDefault();
        setActiveSidebarTab("requests");
      } else if (key === "n") {
        e.preventDefault();
        setActiveSidebarTab("add");
      } else if (key === "s") {
        e.preventDefault();
        setSelectedUser(null);
      } else if (key === "t") {
        e.preventDefault();
        navigate("/settings");
      } else if (key === "m" && selectedUser && !selectedUser.isAiAssistant) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("convo:open-media-collection"));
      } else if (key === "p" && currentProfilePath) {
        e.preventDefault();
        navigate(currentProfilePath);
      } else if (
        key === "b" &&
        selectedUser &&
        !selectedUser.isAiAssistant &&
        !selectedUser.isGroup &&
        selectedUser._id !== authUser?._id
      ) {
        e.preventDefault();
        toggleBlockUser(selectedUser._id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    activeSidebarTab,
    authUser?._id,
    clearEditingMessage,
    clearReplyingTo,
    currentProfilePath,
    editingMessage,
    groups,
    isOpen,
    navigate,
    replyingTo,
    selectedUser,
    setActiveSidebarTab,
    setSelectedUser,
    toggleBlockUser,
    users,
  ]);

  if (!authUser) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-5 right-5 z-40 btn btn-primary btn-circle shadow-lg"
        aria-label="Keyboard shortcuts"
        title="Keyboard shortcuts"
      >
        <Keyboard className="size-5" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="max-h-[85vh] w-full max-w-5xl overflow-hidden rounded-lg bg-base-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-base-300 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Keyboard className="size-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Keyboard Shortcuts</h2>
                  <p className="text-sm text-base-content/60">
                    Active tab: {activeTabLabel}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="btn btn-ghost btn-sm btn-circle"
                aria-label="Close shortcuts"
                title="Close"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="max-h-[calc(85vh-5rem)] overflow-y-auto px-5 py-4">
              <div className="mb-4 grid gap-2 text-sm text-base-content/70 sm:grid-cols-2">
                <div className="flex items-center gap-2 rounded-md bg-base-200 px-3 py-2">
                  <Search className="size-4" />
                  <span>Use / for quick search.</span>
                </div>
                <div className="flex items-center gap-2 rounded-md bg-base-200 px-3 py-2">
                  <CircleHelp className="size-4" />
                  <span>Use Ctrl + / to reopen this panel.</span>
                </div>
              </div>

              <div className="space-y-4">
                {shortcutGroups.map((group) => (
                  <section
                    key={group.title}
                    className="rounded-lg border border-base-300 bg-base-100 p-3"
                  >
                    <h3 className="mb-2 text-sm font-semibold">{group.title}</h3>
                    <div className="grid gap-2 lg:grid-cols-2">
                      {group.shortcuts.map((shortcut) => (
                        <div
                          key={`${group.title}-${shortcut.action}`}
                          className="grid min-h-12 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md bg-base-200/70 px-3 py-2"
                        >
                          <span className="min-w-0 text-sm leading-snug text-base-content/75">
                            {shortcut.action}
                          </span>
                          <ShortcutKeys keys={shortcut.keys} />
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default KeyboardShortcuts;
