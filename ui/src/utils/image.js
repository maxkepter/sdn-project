import apiClient from "../services/apiClient";

// Single source of truth for the backend base URL.
// Derive it from apiClient so this file always matches REACT_APP_API_URL
// without forcing callers to set a second env var.
const RAW_BASE = apiClient.defaults.baseURL || "/api/v1";

// Strip the trailing `/api/...` (or just `/api`) segment so we can prepend
// the host to relative upload paths like `/uploads/foo.jpg`.
//
// When the user is opening the built bundle via `file://` and no
// REACT_APP_API_URL was provided, RAW_BASE is "/api/v1" and replacing
// /\/api\/.*$/ yields an empty string. That empty base would otherwise
// produce `file:///A:/uploads/foo.jpg`. To keep things safe in that
// edge case, fall back to the current page's origin (when available)
// so images still try to load from the real web origin instead of the
// local filesystem.
const stripApiSegment = (base) => base.replace(/\/api(\/.*)?$/, "");

const originFromLocation =
  typeof window !== "undefined" && window.location
    ? `${window.location.protocol}//${window.location.host}`
    : "";

let API_BASE_URL = stripApiSegment(RAW_BASE);

// If REACT_APP_API_URL is an absolute URL (e.g. http://localhost:5000/api/v1)
// then keep its origin so images resolve against the backend directly.
if (/^https?:\/\//i.test(RAW_BASE)) {
  try {
    const u = new URL(RAW_BASE);
    API_BASE_URL = `${u.protocol}//${u.host}`;
  } catch {
    /* ignore — keep computed API_BASE_URL */
  }
}

// Same-origin fallback for the file:// case.
if (!API_BASE_URL && originFromLocation && !originFromLocation.startsWith("file:")) {
  API_BASE_URL = originFromLocation;
}

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
