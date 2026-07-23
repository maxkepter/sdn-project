import apiClient from "../services/apiClient";

// Single source of truth for the backend base URL.
// Derive it from apiClient so this file always matches REACT_APP_API_URL
// without forcing callers to set a second env var.
const RAW_BASE = apiClient.defaults.baseURL || "http://localhost:5000/api/v1";
const API_BASE_URL = RAW_BASE.replace(/\/api\/.*$/, "");

/**
 * Resolve a backend-relative image path into a fully qualified URL.
 *
 * Behavior:
 *   - null / undefined / ""  -> null  (let the caller render a fallback)
 *   - http(s)://...          -> returned as-is
 *   - data: or blob: URLs    -> returned as-is
 *   - /uploads/foo.jpg       -> `${API_BASE_URL}/uploads/foo.jpg`
 *   - uploads/foo.jpg        -> `${API_BASE_URL}/uploads/foo.jpg`
 */
export function resolveImageUrl(img) {
  if (!img) return null;
  if (typeof img !== "string") return null;

  const trimmed = img.trim();
  if (!trimmed) return null;

  // Already absolute or inline data — keep as-is.
  if (
    /^https?:\/\//i.test(trimmed) ||
    /^data:/i.test(trimmed) ||
    /^blob:/i.test(trimmed)
  ) {
    return trimmed;
  }

  // Normalize: ensure single leading slash before concat.
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${API_BASE_URL}${path}`;
}

export { API_BASE_URL };
