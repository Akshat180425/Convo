export function formatMessageTime(date) {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export const formatDay = (dateStr) => {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (d1, d2) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  if (isSameDay(date, today)) return "Today";
  if (isSameDay(date, yesterday)) return "Yesterday";

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const formatLastSeen = (dateStr) => {
  if (!dateStr) return "Offline";

  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return "Last seen just now";
  if (diffMinutes < 60) return `Last seen ${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Last seen ${diffHours}h ago`;

  return `Last seen ${date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  })}`;
};

export const formatFileSize = (bytes = 0) => {
  const size = Number(bytes) || 0;
  if (size <= 0) return "";

  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  const value = size / 1024 ** index;

  return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
};

export const getFileDownloadUrl = (file = {}) => {
  const url = file.downloadUrl || file.url || "";
  if (!url || file.downloadUrl || !url.includes("/upload/")) return url;

  return url.replace("/upload/", "/upload/fl_attachment/");
};

const API_BASE_URL = import.meta.env.MODE === "development" ? "http://localhost:5001/api" : "/api";

export const getMessageFileDownloadUrl = (messageId) =>
  `${API_BASE_URL}/messages/files/${messageId}/download`;

export const getInitials = (name = "") => {
  const names = name.trim().split(" ");
  if (names.length === 0) return "";
  if (names.length === 1) return names[0][0].toUpperCase();
  return (names[0][0] + names[1][0]).toUpperCase();
};

export const getColorFromName = (name = "") => {
  const colors = [
    "#f44336", "#e91e63", "#9c27b0", "#673ab7", "#3f51b5",
    "#2196f3", "#03a9f4", "#00bcd4", "#009688", "#4caf50",
    "#8bc34a", "#cddc39", "#ffeb3b", "#ffc107", "#ff9800",
    "#ff5722", "#795548", "#607d8b",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};
