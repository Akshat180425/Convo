export const convoKnowledgeBase = [
  {
    id: "navigation_tabs",
    title: "Main Tabs",
    keywords: ["tab", "tabs", "friends", "groups", "requests", "add", "sidebar", "navigation"],
    content:
      "Convo has four main sidebar tabs: Friends, Groups, Requests, and Add. The tab names are shown as hover tooltips on the icons. Friends shows accepted friends, self-chat, favorite chats, and Convo AI. Groups shows group chats and group creation. Requests shows incoming and outgoing friend requests. Add lets users discover people and send friend requests.",
  },
  {
    id: "friends_requests",
    title: "Friend Requests",
    keywords: ["friend", "friends", "request", "requests", "accept", "reject", "add", "discover", "message"],
    content:
      "Users do not see every user as a chat by default. A person appears as a normal chat only after the users are friends. The Add tab is used to discover people and send friend requests. The Requests tab is used to accept or reject incoming requests and view outgoing requests. Users can message friends, and self-chat is always available.",
  },
  {
    id: "favorite_chats",
    title: "Favorite Chats",
    keywords: ["favorite", "favourite", "pin chat", "chat list", "star chat"],
    content:
      "Users can mark individual chats as favorite from the chat header. Favorite chats are prioritized in the Friends list. The self-chat is always available and cannot be blocked or favorited like another user.",
  },
  {
    id: "chat_header",
    title: "Chat Header Actions",
    keywords: ["header", "block", "media", "button", "profile", "name", "chat name"],
    content:
      "In an individual chat header, clicking the user's name or avatar opens that user's profile. The header also has icon-only buttons for blocking or unblocking the user and for opening the media collection. Button labels appear through hover tooltips.",
  },
  {
    id: "sending_messages",
    title: "Sending Messages",
    keywords: ["send", "message", "text", "image", "audio", "file", "document", "chat", "reply", "input"],
    content:
      "In a chat, users can send text messages, image messages, document/file attachments, and recorded audio messages from the message input. Users can also reply to an existing message. One-to-one messages can only be sent to friends, except for self-chat.",
  },
  {
    id: "blocking_users",
    title: "Blocking Users",
    keywords: ["block", "unblock", "blocked", "user", "favorite", "chat header"],
    content:
      "Users can block or unblock another user from the individual chat header. Blocking is not available for self-chat. When a user is blocked, that chat is removed from favorites and messaging that user is restricted until unblocked.",
  },
  {
    id: "message_actions",
    title: "Message Actions",
    keywords: ["message", "actions", "hover", "star", "pin", "reply", "edit", "delete", "everyone", "yourself"],
    content:
      "Message action buttons appear only when hovering over the message area. They are positioned above the message bubble and below the timestamp area. Users can star, pin, reply to, and delete messages. Senders can edit their own text messages and delete their own messages for everyone. Any participant can delete a message for themselves.",
  },
  {
    id: "deleted_messages",
    title: "Deleted Messages",
    keywords: ["deleted", "delete", "placeholder", "remove", "everyone", "yourself", "clean"],
    content:
      "Deleting a message for everyone clears its text, image, and audio, removes it from starred messages, and shows a deleted-message placeholder to chat participants. A user can also delete that already-deleted placeholder for themselves so it no longer affects their chat view.",
  },
  {
    id: "starred_messages",
    title: "Starred Messages",
    keywords: ["star", "starred", "saved", "home", "from", "to", "link"],
    content:
      "Starred messages are shown on the home screen. A starred message entry displays who sent the message and who received it, such as X to You or You to X. The other person's name in a starred message entry links back to that chat.",
  },
  {
    id: "pinned_messages",
    title: "Pinned Messages",
    keywords: ["pin", "pinned", "message", "limit"],
    content:
      "Messages can be pinned in a chat. Convo limits pinned messages to three per one-to-one chat.",
  },
  {
    id: "media_collection",
    title: "Media Collection",
    keywords: ["media", "collection", "photos", "videos", "audios", "audio", "files", "file", "document", "links", "image", "zoom"],
    content:
      "The media collection opens from the media button in the chat header. It has sections for Photos, Videos, Audios, Files, and Links. Photos are image messages from the current chat. Audios are recorded audio messages from the current chat. Files are document/file attachments shared in the current chat. Links are detected from message text. Clicking a photo opens it in a zoomed image view inside the media modal, with a back option to return to the collection.",
  },
  {
    id: "audio_messages",
    title: "Audio Messages",
    keywords: ["audio", "voice", "record", "recording", "microphone", "send", "preview"],
    content:
      "Convo supports recorded audio messages. In the message input, users can record audio, preview it, cancel it, or send it. Sent audio messages appear in the chat as audio players and are also listed in the Audios section of the media collection.",
  },
  {
    id: "group_chats",
    title: "Group Chats",
    keywords: ["group", "groups", "create", "member", "members", "friend", "select", "finalize", "details", "image"],
    content:
      "Groups are created from the Groups tab. A user enters a group name and details, can choose a group image, then clicks Add members to select friends. Groups can only include the creator and selected friends. The member selection flow preserves already selected people when the user opens a profile and goes back.",
  },
  {
    id: "group_profile",
    title: "Group Profile",
    keywords: ["group profile", "group name", "details", "created", "members", "member count", "group image", "scroll"],
    content:
      "Clicking a group name or group avatar opens the Group Profile. It shows the group image, name, details, Group info, Created on date, and Number of Members. Clicking the member count expands the member list. The profile content can scroll so the member list can be browsed without losing access to the upper group details.",
  },
  {
    id: "group_editing",
    title: "Editing Group Profile",
    keywords: ["edit group", "editable", "group name", "details", "group image", "profile"],
    content:
      "Group members can edit group profile fields from the Group Profile. Editable fields include the group name, details, and group image.",
  },
  {
    id: "group_admin",
    title: "Group Admin",
    keywords: ["admin", "creator", "delete group", "remove member", "remove a member", "remove members", "leave group", "group owner"],
    content:
      "The group creator is the group Admin. The member list marks the creator/admin with Admin. The admin can delete the group and remove other members, but cannot remove himself from the group. Non-admin members can leave the group. Admin-only destructive actions use in-app confirmation dialogs.",
  },
  {
    id: "group_back_navigation",
    title: "Group Back Navigation",
    keywords: ["back", "group profile", "groups tab", "return", "navigate"],
    content:
      "When a user opens a Group Profile and clicks Back, Convo returns to the Groups tab with the same group chat still open.",
  },
  {
    id: "user_profile",
    title: "User Profile",
    keywords: ["user profile", "profile", "status", "account info", "image", "avatar"],
    content:
      "A user profile shows the user's profile image or initials fallback, full name, status, and Account Info such as email and account creation date. Users can edit their own name, status, and profile image from their own profile page.",
  },
  {
    id: "presence",
    title: "Online and Last Seen",
    keywords: ["online", "offline", "last seen", "indicator", "availability", "status"],
    content:
      "Convo shows online indicators for users who are currently connected. When a friend is offline, Convo can show last seen text such as just now, minutes ago, hours ago, or a date based on the stored lastSeen time.",
  },
  {
    id: "settings",
    title: "Settings",
    keywords: ["settings", "theme", "themes", "back", "appearance"],
    content:
      "The Settings page lets users change the app theme. The Settings page has a back option so users can return after changing settings.",
  },
  {
    id: "keyboard_shortcuts",
    title: "Keyboard Shortcuts",
    keywords: ["shortcut", "shortcuts", "keyboard", "keys", "ctrl", "alt", "slash", "search"],
    content:
      "Convo has a keyboard shortcuts button fixed at the bottom-right of the app. Ctrl + / opens the shortcuts panel. / focuses sidebar search when the user is not typing. Ctrl + Enter sends the current message from the typing box. Esc closes the shortcuts panel or clears reply/edit mode. Ctrl + Alt + F, G, R, and N switch to Friends, Groups, Requests, and Add. Ctrl + Alt + A opens Convo AI. Ctrl + Alt + S returns to the home/starred view. Ctrl + Alt + M opens the current chat's media collection. Ctrl + Alt + P opens the current chat profile. Ctrl + Alt + B blocks or unblocks the current user chat. Ctrl + Alt + T opens Settings. Alt + Up and Alt + Down move through the current Friends or Groups chat list.",
  },
  {
    id: "email_auth",
    title: "Email Signup and Verification",
    keywords: ["signup", "sign up", "email", "verification", "verify", "code", "login", "mail"],
    content:
      "New email/password signups require email verification before the account is accepted. Convo sends a verification code by email. Existing older accounts are treated as accepted users when they already have a usable password and were created before verification was added.",
  },
  {
    id: "forgot_password",
    title: "Forgot Password",
    keywords: ["forgot", "password", "reset", "email", "code", "change password"],
    content:
      "The login screen has a Forgot password option. A user enters their email, Convo sends a password reset code by email, and the user can set a new password after entering the correct code.",
  },
  {
    id: "google_auth",
    title: "Google Login and Connection",
    keywords: ["google", "login", "sign in", "signup", "connect", "connected", "password"],
    content:
      "Users can sign in or sign up with Google. A Google-created Convo account does not use the user's Google password as the Convo password. Google-created accounts can set a Convo password from their profile if they do not already have one. Email/password users can connect Google from their profile. Connected users see that their account is connected to Google instead of seeing the Connect Google button.",
  },
  {
    id: "ai_assistant",
    title: "Convo AI",
    keywords: ["ai", "assistant", "convo ai", "help", "question", "app"],
    content:
      "Convo AI appears in the Friends tab as a built-in assistant chat. Users can ask it general questions and questions about navigating or using Convo. Convo AI should answer app questions from the official Convo knowledge base when available.",
  },
];

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "but",
  "by",
  "can",
  "do",
  "does",
  "for",
  "from",
  "how",
  "i",
  "in",
  "is",
  "it",
  "me",
  "my",
  "of",
  "on",
  "or",
  "should",
  "that",
  "the",
  "there",
  "this",
  "to",
  "what",
  "when",
  "where",
  "who",
  "will",
  "with",
  "you",
  "your",
]);

const normalize = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokenize = (value = "") =>
  normalize(value)
    .split(" ")
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));

const unique = (values) => [...new Set(values)];

const scoreKnowledgeEntry = (entry, queryTokens, normalizedQuery) => {
  const keywordTokens = entry.keywords.flatMap(tokenize);
  const titleTokens = tokenize(entry.title);
  const contentTokens = tokenize(entry.content);
  const searchableText = normalize(
    [entry.title, entry.keywords.join(" "), entry.content].join(" ")
  );

  let score = 0;

  entry.keywords.forEach((keyword) => {
    const normalizedKeyword = normalize(keyword);
    if (normalizedKeyword && normalizedQuery.includes(normalizedKeyword)) {
      score += normalizedKeyword.includes(" ") ? 16 : 8;
    }
  });

  const normalizedTitle = normalize(entry.title);
  if (normalizedTitle && normalizedQuery.includes(normalizedTitle)) score += 12;

  queryTokens.forEach((token) => {
    if (keywordTokens.includes(token)) score += 5;
    if (titleTokens.includes(token)) score += 3;
    if (contentTokens.includes(token)) score += 1;
    if (searchableText.includes(token)) score += 0.5;
  });

  return score;
};

export const retrieveConvoKnowledge = (question, history = [], limit = 6) => {
  const recentHistoryText = Array.isArray(history)
    ? history
        .slice(-4)
        .map((item) => item?.text || "")
        .join(" ")
    : "";
  const queryText = `${recentHistoryText} ${question}`;
  const queryTokens = unique(tokenize(queryText));
  const normalizedQuery = normalize(queryText);

  if (!queryTokens.length) return [];

  return convoKnowledgeBase
    .map((entry) => ({
      ...entry,
      score: scoreKnowledgeEntry(entry, queryTokens, normalizedQuery),
    }))
    .filter((entry) => entry.score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ score, ...entry }) => entry);
};

export const formatConvoKnowledge = (entries = []) =>
  entries
    .map((entry, index) => `${index + 1}. ${entry.title}: ${entry.content}`)
    .join("\n");
    
