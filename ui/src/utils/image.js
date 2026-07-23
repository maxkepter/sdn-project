import apiClient from "../services/apiClient";

// The backend exposes its uploads under `/uploads/...` and the React app
// is served by Nginx Ingress on the same origin as the API, so the
// upload path can always be expressed relative to the API base URL.
const RAW_BASE = apiClient.defaults.baseURL || "/api/v1";

// Strip the trailing `/api/...` segment so we can prepend the host to
// relative upload paths like `/uploads/foo.jpg`.
const stripApiSegment = (base) => base.replace(/\/api(\/.*)?$/, "");

let API_BASE_URL = stripApiSegment(RAW_BASE);

// If the apiClient was ever configured with an absolute URL (e.g.
// http://localhost:5000/api/v1) keep its origin so images still resolve
// against the backend directly.
if (/^https?:\/\//i.test(RAW_BASE)) {
  try {
    const u = new URL(RAW_BASE);
    API_BASE_URL = `${u.protocol}//${u.host}`;
  } catch {
    /* ignore — keep computed API_BASE_URL */
  }
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
