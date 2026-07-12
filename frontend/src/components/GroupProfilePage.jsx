import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, Check, Edit3, Image, ImagePlus, Info, LogOut, ShieldCheck, ShieldMinus, Trash2, UserMinus, Users, X } from "lucide-react";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import UserAvatar from "./UserAvatar";

const getId = (value) => value?._id || value;

const GroupProfilePage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { authUser } = useAuthStore();
  const {
    deleteGroup,
    groups,
    leaveGroup,
    removeGroupMember,
    selectedUser,
    setSelectedUser,
    updateGroupMemberRole,
    updateGroupProfile,
  } = useChatStore();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showMembers, setShowMembers] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState("");
  const [details, setDetails] = useState("");
  const [groupPicPreview, setGroupPicPreview] = useState("");
  const [groupPicChanged, setGroupPicChanged] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [removingMemberId, setRemovingMemberId] = useState(null);
  const [updatingRoleMemberId, setUpdatingRoleMemberId] = useState(null);
  const groupPicInputRef = useRef(null);

  const handleBack = () => {
    if (group) setSelectedUser(group);
    navigate("/");
  };

  const handleCancelEdit = () => {
    setName(group.name || "");
    setDetails(group.details || "");
    setGroupPicPreview(group.groupPic || "");
    setGroupPicChanged(false);
    setIsEditing(false);
  };

  const handleGroupPicChange = (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setGroupPicPreview(reader.result);
      setGroupPicChanged(true);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!group || !name.trim()) return;

    setIsSaving(true);
    const updatedGroup = await updateGroupProfile(group._id, {
      name,
      details,
      ...(groupPicChanged ? { groupPic: groupPicPreview } : {}),
    });
    setIsSaving(false);

    if (updatedGroup) {
      setGroup(updatedGroup);
      setGroupPicChanged(false);
      setIsEditing(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!group) return;

    setIsDeletingGroup(true);
    const deleted = await deleteGroup(group._id);
    setIsDeletingGroup(false);

    if (deleted) navigate("/");
  };

  const handleLeaveGroup = async () => {
    if (!group) return;

    const confirmed = window.confirm("Leave this group?");
    if (!confirmed) return;

    const left = await leaveGroup(group._id);
    if (left) navigate("/");
  };

  const handleRemoveMember = async () => {
    if (!group || !memberToRemove) return;

    setRemovingMemberId(memberToRemove._id);
    const updatedGroup = await removeGroupMember(group._id, memberToRemove._id);
    setRemovingMemberId(null);

    if (updatedGroup) {
      setGroup(updatedGroup);
      setMemberToRemove(null);
    }
  };

  const handleRoleChange = async (member, role) => {
    if (!group || !member) return;

    setUpdatingRoleMemberId(member._id);
    const updatedGroup = await updateGroupMemberRole(group._id, member._id, role);
    setUpdatingRoleMemberId(null);

    if (updatedGroup) setGroup(updatedGroup);
  };

  useEffect(() => {
    const fetchGroup = async () => {
      const localGroup =
        selectedUser?.isGroup && selectedUser._id === id
          ? selectedUser
          : groups.find((item) => item._id === id);

      if (localGroup) {
        setGroup(localGroup);
      }

      try {
        const res = await axiosInstance.get(`/messages/groups/${id}/profile`);
        setGroup(res.data);
      } catch (err) {
        console.error("Error fetching group:", err.message);
        if (!localGroup) {
          setGroup(null);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchGroup();
  }, [groups, id, selectedUser]);

  useEffect(() => {
    if (!group || isEditing) return;

    setName(group.name || "");
    setDetails(group.details || "");
    setGroupPicPreview(group.groupPic || "");
    setGroupPicChanged(false);
  }, [group, isEditing]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="mt-20 text-center font-semibold text-red-500">
        <p>Group not found.</p>
        <button
          type="button"
          onClick={handleBack}
          className="btn btn-ghost btn-sm mt-4 gap-2"
        >
          <ArrowLeft className="size-4" />
          Back
        </button>
      </div>
    );
  }

  const displayedGroupPic = groupPicPreview || group.groupPic;
  const adminIds =
    group.admins?.length > 0
      ? group.admins.map((admin) => getId(admin))
      : group.members?.[0]
        ? [getId(group.members[0])]
        : [];
  const isAdmin = adminIds.includes(authUser?._id);
  const canDemoteAdmin = (memberId) =>
    adminIds.includes(memberId) && adminIds.length > 1;

  return (
    <div className="h-screen overflow-y-auto bg-base-200 px-4 pt-20">
      <div className="mx-auto w-full max-w-2xl py-8">
        <div className="space-y-8 rounded-xl bg-base-300 p-6 shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="btn btn-ghost btn-sm gap-2"
            >
              <ArrowLeft className="size-4" />
              Back
            </button>

            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="btn btn-primary btn-sm gap-2"
                    disabled={isSaving || !name.trim()}
                  >
                    <Check className="size-4" />
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="btn btn-ghost btn-sm btn-circle"
                    disabled={isSaving}
                    aria-label="Cancel editing"
                    title="Cancel editing"
                  >
                    <X className="size-4" />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="btn btn-ghost btn-sm gap-2"
                >
                  <Edit3 className="size-4" />
                  Edit
                </button>
              )}
            </div>
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-semibold">Group Profile</h1>
            <p className="mt-2 text-sm text-zinc-400">Information of this group</p>
          </div>

          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              {displayedGroupPic ? (
              <img
                src={displayedGroupPic}
                alt={group.name}
                className="size-32 rounded-full border-4 object-cover"
              />
            ) : (
              <div className="flex size-32 items-center justify-center rounded-full border-4 bg-primary/10">
                <Image className="size-12 text-primary" />
              </div>
            )}

              {isEditing && (
                <>
                  <input
                    ref={groupPicInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleGroupPicChange}
                  />
                  <button
                    type="button"
                    onClick={() => groupPicInputRef.current?.click()}
                    className="btn btn-primary btn-sm btn-circle absolute bottom-1 right-1"
                    aria-label="Change group image"
                    title="Change group image"
                  >
                    <ImagePlus className="size-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="mt-4 space-y-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <Users className="size-4" />
                Name
              </div>
              {isEditing ? (
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input input-bordered w-full"
                  placeholder="Group name"
                />
              ) : (
                <p className="rounded-lg border bg-base-200 px-4 py-2.5">{group.name}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <Info className="size-4" />
                Details
              </div>
              {isEditing ? (
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  className="textarea textarea-bordered min-h-24 w-full resize-none"
                  placeholder="Group details"
                />
              ) : (
                <div className="rounded-lg border bg-base-200 px-4 py-2.5">
                  {group.details || "No details added."}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-base-200 bg-base-300 p-6">
            <h2 className="mb-4 text-lg font-medium">Group Information</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between border-b border-zinc-700 py-2">
                <span className="flex items-center gap-2">
                  <Calendar className="size-4" />
                  Created On
                </span>
                <span>{group.createdAt?.split("T")[0]}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span>Number of Members</span>
                <button
                  type="button"
                  onClick={() => setShowMembers((value) => !value)}
                  className="font-medium text-green-500 hover:underline"
                >
                  {group.members?.length || 0}
                </button>
              </div>
            </div>

            {showMembers && (
              <div className="mt-4 space-y-2 border-t border-base-200 pt-4">
                {(group.members || []).map((member) => {
                  const memberIsAdmin = adminIds.includes(member._id);
                  const isRoleUpdating = updatingRoleMemberId === member._id;
                  const canManageThisMember = isAdmin && member._id !== authUser?._id;

                  return (
                    <div
                      key={member._id}
                      className="flex items-center justify-between gap-3 rounded-lg bg-base-200 px-3 py-2"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <UserAvatar name={member.fullName} profilePic={member.profilePic} size="36px" />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{member.fullName}</p>
                          {member.email && (
                            <p className="truncate text-xs text-base-content/60">{member.email}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className={`badge badge-sm ${memberIsAdmin ? "badge-primary" : "badge-ghost"}`}>
                          {memberIsAdmin ? "Admin" : "Member"}
                        </span>

                        {canManageThisMember && (
                          <>
                            {memberIsAdmin ? (
                              <button
                                type="button"
                                onClick={() => handleRoleChange(member, "member")}
                                className="btn btn-ghost btn-xs btn-circle text-warning"
                                disabled={isRoleUpdating || !canDemoteAdmin(member._id)}
                                aria-label={`Remove admin role from ${member.fullName}`}
                                title={
                                  canDemoteAdmin(member._id)
                                    ? `Remove admin role from ${member.fullName}`
                                    : "A group must have at least one admin"
                                }
                              >
                                {isRoleUpdating ? (
                                  <span className="loading loading-spinner loading-xs" />
                                ) : (
                                  <ShieldMinus className="size-4" />
                                )}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleRoleChange(member, "admin")}
                                className="btn btn-ghost btn-xs btn-circle text-primary"
                                disabled={isRoleUpdating}
                                aria-label={`Make ${member.fullName} admin`}
                                title={`Make ${member.fullName} admin`}
                              >
                                {isRoleUpdating ? (
                                  <span className="loading loading-spinner loading-xs" />
                                ) : (
                                  <ShieldCheck className="size-4" />
                                )}
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setMemberToRemove(member)}
                              className="btn btn-ghost btn-xs btn-circle text-error"
                              disabled={removingMemberId === member._id}
                              aria-label={`Remove ${member.fullName}`}
                              title={`Remove ${member.fullName}`}
                            >
                              {removingMemberId === member._id ? (
                                <span className="loading loading-spinner loading-xs" />
                              ) : (
                                <UserMinus className="size-4" />
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end border-t border-base-200 pt-6">
            {isAdmin ? (
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                className="btn btn-error btn-sm gap-2"
              >
                <Trash2 className="size-4" />
                Delete Group
              </button>
            ) : (
              <button
                type="button"
                onClick={handleLeaveGroup}
                className="btn btn-warning btn-sm gap-2"
              >
                <LogOut className="size-4" />
                Leave Group
              </button>
            )}
          </div>
        </div>
      </div>

      {isDeleteModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box max-w-md">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-error/10 text-error">
                <Trash2 className="size-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-semibold">Delete group?</h3>
                <p className="mt-2 text-sm text-base-content/70">
                  This will delete {group.name} for every member and remove its messages.
                </p>
              </div>
            </div>

            <div className="modal-action">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeletingGroup}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-error btn-sm gap-2"
                onClick={handleDeleteGroup}
                disabled={isDeletingGroup}
              >
                {isDeletingGroup ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  <Trash2 className="size-4" />
                )}
                Delete
              </button>
            </div>
          </div>
          <div className="modal-backdrop">
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isDeletingGroup}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {memberToRemove && (
        <div className="modal modal-open">
          <div className="modal-box max-w-md">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-error/10 text-error">
                <UserMinus className="size-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-semibold">Remove member?</h3>
                <p className="mt-2 text-sm text-base-content/70">
                  {memberToRemove.fullName} will lose access to {group.name}.
                </p>
              </div>
            </div>

            <div className="modal-action">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setMemberToRemove(null)}
                disabled={removingMemberId === memberToRemove._id}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-error btn-sm gap-2"
                onClick={handleRemoveMember}
                disabled={removingMemberId === memberToRemove._id}
              >
                {removingMemberId === memberToRemove._id ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  <UserMinus className="size-4" />
                )}
                Remove
              </button>
            </div>
          </div>
          <div className="modal-backdrop">
            <button
              type="button"
              onClick={() => setMemberToRemove(null)}
              disabled={removingMemberId === memberToRemove._id}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupProfilePage;
