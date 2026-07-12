import { useEffect, useRef, useState } from "react";
import { Ban, Bot, ChevronDown, ChevronUp, FileText, Film, Flag, Images, Link as LinkIcon, Mic, Search, ShieldOff, Users, X } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { Link } from "react-router-dom";
import UserAvatar from "./UserAvatar";
import ReportModal from "./ReportModal";
import { formatFileSize, formatLastSeen, formatMessageTime, getMessageFileDownloadUrl } from "../lib/utils";

const linkPattern = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

const cleanLink = (value) => value.replace(/[),.!?;:]+$/g, "");

const ChatHeader = () => {
  const {
    clearMessageSearch,
    isMessageSearchLoading,
    messageSearchResults,
    messages,
    openSearchResult,
    searchMessages,
    selectedUser,
    setSelectedUser,
    toggleBlockUser,
  } = useChatStore();
  const { authUser, lastSeenByUser, onlineUsers } = useAuthStore();
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchScope, setSearchScope] = useState("current");
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);
  const [selectedMediaSrc, setSelectedMediaSrc] = useState(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [activeMediaSection, setActiveMediaSection] = useState("photos");
  const searchInputRef = useRef(null);
  const isGroup = selectedUser.isGroup;
  const isAiAssistant = Boolean(selectedUser.isAiAssistant);
  const isSelf = !isGroup && selectedUser._id === authUser?._id;
  const profilePath = isGroup
    ? `/group/${selectedUser._id}`
    : isSelf
      ? "/profile"
      : `/profile/${selectedUser._id}`;
  const canShowOnline = !isGroup && selectedUser.canViewOnlineStatus !== false;
  const canShowLastSeen = !isGroup && selectedUser.canViewLastSeen !== false;
  const isOnline = !isGroup && canShowOnline && onlineUsers.includes(selectedUser._id);
  const getPresenceText = () => {
    if (isAiAssistant) return selectedUser.status;
    if (isGroup) return `${selectedUser.members?.length || 0} members`;
    if (isSelf) return "Message yourself";
    if (selectedUser.blockedByMe) return "Blocked";
    if (selectedUser.hasBlockedMe) return "Unavailable";
    if (isOnline) return "Online";
    if (!canShowOnline && !canShowLastSeen) return "Status hidden";
    if (!canShowLastSeen) return "Last seen hidden";
    return formatLastSeen(lastSeenByUser[selectedUser._id] || selectedUser.lastSeen);
  };
  const photos = messages.filter((message) => message.image && !message.isDeleted);
  const videos = messages.filter((message) => message.video && !message.isDeleted);
  const audios = messages.filter((message) => message.audio && !message.isDeleted);
  const files = messages
    .filter((message) => (message.file?.url || message.fileUrl) && !message.isDeleted)
    .map((message) => ({
      id: message._id,
      name: message.file?.name || message.fileName || "Shared file",
      url: message.file?.url || message.fileUrl,
      downloadUrl: message.file?.downloadUrl || "",
      size: message.file?.size || 0,
      type: message.file?.type || "",
    }));
  const links = messages
    .filter((message) => message.text && !message.isDeleted)
    .flatMap((message) => {
      const matches = message.text.match(linkPattern) || [];
      return matches.map((match, index) => {
        const url = cleanLink(match);
        return {
          id: `${message._id}-${index}`,
          label: url,
          url: url.startsWith("http") ? url : `https://${url}`,
        };
      });
    });
  const mediaSections = [
    { id: "photos", label: "Photos", icon: Images, count: photos.length },
    { id: "videos", label: "Videos", icon: Film, count: videos.length },
    { id: "audios", label: "Audios", icon: Mic, count: audios.length },
    { id: "files", label: "Files", icon: FileText, count: files.length },
    { id: "links", label: "Links", icon: LinkIcon, count: links.length },
  ];

  useEffect(() => {
    const openMediaCollection = () => {
      if (isAiAssistant) return;
      setSelectedMediaSrc(null);
      setActiveMediaSection("photos");
      setIsMediaModalOpen(true);
    };

    window.addEventListener("convo:open-media-collection", openMediaCollection);
    return () => window.removeEventListener("convo:open-media-collection", openMediaCollection);
  }, [isAiAssistant]);

  useEffect(() => {
    if (!isSearchOpen) return;

    const focusTimeout = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);

    return () => window.clearTimeout(focusTimeout);
  }, [isSearchOpen]);

  useEffect(() => {
    if (!isSearchOpen) return;

    const cleanQuery = searchQuery.trim();
    setActiveSearchIndex(0);

    if (!cleanQuery) {
      clearMessageSearch();
      return;
    }

    const timeoutId = window.setTimeout(() => {
      searchMessages({ query: cleanQuery, scope: searchScope });
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [clearMessageSearch, isSearchOpen, searchMessages, searchQuery, searchScope]);

  useEffect(() => {
    if (isSearchOpen && searchScope === "all") return;

    setSearchQuery("");
    setActiveSearchIndex(0);
    clearMessageSearch();
  }, [clearMessageSearch, isSearchOpen, searchScope, selectedUser._id]);

  const closeSearch = () => {
    setIsSearchOpen(false);
    setSearchQuery("");
    setActiveSearchIndex(0);
    clearMessageSearch();
  };

  const openResultAt = (index) => {
    const result = messageSearchResults[index];
    if (!result) return;
    setActiveSearchIndex(index);
    openSearchResult(result);
  };

  const moveSearchResult = (direction) => {
    if (!messageSearchResults.length) return;
    const nextIndex =
      (activeSearchIndex + direction + messageSearchResults.length) %
      messageSearchResults.length;
    openResultAt(nextIndex);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      closeSearch();
    } else if (e.key === "Enter" && messageSearchResults.length) {
      e.preventDefault();
      openResultAt(activeSearchIndex);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      moveSearchResult(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      moveSearchResult(-1);
    }
  };

  return (
    <div className="p-2.5 border-b border-base-300">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {isAiAssistant ? (
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Bot className="size-5" />
            </div>
          ) : isGroup ? (
            <Link to={profilePath} className="shrink-0">
              {selectedUser.groupPic ? (
                <img
                  src={selectedUser.groupPic}
                  alt={selectedUser.name}
                  className="size-10 rounded-full object-cover"
                />
              ) : (
                <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                  <Users className="size-5 text-primary" />
                </div>
              )}
            </Link>
          ) : (
          <Link to={profilePath} className="avatar">
            <div className="size-10 rounded-full relative">
              <UserAvatar name={selectedUser.fullName} profilePic={selectedUser.profilePic} size="40px" />
            </div>
          </Link>
          )}

          <div className="min-w-0">
            <h3 className="truncate font-medium">
              {isGroup ? (
                <Link to={profilePath} className="hover:underline">
                  {selectedUser.name}
                </Link>
              ) : isAiAssistant ? (
                selectedUser.fullName
              ) : isSelf ? (
                `${selectedUser.fullName} (You)`
              ) : (
                selectedUser.fullName
              )}
            </h3>
            <p className="text-sm text-base-content/70">
              {getPresenceText()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {!isAiAssistant && (
            <div
              className="tooltip tooltip-bottom flex size-8 items-center justify-center"
              data-tip="Search messages"
            >
              <button
                type="button"
                onClick={() => setIsSearchOpen((value) => !value)}
                className={`btn btn-ghost btn-sm btn-circle flex items-center justify-center ${
                  isSearchOpen ? "text-primary" : ""
                }`}
                aria-label="Search messages"
                title="Search messages"
              >
                <Search className="size-4" />
              </button>
            </div>
          )}

          {!isAiAssistant && (
            <div
              className="tooltip tooltip-bottom flex size-8 items-center justify-center"
              data-tip="Media shared in chat"
            >
              <button
                type="button"
                onClick={() => {
                  setSelectedMediaSrc(null);
                  setActiveMediaSection("photos");
                  setIsMediaModalOpen(true);
                }}
                className="btn btn-ghost btn-sm btn-circle flex items-center justify-center"
                aria-label="Media shared in chat"
                title="Media shared in chat"
              >
                <Images className="size-4" />
              </button>
            </div>
          )}

          {!isSelf && !isGroup && !isAiAssistant && (
            <div
              className="tooltip tooltip-bottom flex size-8 items-center justify-center"
              data-tip="Report user"
            >
              <button
                type="button"
                onClick={() => setIsReportModalOpen(true)}
                className="btn btn-ghost btn-sm btn-circle flex items-center justify-center text-error"
                aria-label="Report user"
                title="Report user"
              >
                <Flag className="size-4" />
              </button>
            </div>
          )}

          {!isSelf && !isGroup && !isAiAssistant && (
            <div
              className="tooltip tooltip-bottom flex size-8 items-center justify-center"
              data-tip={selectedUser.blockedByMe ? "Unblock user" : "Block user"}
            >
              <button
                type="button"
                onClick={() => toggleBlockUser(selectedUser._id)}
                className={`btn btn-ghost btn-sm btn-circle flex items-center justify-center ${
                  selectedUser.blockedByMe ? "text-success" : "text-error"
                }`}
                aria-label={selectedUser.blockedByMe ? "Unblock user" : "Block user"}
                title={selectedUser.blockedByMe ? "Unblock user" : "Block user"}
              >
                {selectedUser.blockedByMe ? (
                  <ShieldOff className="size-4" />
                ) : (
                  <Ban className="size-4" />
                )}
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setSelectedUser(null)}
            className="btn btn-ghost btn-sm btn-circle"
            aria-label="Close chat"
            title="Close chat"
          >
            <X />
          </button>
        </div>
      </div>

      {isSearchOpen && !isAiAssistant && (
        <div className="mt-2 rounded-lg border border-base-300 bg-base-100 p-2 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="join shrink-0">
              <button
                type="button"
                onClick={() => setSearchScope("current")}
                className={`btn join-item btn-xs ${searchScope === "current" ? "btn-primary" : "btn-ghost"}`}
              >
                This chat
              </button>
              <button
                type="button"
                onClick={() => setSearchScope("all")}
                className={`btn join-item btn-xs ${searchScope === "all" ? "btn-primary" : "btn-ghost"}`}
              >
                All
              </button>
            </div>

            <label className="input input-bordered input-sm flex min-w-0 flex-1 items-center gap-2">
              <Search className="size-4 opacity-60" />
              <input
                ref={searchInputRef}
                type="search"
                className="min-w-0 flex-1"
                placeholder={searchScope === "all" ? "Search all conversations..." : "Search this chat..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
              />
            </label>

            <div className="flex shrink-0 items-center justify-between gap-1 sm:justify-end">
              <span className="min-w-12 text-center text-xs text-base-content/60">
                {isMessageSearchLoading
                  ? "..."
                  : messageSearchResults.length
                    ? `${activeSearchIndex + 1}/${messageSearchResults.length}`
                    : "0"}
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-xs btn-circle"
                onClick={() => moveSearchResult(-1)}
                disabled={!messageSearchResults.length}
                aria-label="Previous search result"
                title="Previous"
              >
                <ChevronUp className="size-4" />
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-xs btn-circle"
                onClick={() => moveSearchResult(1)}
                disabled={!messageSearchResults.length}
                aria-label="Next search result"
                title="Next"
              >
                <ChevronDown className="size-4" />
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-xs btn-circle"
                onClick={closeSearch}
                aria-label="Close search"
                title="Close search"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {searchQuery.trim() && (
            <div className="mt-2 max-h-56 overflow-y-auto rounded-md bg-base-200/70">
              {isMessageSearchLoading ? (
                <div className="flex items-center justify-center px-3 py-4">
                  <span className="loading loading-spinner loading-sm" />
                </div>
              ) : messageSearchResults.length ? (
                <div className="divide-y divide-base-300">
                  {messageSearchResults.map((result, index) => (
                    <button
                      key={result.messageId}
                      type="button"
                      onClick={() => openResultAt(index)}
                      className={`flex w-full min-w-0 items-start gap-3 px-3 py-2 text-left transition hover:bg-base-300 ${
                        index === activeSearchIndex ? "bg-base-300" : ""
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-2 text-xs text-base-content/60">
                          <span className="truncate font-medium text-base-content/80">
                            {searchScope === "all" ? result.chat?.name : result.senderName}
                          </span>
                          {searchScope === "all" && (
                            <span className="shrink-0">
                              {result.chat?.type === "group" ? "Group" : result.senderName}
                            </span>
                          )}
                          <span className="ml-auto shrink-0">{formatMessageTime(result.createdAt)}</span>
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-sm leading-relaxed text-base-content/80">
                          {result.preview}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="px-3 py-4 text-center text-sm text-base-content/60">
                  No messages found.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {isMediaModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box max-w-3xl">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                {selectedMediaSrc && (
                  <button
                    type="button"
                    onClick={() => setSelectedMediaSrc(null)}
                    className="btn btn-ghost btn-sm"
                  >
                    Back
                  </button>
                )}
                <h3 className="truncate text-lg font-semibold">
                  {selectedMediaSrc ? "Image" : "Media"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedMediaSrc(null);
                  setIsMediaModalOpen(false);
                }}
                className="btn btn-ghost btn-sm btn-circle"
                aria-label="Close media"
                title="Close media"
              >
                <X className="size-4" />
              </button>
            </div>

            {selectedMediaSrc ? (
              <div className="mt-4 flex max-h-[70vh] items-center justify-center overflow-hidden rounded-lg bg-black/80 p-3">
                <img
                  src={selectedMediaSrc}
                  alt="Shared media preview"
                  className="max-h-[68vh] max-w-full object-contain"
                />
              </div>
            ) : (
              <>
                <div className="tabs tabs-boxed mt-4 flex-nowrap overflow-x-auto">
                  {mediaSections.map((section) => {
                    const Icon = section.icon;

                    return (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => setActiveMediaSection(section.id)}
                        className={`tab shrink-0 gap-2 ${
                          activeMediaSection === section.id ? "tab-active" : ""
                        }`}
                      >
                        <Icon className="size-4" />
                        {section.label}
                        <span className="badge badge-sm">{section.count}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 max-h-[65vh] overflow-y-auto pr-1">
                  {activeMediaSection === "photos" && (
                    photos.length > 0 ? (
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {photos.map((message) => (
                          <button
                            key={message._id}
                            type="button"
                            onClick={() => setSelectedMediaSrc(message.image)}
                            className="overflow-hidden rounded-lg bg-base-200"
                            title="Open photo"
                            aria-label="Open photo"
                          >
                            <img
                              src={message.image}
                              alt="Shared media"
                              className="aspect-square w-full object-cover transition-transform hover:scale-105"
                            />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-base-300 bg-base-200 px-4 py-8 text-center text-sm text-base-content/60">
                        No photos shared in this chat yet.
                      </div>
                    )
                  )}

                  {activeMediaSection === "videos" && (
                    videos.length > 0 ? (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {videos.map((message) => (
                          <video
                            key={message._id}
                            controls
                            src={message.video}
                            className="max-h-64 w-full rounded-lg bg-base-200"
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-base-300 bg-base-200 px-4 py-8 text-center text-sm text-base-content/60">
                        No videos shared in this chat yet.
                      </div>
                    )
                  )}

                  {activeMediaSection === "audios" && (
                    audios.length > 0 ? (
                      <div className="space-y-3">
                        {audios.map((message) => (
                          <div
                            key={message._id}
                            className="flex min-w-0 items-center gap-3 rounded-lg bg-base-200 p-3"
                          >
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                              <Mic className="size-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="mb-1 text-xs font-medium text-base-content/60">
                                Voice message
                              </p>
                              <audio controls src={message.audio} className="h-9 w-full min-w-0" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-base-300 bg-base-200 px-4 py-8 text-center text-sm text-base-content/60">
                        No audios shared in this chat yet.
                      </div>
                    )
                  )}

                  {activeMediaSection === "files" && (
                    files.length > 0 ? (
                      <div className="space-y-2">
                        {files.map((file) => (
                          <a
                            key={file.id}
                            href={getMessageFileDownloadUrl(file.id)}
                            target="_blank"
                            download={file.name || true}
                            rel="noreferrer"
                            className="flex items-center gap-3 rounded-lg bg-base-200 p-3 hover:bg-base-300"
                          >
                            <FileText className="size-5 shrink-0 text-primary" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium">{file.name}</span>
                              {(file.size || file.type) && (
                                <span className="block truncate text-xs text-base-content/60">
                                  {[formatFileSize(file.size), file.type].filter(Boolean).join(" · ")}
                                </span>
                              )}
                            </span>
                          </a>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-base-300 bg-base-200 px-4 py-8 text-center text-sm text-base-content/60">
                        No files shared in this chat yet.
                      </div>
                    )
                  )}

                  {activeMediaSection === "links" && (
                    links.length > 0 ? (
                      <div className="space-y-2">
                        {links.map((link) => (
                          <a
                            key={link.id}
                            href={link.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-3 rounded-lg bg-base-200 p-3 hover:bg-base-300"
                          >
                            <LinkIcon className="size-5 shrink-0 text-primary" />
                            <span className="truncate text-sm">{link.label}</span>
                          </a>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-base-300 bg-base-200 px-4 py-8 text-center text-sm text-base-content/60">
                        No links shared in this chat yet.
                      </div>
                    )
                  )}
                </div>
              </>
            )}
          </div>
          <div className="modal-backdrop">
            <button
              type="button"
              onClick={() => {
                setSelectedMediaSrc(null);
                setIsMediaModalOpen(false);
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {isReportModalOpen && (
        <ReportModal
          type="user"
          targetId={selectedUser._id}
          targetName={selectedUser.fullName}
          preview={selectedUser.status}
          onClose={() => setIsReportModalOpen(false)}
        />
      )}
    </div>
  );
};

export default ChatHeader;
