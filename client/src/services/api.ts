import axios from "axios";
import { getAuthToken, removeAuthToken } from "./authTokenStorage";

export const TRIPMATCH_AUTH_EXPIRED_EVENT = "tripmatch:auth-expired";
export const API_REQUEST_TIMEOUT_MS = 60_000;
export const API_UPLOAD_TIMEOUT_MS = 120_000;

const API_TIMEOUT_MESSAGE =
  "התגובה מהשרת מתעכבת. ייתכן שהשרת מתעורר כעת; נסו שוב בעוד רגע.";
const API_NETWORK_MESSAGE =
  "לא ניתן להתחבר לשרת. בדקו את החיבור לאינטרנט ונסו שוב.";

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
  timeout: API_REQUEST_TIMEOUT_MS,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Maps response-less Axios failures to user-facing transport messages without masking API errors.
 * @param error Rejected request value.
 * @returns A localized timeout/network message, or null for handled HTTP responses.
 */
function getTransportErrorMessage(error: unknown) {
  if (!axios.isAxiosError(error) || error.response) return null;

  if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
    return API_TIMEOUT_MESSAGE;
  }

  if (error.code === "ERR_NETWORK") return API_NETWORK_MESSAGE;

  return null;
}

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
    const transportErrorMessage = getTransportErrorMessage(error);
    if (transportErrorMessage && axios.isAxiosError(error)) {
      error.message = transportErrorMessage;
    }

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

    // Expire only the session whose current token actually authorized this request;
    // a delayed 401 from an older account must not sign out its replacement.
    if (shouldExpireSession) {
      removeAuthToken();
      window.dispatchEvent(new Event(TRIPMATCH_AUTH_EXPIRED_EVENT));
    }

    return Promise.reject(error);
  },
);

export default api;
