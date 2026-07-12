const DEFAULT_PRIVACY = {
  lastSeen: "friends",
  onlineStatus: "friends",
  profilePhoto: "friends",
  readReceipts: true,
};

const PRIVACY_FIELDS = ["lastSeen", "onlineStatus", "profilePhoto"];
const PRIVACY_AUDIENCES = ["everyone", "friends", "nobody"];

export const toId = (value) => value?._id?.toString() || value?.toString();

export const includesId = (values = [], id) =>
  values.some((value) => toId(value) === toId(id));

export const getPrivacySettings = (privacy = {}) => ({
  ...DEFAULT_PRIVACY,
  ...(privacy || {}),
  readReceipts:
    typeof privacy?.readReceipts === "boolean"
      ? privacy.readReceipts
      : DEFAULT_PRIVACY.readReceipts,
});

export const normalizePrivacyUpdate = (privacy = {}) => {
  const updates = {};

  PRIVACY_FIELDS.forEach((field) => {
    if (PRIVACY_AUDIENCES.includes(privacy[field])) {
      updates[`privacy.${field}`] = privacy[field];
    }
  });

  if (typeof privacy.readReceipts === "boolean") {
    updates["privacy.readReceipts"] = privacy.readReceipts;
  }

  return updates;
};

export const isFriendOfViewer = (targetUser, viewer) => {
  if (!targetUser || !viewer) return false;

  return (
    includesId(viewer.friends || [], targetUser._id) ||
    includesId(targetUser.friends || [], viewer._id)
  );
};

export const canViewPrivacyField = (targetUser, viewer, field) => {
  if (!targetUser || !viewer) return false;
  if (toId(targetUser._id) === toId(viewer._id)) return true;

  const privacy = getPrivacySettings(targetUser.privacy);
  const audience = privacy[field] || DEFAULT_PRIVACY[field];

  if (audience === "everyone") return true;
  if (audience === "friends") return isFriendOfViewer(targetUser, viewer);
  return false;
};

export const serializeUserForViewer = (user, viewer, extra = {}) => {
  const userObject = typeof user?.toObject === "function" ? user.toObject() : { ...(user || {}) };
  const privacy = getPrivacySettings(userObject.privacy);
  const canViewProfilePhoto = canViewPrivacyField(userObject, viewer, "profilePhoto");
  const canViewLastSeen = canViewPrivacyField(userObject, viewer, "lastSeen");
  const canViewOnlineStatus = canViewPrivacyField(userObject, viewer, "onlineStatus");

  delete userObject.password;
  delete userObject.emailVerificationCode;
  delete userObject.emailVerificationExpires;
  delete userObject.passwordResetCode;
  delete userObject.passwordResetExpires;
  delete userObject.sentFriendRequests;
  delete userObject.receivedFriendRequests;
  delete userObject.favoriteChats;
  delete userObject.blockedUsers;
  delete userObject.starredMessages;
  delete userObject.friends;

  return {
    ...userObject,
    ...extra,
    privacy,
    profilePic: canViewProfilePhoto ? userObject.profilePic : "",
    lastSeen: canViewLastSeen ? userObject.lastSeen : null,
    canViewProfilePhoto,
    canViewLastSeen,
    canViewOnlineStatus,
  };
};
