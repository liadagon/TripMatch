import axios from "axios";

export const TRIPMATCH_TOKEN_KEY = "tripmatch_token";
export const TRIPMATCH_AUTH_EXPIRED_EVENT = "tripmatch:auth-expired";

const AUTH_ENDPOINTS_HANDLED_BY_CALLER = new Set([
  "/api/auth/google",
  "/api/auth/email/request-code",
  "/api/auth/email/verify-code",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/me",
]);

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TRIPMATCH_TOKEN_KEY);
  const isGoogleAuthenticationRequest = config.url === "/api/auth/google";

  if (token && !isGoogleAuthenticationRequest) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestPath = String(error.config?.url || "").split("?")[0];
    const shouldExpireSession =
      error.response?.status === 401 &&
      !AUTH_ENDPOINTS_HANDLED_BY_CALLER.has(requestPath);

    if (shouldExpireSession) {
      localStorage.removeItem(TRIPMATCH_TOKEN_KEY);
      window.dispatchEvent(new Event(TRIPMATCH_AUTH_EXPIRED_EVENT));
    }

    return Promise.reject(error);
  },
);

export default api;
