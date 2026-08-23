import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import axios from "axios";
import { flushSync } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  type AuthUser,
  type AuthenticationResult,
  deleteCurrentAccount,
  emailLogin,
  getCurrentUser,
  type GoogleAuthenticationResult,
  googleLogin,
  registerUser,
  verifyEmailOtp,
  type RegisterPayload,
} from "../services/authService";
import { TRIPMATCH_TOKEN_KEY } from "../services/api";
import { signOutFromFirebase } from "../firebase";
import {
  updateCurrentProfile,
  type ProfileUpdatePayload,
} from "../services/profileService";
import { clearDemoConversationState } from "../services/demoConversationState";
import { clearBoostPromoSnooze } from "../utils/boostPromoSnooze";
import { wasDocumentRestoredThroughHistory } from "../utils/browserHistorySession";
import LoadingState from "../Components/LoadingState";

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (payload: RegisterPayload) => Promise<AuthUser>;
  authenticateWithGoogle: (
    idToken: string,
  ) => Promise<GoogleAuthenticationResult>;
  authenticateWithEmailCode: (
    email: string,
    code: string,
  ) => Promise<AuthenticationResult>;
  updateProfile: (payload: ProfileUpdatePayload) => Promise<AuthUser>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [requiresInitialHistoryReauthentication] = useState(
    wasDocumentRestoredThroughHistory,
  );
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isDocumentTransitionPending, setIsDocumentTransitionPending] =
    useState(requiresInitialHistoryReauthentication);

  function clearLocalAuthenticatedSession() {
    localStorage.removeItem(TRIPMATCH_TOKEN_KEY);
    clearDemoConversationState();
    setUser(null);
  }

  async function clearAuthenticatedSession() {
    clearLocalAuthenticatedSession();

    try {
      await signOutFromFirebase();
    } catch (error) {
      console.error("[Logout] Firebase session cleanup failed", error);
    }
  }

  useEffect(() => {
    let isActive = true;

    async function restoreUser() {
      if (requiresInitialHistoryReauthentication) {
        await clearAuthenticatedSession();

        if (isActive) {
          navigate("/", { replace: true });
          setIsDocumentTransitionPending(false);
          setIsInitializing(false);
        }
        return;
      }

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
  }, [navigate, requiresInitialHistoryReauthentication]);

  useEffect(() => {
    function handlePageHide() {
      flushSync(() => {
        setIsDocumentTransitionPending(true);
      });
    }

    function handlePageShow(event: PageTransitionEvent) {
      if (!event.persisted) return;

      void (async () => {
        await clearAuthenticatedSession();
        navigate("/", { replace: true });
        setIsInitializing(false);
        setIsDocumentTransitionPending(false);
      })();
    }

    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [navigate]);

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
    const currentUserResponse = await getCurrentUser();
    const authoritativeUser = currentUserResponse.data.data;
    setUser(authoritativeUser);
    return {
      user: authoritativeUser,
      isNewUser: response.data.isNewUser,
    };
  }

  async function authenticateWithEmailCode(email: string, code: string) {
    const response = await verifyEmailOtp(email, code);

    localStorage.setItem(TRIPMATCH_TOKEN_KEY, response.data.token);
    const currentUserResponse = await getCurrentUser();
    const authoritativeUser = currentUserResponse.data.data;
    setUser(authoritativeUser);

    return {
      user: authoritativeUser,
      isNewUser: response.data.isNewUser,
    };
  }

  async function updateProfile(payload: ProfileUpdatePayload) {
    await updateCurrentProfile(payload);
    const currentUserResponse = await getCurrentUser();
    const authoritativeUser = currentUserResponse.data.data;
    setUser(authoritativeUser);
    return authoritativeUser;
  }

  async function logout() {
    await clearAuthenticatedSession();
  }

  async function deleteAccount() {
    await deleteCurrentAccount();

    localStorage.removeItem(TRIPMATCH_TOKEN_KEY);
    clearDemoConversationState();
    clearBoostPromoSnooze();
    setUser(null);

    try {
      await signOutFromFirebase();
    } catch (error) {
      console.error("[Account deletion] Firebase session cleanup failed", error);
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
        authenticateWithEmailCode,
        updateProfile,
        logout,
        deleteAccount,
      }}
    >
      {isDocumentTransitionPending ? (
        <LoadingState message="מאבטחים את החיבור שלך..." fullScreen />
      ) : (
        children
      )}
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
