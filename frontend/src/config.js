const rawUrl = process.env.REACT_APP_API_URL || "http://localhost:5000";
let cleanUrl = rawUrl.trim().replace(/\/$/, "");

// Strip accidental /api or /api/v1 suffixes from the environment variable
if (cleanUrl.endsWith("/api/v1")) {
    cleanUrl = cleanUrl.slice(0, -7);
} else if (cleanUrl.endsWith("/api")) {
    cleanUrl = cleanUrl.slice(0, -4);
}

export const API_BASE_URL = cleanUrl;