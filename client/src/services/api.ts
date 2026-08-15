import axios from "axios";

export const TRIPMATCH_TOKEN_KEY = "tripmatch_token";

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

export default api;
