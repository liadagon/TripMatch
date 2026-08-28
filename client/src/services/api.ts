import axios from "axios";
import { getAuthToken, removeAuthToken } from "./authTokenStorage";

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
  const token = getAuthToken();
  const isGoogleAuthenticationRequest = config.url === "/api/auth/google";

  if (token && !isGoogleAuthenticationRequest && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestPath = String(error.config?.url || "").split("?")[0];
    const currentToken = getAuthToken();
    const requestAuthorization = String(
      error.config?.headers?.Authorization || "",
    );
    const shouldExpireSession =
      error.response?.status === 401 &&
      !AUTH_ENDPOINTS_HANDLED_BY_CALLER.has(requestPath) &&
      Boolean(currentToken) &&
      requestAuthorization === `Bearer ${currentToken}`;

    if (shouldExpireSession) {
      removeAuthToken();
      window.dispatchEvent(new Event(TRIPMATCH_AUTH_EXPIRED_EVENT));
    }

    return Promise.reject(error);
  },
);

export default api;
