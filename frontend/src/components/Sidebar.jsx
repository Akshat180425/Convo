import { useEffect, useRef, useState } from "react";
import { Bot, Check, Heart, ImagePlus, MessageCircle, Plus, Search, UserPlus, Users, UsersRound, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { AI_ASSISTANT_USER, useChatStore } from "../store/useChatStore";
import { formatLastSeen } from "../lib/utils";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import UserAvatar from "./UserAvatar";

const Sidebar = () => {
  const {
    acceptFriendRequest,
    activeSidebarTab,
    createGroup,
    friendRequests,
    friendSuggestions,
    getFriendData,
    getGroups,
    getUsers,
    groupDraft,
    groups,
    isFriendDataLoading,
    isGroupsLoading,
    isUsersLoading,
    rejectFriendRequest,
    resetGroupDraft,
    sidebarSearchQuery,
    selectedUser,
    sendFriendRequest,
    setActiveSidebarTab,
    setGroupDraft,
    setSelectedUser,
    setSidebarSearchQuery,
    toggleFavoriteChat,
    toggleGroupDraftMember,
    users,
  } = useChatStore();

  const { authUser, lastSeenByUser, onlineUsers } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const groupImageInputRef = useRef(null);
  const searchInputRef = useRef(null);

  const groupName = groupDraft.name;
  const groupDetails = groupDraft.details;
  const groupImagePreview = groupDraft.groupPic;
  const groupMemberIds = groupDraft.memberIds;
  const isSelectingGroupMembers = groupDraft.isSelectingMembers;
  const setActiveTab = setActiveSidebarTab;
  const activeTab = activeSidebarTab;
  const cleanSearchQuery = sidebarSearchQuery.trim().toLowerCase();

  useEffect(() => {
    getUsers();
    getGroups();
    getFriendData();
  }, [getFriendData, getGroups, getUsers]);

  useEffect(() => {
    if (isSelectingGroupMembers) setActiveTab("friends");
  }, [isSelectingGroupMembers, setActiveTab]);

  useEffect(() => {
    const focusSearch = () => searchInputRef.current?.focus();

    window.addEventListener("convo:focus-sidebar-search", focusSearch);
    return () => window.removeEventListener("convo:focus-sidebar-search", focusSearch);
  }, []);

  const friends = users.filter((user) => user._id !== authUser?._id);
  const searchedFriends = cleanSearchQuery
    ? friends.filter((user) =>
        [user.fullName, user.email, user.status]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(cleanSearchQuery))
      )
    : friends;
  const canShowOnline = (user) => user.canViewOnlineStatus !== false;
  const canShowLastSeen = (user) => user.canViewLastSeen !== false;
  const isUserOnline = (user) => canShowOnline(user) && onlineUsers.includes(user._id);
  const getPresenceText = (user) => {
    if (user._id === authUser?._id) return "Message yourself";
    if (user.isAiAssistant) return user.status;
    if (user.blockedByMe) return "Blocked";
    if (user.hasBlockedMe) return "Unavailable";
    if (isUserOnline(user)) return "Online";
    if (!canShowOnline(user) && !canShowLastSeen(user)) return "Status hidden";
    if (!canShowLastSeen(user)) return "Last seen hidden";
    return formatLastSeen(lastSeenByUser[user._id] || user.lastSeen);
  };
  const filteredUsers = showOnlineOnly
    ? searchedFriends.filter((user) => isUserOnline(user))
    : searchedFriends;
  const filteredGroups = cleanSearchQuery
    ? groups.filter((group) =>
        [group.name, group.details]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(cleanSearchQuery))
      )
    : groups;
  const filteredFriendSuggestions = cleanSearchQuery
    ? friendSuggestions.filter((user) =>
        [user.fullName, user.email, user.status]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(cleanSearchQuery))
      )
    : friendSuggestions;

  const selfUser = users.find((user) => user._id === authUser?._id);
  const directUnreadCount = users
    .filter((user) => user._id !== authUser?._id)
    .reduce((total, user) => total + (Number(user.unreadCount) || 0), 0);
  const groupUnreadCount = groups.reduce(
    (total, group) => total + (Number(group.unreadCount) || 0),
    0
  );
  const totalUnreadCount = directUnreadCount + groupUnreadCount;
  const formatUnreadCount = (count) => (count > 99 ? "99+" : count);

  const UnreadBadge = ({ count, className = "" }) =>
    count > 0 ? (
      <span
        className={`flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white ${className}`}
      >
        {formatUnreadCount(count)}
      </span>
    ) : null;

  const toggleGroupMember = (userId) => {
    toggleGroupDraftMember(userId);
  };

  const startGroupMemberSelection = () => {
    setShowOnlineOnly(false);
    setGroupDraft({ isSelectingMembers: true });
    setActiveTab("friends");
  };

  const finishGroupMemberSelection = () => {
    setGroupDraft({ isSelectingMembers: false });
    setActiveTab("groups");
  };

  const cancelGroupMemberSelection = () => {
    setGroupDraft({ memberIds: [], isSelectingMembers: false });
    setActiveTab("groups");
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    const group = await createGroup({
      name: groupName,
      details: groupDetails,
      groupPic: groupImagePreview,
      memberIds: groupMemberIds,
    });

    if (group) {
      resetGroupDraft();
      if (groupImageInputRef.current) groupImageInputRef.current.value = "";
      setActiveTab("groups");
      setSelectedUser(group);
    }
  };

  const handleGroupImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onloadend = () => setGroupDraft({ groupPic: reader.result });
    reader.readAsDataURL(file);
  };

  if (isUsersLoading) return <SidebarSkeleton />;

  const renderUserAvatar = (user) => (
    <div className="relative shrink-0">
      <UserAvatar name={user.fullName} profilePic={user.profilePic} size="48px" />

      {isUserOnline(user) && (
        <span className="absolute bottom-0 right-0 size-3 rounded-full bg-green-500 ring-2 ring-zinc-900" />
      )}
    </div>
  );

  const renderUserRow = (user) => {
    const isSelf = user._id === authUser?._id;
    const isAiAssistant = Boolean(user.isAiAssistant);
    const profilePath = isSelf ? "/profile" : `/profile/${user._id}`;
    const isSelectedForGroup = groupMemberIds.includes(user._id);
    const canSelectForGroup = isSelectingGroupMembers && !isSelf && !isAiAssistant;

    return (
      <button
        key={user._id}
        type="button"
        onClick={() => {
          if (canSelectForGroup) {
            toggleGroupMember(user._id);
            return;
          }

          if (!isSelectingGroupMembers) setSelectedUser(user);
        }}
        className={`flex w-full items-center gap-3 p-3 transition-colors hover:bg-base-300 ${
          !selectedUser?.isGroup && selectedUser?._id === user._id ? "bg-base-300 ring-1 ring-base-300" : ""
        } ${isSelectedForGroup ? "bg-primary/10" : ""}`}
      >
        {isAiAssistant ? (
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Bot className="size-6" />
          </div>
        ) : (
          renderUserAvatar(user)
        )}

        <div className="hidden min-w-0 flex-1 flex-col justify-center lg:flex">
          <div className="flex items-center justify-between gap-2">
            {isAiAssistant ? (
              <span className="truncate text-left font-medium">{user.fullName}</span>
            ) : (
              <Link
                to={profilePath}
                onClick={(e) => e.stopPropagation()}
                className="truncate text-left font-medium hover:underline"
              >
                {isSelf ? `${user.fullName} (You)` : user.fullName}
              </Link>
            )}

            <div className="flex shrink-0 items-center gap-1">
              {canSelectForGroup && (
                <span
                  className={`flex size-5 items-center justify-center rounded-full border ${
                    isSelectedForGroup ? "border-primary bg-primary text-primary-content" : "border-base-content/30"
                  }`}
                >
                  {isSelectedForGroup && <Check className="size-3" />}
                </span>
              )}

              {!isSelf && !isAiAssistant && !isSelectingGroupMembers && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavoriteChat(user._id);
                  }}
                  className={`btn btn-ghost btn-xs btn-circle ${
                    user.isFavorite ? "text-rose-500" : "text-zinc-400"
                  }`}
                  aria-label={user.isFavorite ? "Remove favorite chat" : "Favorite chat"}
                  title={user.isFavorite ? "Remove favorite chat" : "Favorite chat"}
                >
                  <Heart size={15} fill={user.isFavorite ? "currentColor" : "none"} />
                </button>
              )}

              {!isSelf && user.unreadCount > 0 && (
                <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">
                  {user.unreadCount > 99 ? "99+" : user.unreadCount}
                </span>
              )}
            </div>
          </div>

          <div className="truncate text-left text-sm text-zinc-400">
            {getPresenceText(user)}
          </div>
        </div>
      </button>
    );
  };

  const renderGroupRow = (group) => (
    <button
      key={group._id}
      type="button"
      onClick={() => setSelectedUser(group)}
      className={`flex w-full items-center gap-3 p-3 transition-colors hover:bg-base-300 ${
        selectedUser?.isGroup && selectedUser?._id === group._id ? "bg-base-300 ring-1 ring-base-300" : ""
      }`}
    >
      {group.groupPic ? (
        <img
          src={group.groupPic}
          alt={group.name}
          className="size-12 shrink-0 rounded-full object-cover"
        />
      ) : (
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <UsersRound className="size-6 text-primary" />
        </div>
      )}

      <div className="hidden min-w-0 flex-1 flex-col justify-center lg:flex">
        <div className="truncate text-left font-medium">{group.name}</div>
        <div className="flex items-center gap-2 truncate text-left text-sm text-zinc-400">
          <span className="truncate">{group.members?.length || 0} members</span>
          <UnreadBadge count={group.unreadCount || 0} />
        </div>
      </div>
    </button>
  );

  const tabs = [
    { id: "friends", label: "Friends", icon: MessageCircle },
    { id: "groups", label: "Groups", icon: UsersRound },
    { id: "requests", label: "Requests", icon: UserPlus },
    { id: "add", label: "Add", icon: Search },
  ];

  return (
    <aside className="flex h-full w-20 flex-col border-r border-base-300 transition-all duration-200 lg:w-72">
      <div className="w-full border-b border-base-300 p-3 lg:p-5">
        <div className="flex items-center gap-2">
          <Users className="size-6" />
          <span className="hidden font-medium lg:block">Chats</span>
          <UnreadBadge count={totalUnreadCount} className="hidden lg:flex" />
        </div>

        <div className="mt-3 grid grid-cols-1 gap-1 lg:grid-cols-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  if (isSelectingGroupMembers && tab.id !== "friends") {
                    setGroupDraft({ isSelectingMembers: false });
                  }
                  setActiveTab(tab.id);
                }}
                className={`tooltip tooltip-right btn btn-ghost btn-sm btn-square relative mx-auto flex items-center justify-center lg:tooltip-bottom ${
                  activeTab === tab.id ? "btn-active" : ""
                }`}
                data-tip={tab.label}
                aria-label={tab.label}
                title={tab.label}
              >
                <Icon className="size-4" />
                {tab.id === "friends" && (
                  <UnreadBadge
                    count={directUnreadCount}
                    className="absolute -right-1 -top-1"
                  />
                )}
                {tab.id === "groups" && (
                  <UnreadBadge
                    count={groupUnreadCount}
                    className="absolute -right-1 -top-1"
                  />
                )}
              </button>
            );
          })}
        </div>

        {activeTab === "friends" && !isSelectingGroupMembers && (
          <div className="mt-3 hidden items-center gap-2 lg:flex">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={showOnlineOnly}
                onChange={(e) => setShowOnlineOnly(e.target.checked)}
                className="checkbox checkbox-sm"
              />
              <span className="text-sm">Online only</span>
            </label>
          </div>
        )}

        <label className="input input-bordered input-sm mt-3 hidden items-center gap-2 lg:flex">
          <Search className="size-4 opacity-60" />
          <input
            ref={searchInputRef}
            type="search"
            value={sidebarSearchQuery}
            onChange={(e) => setSidebarSearchQuery(e.target.value)}
            className="min-w-0 flex-1"
            placeholder={
              activeTab === "groups"
                ? "Search groups"
                : activeTab === "add"
                  ? "Search people"
                  : "Search chats"
            }
          />
          {sidebarSearchQuery && (
            <button
              type="button"
              onClick={() => setSidebarSearchQuery("")}
              className="btn btn-ghost btn-xs btn-circle"
              aria-label="Clear search"
              title="Clear search"
            >
              <X className="size-3" />
            </button>
          )}
        </label>
      </div>

      <div className="w-full flex-1 overflow-y-auto py-3">
        {activeTab === "friends" && (
          <>
            {isSelectingGroupMembers && (
              <div className="hidden border-b border-base-300 px-3 pb-3 lg:block">
                <div className="mb-2 text-sm font-medium">Select group members</div>
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-xs text-base-content/60">
                    {groupMemberIds.length} selected
                  </span>
                  <button
                    type="button"
                    className="btn btn-primary btn-xs gap-1"
                    onClick={finishGroupMemberSelection}
                    disabled={groupMemberIds.length === 0}
                  >
                    <Check className="size-3" />
                    Finalize
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs btn-circle"
                    onClick={cancelGroupMemberSelection}
                    aria-label="Cancel member selection"
                    title="Cancel member selection"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              </div>
            )}
            {selfUser && renderUserRow(selfUser)}
            {!isSelectingGroupMembers && renderUserRow(AI_ASSISTANT_USER)}
            {filteredUsers.map(renderUserRow)}
            {!selfUser && filteredUsers.length === 0 && (
              <div className="hidden px-4 py-6 text-center text-sm text-zinc-500 lg:block">
                Add friends to start chatting.
              </div>
            )}
          </>
        )}

        {activeTab === "groups" && (
          <div>
            <form onSubmit={handleCreateGroup} className="hidden border-b border-base-300 px-3 pb-3 lg:block">
              <div className="flex gap-2">
                <div className="min-w-0 flex-1 space-y-2">
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupDraft({ name: e.target.value })}
                    className="input input-bordered input-sm w-full"
                    placeholder="Group name"
                  />
                  <input
                    type="text"
                    value={groupDetails}
                    onChange={(e) => setGroupDraft({ details: e.target.value })}
                    className="input input-bordered input-sm w-full"
                    placeholder="Group details"
                  />
                </div>
                <div className="flex shrink-0 flex-col gap-2">
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm btn-circle"
                    disabled={!groupName.trim() || groupMemberIds.length === 0}
                    title="Create group"
                    aria-label="Create group"
                  >
                    <Plus className="size-4" />
                  </button>
                  <input
                    ref={groupImageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleGroupImageChange}
                  />
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm btn-circle overflow-hidden"
                    onClick={() => groupImageInputRef.current?.click()}
                    aria-label="Choose group image"
                    title="Choose group image"
                  >
                    {groupImagePreview ? (
                      <img
                        src={groupImagePreview}
                        alt="Group preview"
                        className="size-full rounded-full object-cover"
                      />
                    ) : (
                      <ImagePlus className="size-4" />
                    )}
                  </button>
                </div>
              </div>
              {groupImagePreview && (
                <button
                  type="button"
                  className="btn btn-ghost btn-xs mt-2 gap-1"
                  onClick={() => {
                    setGroupDraft({ groupPic: null });
                    if (groupImageInputRef.current) groupImageInputRef.current.value = "";
                  }}
                >
                  <X className="size-3" />
                  Remove image
                </button>
              )}

              <button
                type="button"
                className="btn btn-outline btn-sm mt-2 w-full justify-between"
                onClick={startGroupMemberSelection}
              >
                <span className="flex items-center gap-2">
                  <UserPlus className="size-4" />
                  Add members
                </span>
                <span className="text-xs font-normal">
                  {groupMemberIds.length ? `${groupMemberIds.length} selected` : "Required"}
                </span>
              </button>
            </form>

            {isGroupsLoading ? (
              <div className="hidden px-4 py-6 text-sm text-zinc-500 lg:block">Loading groups...</div>
            ) : filteredGroups.length === 0 ? (
              <div className="hidden px-4 py-6 text-center text-sm text-zinc-500 lg:block">
                {cleanSearchQuery ? "No groups found." : "Create a group from your friends."}
              </div>
            ) : (
              filteredGroups.map(renderGroupRow)
            )}
          </div>
        )}

        {activeTab === "requests" && (
          <div className="hidden space-y-4 px-3 lg:block">
            {isFriendDataLoading ? (
              <div className="py-4 text-sm text-zinc-500">Loading requests...</div>
            ) : (
              <>
                <div>
                  <p className="mb-2 text-xs font-medium uppercase text-base-content/50">Incoming</p>
                  {friendRequests.incoming.length === 0 ? (
                    <p className="text-sm text-zinc-500">No incoming requests.</p>
                  ) : (
                    friendRequests.incoming.map((user) => (
                      <div key={user._id} className="mb-2 flex items-center gap-2 rounded-md bg-base-200 p-2">
                        {renderUserAvatar(user)}
                        <span className="min-w-0 flex-1 truncate text-sm">{user.fullName}</span>
                        <button
                          type="button"
                          className="btn btn-success btn-xs btn-circle"
                          onClick={() => acceptFriendRequest(user._id)}
                          aria-label="Accept request"
                          title="Accept request"
                        >
                          <Check className="size-3" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs btn-circle"
                          onClick={() => rejectFriendRequest(user._id)}
                          aria-label="Reject request"
                          title="Reject request"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium uppercase text-base-content/50">Sent</p>
                  {friendRequests.outgoing.length === 0 ? (
                    <p className="text-sm text-zinc-500">No sent requests.</p>
                  ) : (
                    friendRequests.outgoing.map((user) => (
                      <div key={user._id} className="mb-2 flex items-center gap-2 rounded-md bg-base-200 p-2">
                        {renderUserAvatar(user)}
                        <span className="min-w-0 flex-1 truncate text-sm">{user.fullName}</span>
                        <span className="text-xs text-base-content/50">Sent</span>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === "add" && (
          <div className="hidden space-y-2 px-3 lg:block">
            {isFriendDataLoading ? (
              <div className="py-4 text-sm text-zinc-500">Loading people...</div>
            ) : filteredFriendSuggestions.length === 0 ? (
              <div className="py-4 text-sm text-zinc-500">
                {cleanSearchQuery ? "No people found." : "No new people to add."}
              </div>
            ) : (
              filteredFriendSuggestions.map((user) => (
                <div key={user._id} className="flex items-center gap-2 rounded-md bg-base-200 p-2">
                  {renderUserAvatar(user)}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{user.fullName}</p>
                    <p className="truncate text-xs text-base-content/50">{user.email}</p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary btn-xs btn-circle"
                    onClick={() => sendFriendRequest(user._id)}
                    aria-label="Send friend request"
                    title="Send friend request"
                  >
                    <UserPlus className="size-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
