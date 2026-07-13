export const convoKnowledgeBase = [
  {
    id: "navigation_tabs",
    title: "Main Tabs",
    keywords: ["tab", "tabs", "friends", "groups", "requests", "add", "sidebar", "navigation"],
    content:
      "Convo has four main sidebar tabs: Friends, Groups, Requests, and Add. The tab names are shown as hover tooltips on the icons. Friends shows accepted friends, self-chat, favorite chats, and Convo AI. Groups shows group chats and group creation. Requests shows incoming and outgoing friend requests. Add lets users discover people and send friend requests.",
  },
  {
    id: "screen_layout",
    title: "Screen Layout",
    keywords: ["screen", "layout", "where", "position", "located", "left", "right", "top", "bottom", "sidebar", "chat area"],
    content:
      "Convo is arranged as a two-panel chat app. The sidebar is on the left and contains the app title, total unread count, tab icons, search, chat lists, group creation controls, and friend request tools depending on the active tab. The main chat area is on the right. When a chat is open, the chat header is at the top of the main area, the message history is in the middle, and the message composer is fixed at the bottom of the chat area. When no chat is selected, the right side shows the home/starred messages view.",
  },
  {
    id: "top_right_navigation",
    title: "Top-Right App Navigation",
    keywords: ["top right", "settings", "profile", "logout", "navbar", "account", "theme", "where is settings", "where is profile"],
    content:
      "Global account controls are in the top-right area of the app header/navigation. The Profile entry opens the signed-in user's own profile page. The Settings entry opens theme and appearance settings. The Logout control is also in this top navigation area. If a user asks where to change their profile, status, profile picture, theme, or account options, guide them to the top-right Profile or Settings controls.",
  },
  {
    id: "sidebar_layout",
    title: "Sidebar Layout",
    keywords: ["sidebar", "left", "tabs", "friends tab", "groups tab", "requests tab", "add tab", "search", "chat list", "unread"],
    content:
      "The left sidebar is the main navigation column. Near the top of the sidebar, Convo shows the Chats heading with the total unread count. Under it are the four icon-only tabs: Friends, Groups, Requests, and Add. Their names appear on hover. Below the tabs is the search box for the current list. The Friends tab list includes self-chat, Convo AI, favorite chats, and accepted friends. The Groups tab lists group chats and includes group creation controls. Unread counts for direct chats are associated with the Friends tab, unread group messages are associated with the Groups tab, and the total unread count appears near the Chats heading.",
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
    keywords: ["header", "top bar", "top", "block", "media", "button", "profile", "name", "chat name", "shared media", "where is media"],
    content:
      "The chat header is the top bar of the main chat area. On the left side of that header are the selected chat's avatar and name. Clicking the user's name/avatar opens that user's profile, and clicking a group name/avatar opens the Group Profile. On the right side of an individual chat header are icon-only buttons such as Media and Block/Unblock. The Media button opens the shared media collection for the current chat. Button labels appear through hover tooltips.",
  },
  {
    id: "chat_area_layout",
    title: "Chat Area Layout",
    keywords: ["chat area", "message area", "message history", "typing box", "composer", "input", "bottom", "top bar", "middle"],
    content:
      "Inside an open chat, the selected chat's header stays at the top of the chat area. Messages appear below it in the scrollable middle section. The message composer is at the bottom of the chat area, with attachment controls, audio recording controls, the text field, AI suggestions when available, and the send button. The chat area is separate from the left sidebar, so app-wide navigation happens on the left while conversation actions happen in the top and bottom parts of the right panel.",
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
    keywords: ["message", "actions", "hover", "star", "pin", "reply", "edit", "delete", "everyone", "yourself", "beside message", "right of message"],
    content:
      "Message action buttons appear only when hovering within the horizontal band of that message in the chat area. The buttons sit beside the message bubble: on the left side of the user's own sent messages and on the right side of received messages. Users can star, pin, reply to, forward, report, and delete messages. Senders can edit their own text messages and delete their own messages for everyone. Any participant can delete a message for themselves.",
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
    keywords: ["pin", "pinned", "message", "limit", "visible", "both", "group"],
    content:
      "Messages can be pinned in a chat. Pinned messages are shared at the conversation level: in a one-to-one chat, both people can see the pinned messages; in a group chat, all current group members can see them. Convo limits pinned messages to three per chat.",
  },
  {
    id: "media_collection",
    title: "Media Collection",
    keywords: ["media", "collection", "shared media", "top bar", "chat header", "photos", "videos", "audios", "audio", "files", "file", "document", "links", "image", "zoom"],
    content:
      "The media collection opens from the Media button in the top bar of the current chat, on the right side of the chat header. It has sections for Photos, Videos, Audios, Files, and Links. Photos are image messages from the current chat. Audios are recorded audio messages from the current chat. Files are document/file attachments shared in the current chat. Links are detected from message text. Clicking a photo opens it in a zoomed image view inside the media modal, with a back option to return to the collection.",
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
    keywords: ["group profile", "group name", "details", "created", "members", "member count", "group image", "scroll", "where is group profile"],
    content:
      "Clicking the group name or group avatar in the top chat header opens the Group Profile. It shows the group image near the top, followed by the group name, details, Group info, Created on date, and Number of Members. Clicking the member count expands the member list below the group info. The profile content can scroll so the member list can be browsed without losing access to the upper group details.",
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
    keywords: ["user profile", "profile", "status", "account info", "image", "avatar", "where is profile", "top right"],
    content:
      "A user profile shows the user's profile image or initials fallback, full name, status, and Account Info such as email and account creation date. Users can edit their own name, status, and profile image from their own profile page. The signed-in user's own profile is opened from the top-right Profile control. Another user's profile opens by clicking that user's name or avatar in a chat header, friend list, member list, or other linked user reference.",
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
    keywords: ["settings", "theme", "themes", "back", "appearance", "top right", "where is settings"],
    content:
      "The Settings page opens from the top-right Settings control in the app header/navigation. It lets users change the app theme and preview the appearance. The Settings page has a back option so users can return after changing settings.",
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
    
