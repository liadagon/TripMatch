import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import axios from "axios";
import {
  type AuthUser,
  emailLogin,
  getCurrentUser,
  type GoogleAuthenticationResult,
  googleLogin,
  registerUser,
  type RegisterPayload,
} from "../services/authService";
import { TRIPMATCH_TOKEN_KEY } from "../services/api";
import { signOutFromFirebase } from "../firebase";
import {
  updateCurrentProfile,
  type ProfileUpdatePayload,
} from "../services/profileService";

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (payload: RegisterPayload) => Promise<AuthUser>;
  authenticateWithGoogle: (
    idToken: string,
  ) => Promise<GoogleAuthenticationResult>;
  updateProfile: (payload: ProfileUpdatePayload) => Promise<AuthUser>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function restoreUser() {
      const token = localStorage.getItem(TRIPMATCH_TOKEN_KEY);

      if (!token) {
        if (isActive) setIsInitializing(false);
        return;
      }

      try {
        const response = await getCurrentUser();

        if (isActive && response.status === 200) {
          setUser(response.data.data);
        }
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          localStorage.removeItem(TRIPMATCH_TOKEN_KEY);

          if (isActive) {
            setUser(null);
          }
        }
      } finally {
        if (isActive) setIsInitializing(false);
      }
    }

    restoreUser();

    return () => {
      isActive = false;
    };
  }, []);

  async function login(email: string, password: string) {
    const response = await emailLogin(email, password);

    localStorage.setItem(TRIPMATCH_TOKEN_KEY, response.data.token);
    setUser(response.data.data);
    return response.data.data;
  }

  async function register(payload: RegisterPayload) {
    const response = await registerUser(payload);

    localStorage.setItem(TRIPMATCH_TOKEN_KEY, response.data.token);
    setUser(response.data.data);
    return response.data.data;
  }

  async function authenticateWithGoogle(idToken: string) {
    let response;

    try {
      response = await googleLogin(idToken);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("[Google auth] TripMatch token exchange failed", {
          url: error.config?.url,
          baseURL: error.config?.baseURL || "same-origin (Vite /api proxy)",
          status: error.response?.status,
          code: error.response?.data?.code,
          message: error.response?.data?.message || error.message,
        });
      } else {
        console.error("[Google auth] TripMatch token exchange failed", error);
      }

      throw error;
    }

    if (response.status !== 200) {
      throw new Error("Unexpected Google authentication response");
    }

    localStorage.setItem(TRIPMATCH_TOKEN_KEY, response.data.token);
    setUser(response.data.data);
    return {
      user: response.data.data,
      isNewUser: response.data.isNewUser,
    };
  }

  async function updateProfile(payload: ProfileUpdatePayload) {
    const updatedUser = await updateCurrentProfile(payload);
    setUser(updatedUser);
    return updatedUser;
  }

  async function logout() {
    localStorage.removeItem(TRIPMATCH_TOKEN_KEY);
    setUser(null);

    try {
      await signOutFromFirebase();
    } catch (error) {
      console.error("[Logout] Firebase session cleanup failed", error);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isInitializing,
        login,
        register,
        authenticateWithGoogle,
        updateProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
