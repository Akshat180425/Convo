import dotenv from "dotenv";

dotenv.config();

const DEFAULT_CLIENT_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "https://convo-153s.onrender.com",
];

const splitOrigins = (value) =>
  value
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) || [];

export const getAllowedClientOrigins = () => {
  const envOrigins = splitOrigins(process.env.CLIENT_ORIGINS || process.env.CLIENT_URLS || process.env.CLIENT_URL);
  return [...new Set([...DEFAULT_CLIENT_ORIGINS, ...envOrigins])];
};

export const isAllowedClientOrigin = (origin) => !origin || getAllowedClientOrigins().includes(origin);
