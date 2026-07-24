import axios from 'axios';

// Create a pre-configured Axios client.
// By default, it hits the Express backend api/v1 route.
//
// baseURL resolution order:
//   1. REACT_APP_API_URL (injected at build time, e.g. "/api/v1" or
//      "http://localhost:5000/api/v1").
//   2. Same-origin "/api/v1" — works in dev (CRA proxy) and behind
//      ingress/nginx where /api/* is reverse-proxied to the backend.
//
// We intentionally do NOT fall back to a bare "/api/v1" when the page is
// loaded over the `file://` protocol: in that case the browser would
// resolve relative requests against the local filesystem and produce
// URLs like `file:///A:/api/v1/...` which obviously never reach the
// backend. Instead we surface a console warning and use the same-origin
// path so that opening the app via a local web server (or via the
// port-forwarded ingress) Just Works.
const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor injects bearer token from localStorage
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor cleans up credentials if unauthorized
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      // Optional: redirect to login page if appropriate
    }
    return Promise.reject(error);
  }
);

export default apiClient;
