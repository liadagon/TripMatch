import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import axios from "axios";
import { flushSync } from "react-dom";
import { useDispatch } from "react-redux";
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
import {
  TRIPMATCH_AUTH_EXPIRED_EVENT,
} from "../services/api";
import {
  getAuthToken,
  removeAuthToken,
  removeLegacyLocalAuthToken,
  setAuthToken,
} from "../services/authTokenStorage";
import { signOutFromFirebase } from "../firebase";
import {
  updateCurrentProfile,
  type ProfileUpdatePayload,
} from "../services/profileService";
import { clearDemoConversationState } from "../services/demoConversationState";
import { clearBoostPromoSnooze } from "../utils/boostPromoSnooze";
import { wasDocumentRestoredThroughHistory } from "../utils/browserHistorySession";
import LoadingState from "../Components/LoadingState";
import AuthRestorationError from "../Components/AuthRestorationError";
import type { AuthenticationIntent } from "../utils/authNavigation";
import { resetConversations } from "../store/conversationsSlice";
import type { AppDispatch } from "../store/store";

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (payload: RegisterPayload) => Promise<AuthUser>;
  authenticateWithGoogle: (
    idToken: string,
    intent: AuthenticationIntent,
  ) => Promise<GoogleAuthenticationResult>;
  authenticateWithEmailCode: (
    email: string,
    code: string,
    intent: AuthenticationIntent,
  ) => Promise<AuthenticationResult>;
  updateProfile: (payload: ProfileUpdatePayload) => Promise<AuthUser>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

class AuthenticationSupersededError extends Error {
  constructor() {
    super("A newer authentication attempt replaced this request");
    this.name = "AuthenticationSupersededError";
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const [requiresInitialHistoryReauthentication] = useState(
    wasDocumentRestoredThroughHistory,
  );
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [authRestorationFailed, setAuthRestorationFailed] = useState(false);
  const [isDocumentTransitionPending, setIsDocumentTransitionPending] =
    useState(requiresInitialHistoryReauthentication);
  const authRevisionRef = useRef(0);
  const previousAuthenticatedUserIdRef = useRef<string | null>(null);

  function resetUserSpecificState(userId = user?._id) {
    dispatch(resetConversations());
    clearDemoConversationState(userId);
    clearBoostPromoSnooze();
  }

  function clearLocalAuthenticatedSession() {
    removeAuthToken();
    setUser(null);
    resetUserSpecificState();
  }

  /**
   * Invalidates older auth work and clears every account-scoped client state store.
   * @returns The revision that a subsequent async response must still match.
   */
  function beginAuthenticationAttempt() {
    authRevisionRef.current += 1;
    clearLocalAuthenticatedSession();
    return authRevisionRef.current;
  }

  function isCurrentAuthenticationAttempt(revision: number, token?: string) {
    return authRevisionRef.current === revision &&
      (token === undefined || getAuthToken() === token);
  }

  async function signOutFirebaseForAccountReplacement() {
    try {
      await signOutFromFirebase();
    } catch (error) {
      console.error("[Authentication] Firebase session cleanup failed", error);
    }
  }

  async function clearAuthenticatedSession() {
    beginAuthenticationAttempt();
    await signOutFirebaseForAccountReplacement();
  }

  /**
   * Stores a new JWT, reloads its authoritative user, and rejects stale account-switch responses.
   * @param token TripMatch JWT returned by a successful authentication endpoint.
   * @param revision Authentication attempt that owns the response.
   * @returns The server-restored authenticated user.
   * @throws AuthenticationSupersededError when a newer login or logout has won the race.
   */
  async function establishAuthenticatedSession(token: string, revision: number) {
    if (!isCurrentAuthenticationAttempt(revision)) {
      throw new AuthenticationSupersededError();
    }

    setAuthToken(token);

    try {
      const currentUserResponse = await getCurrentUser(token);

      if (!isCurrentAuthenticationAttempt(revision, token)) {
        throw new AuthenticationSupersededError();
      }

      const authoritativeUser = currentUserResponse.data.data;
      setUser(authoritativeUser);
      return authoritativeUser;
    } catch (error) {
      if (isCurrentAuthenticationAttempt(revision, token)) {
        removeAuthToken();
        setUser(null);
        dispatch(resetConversations());
      }
      throw error;
    }
  }

  useEffect(() => {
    let isActive = true;
    const revision = ++authRevisionRef.current;

    async function restoreUser() {
      removeLegacyLocalAuthToken();

      if (requiresInitialHistoryReauthentication) {
        await clearAuthenticatedSession();

        if (isActive) {
          navigate("/", { replace: true });
          setIsDocumentTransitionPending(false);
          setIsInitializing(false);
        }
        return;
      }

      const token = getAuthToken();

      if (!token) {
        if (isActive) setIsInitializing(false);
        return;
      }

      try {
        const response = await getCurrentUser(token);

        if (
          isActive &&
          response.status === 200 &&
          isCurrentAuthenticationAttempt(revision, token)
        ) {
          setUser(response.data.data);
        }
      } catch (error) {
        if (
          axios.isAxiosError(error) &&
          error.response?.status === 401 &&
          isCurrentAuthenticationAttempt(revision, token)
        ) {
          removeAuthToken();

          if (isActive) {
            setUser(null);
            dispatch(resetConversations());
          }
        } else if (
          isActive &&
          isCurrentAuthenticationAttempt(revision, token)
        ) {
          setAuthRestorationFailed(true);
        }
      } finally {
        if (isActive) setIsInitializing(false);
      }
    }

    restoreUser();

    return () => {
      isActive = false;
    };
  }, [dispatch, navigate, requiresInitialHistoryReauthentication]);

  useEffect(() => {
    function handleExpiredSession() {
      beginAuthenticationAttempt();
      navigate("/", { replace: true });
    }

    window.addEventListener(TRIPMATCH_AUTH_EXPIRED_EVENT, handleExpiredSession);
    return () => {
      window.removeEventListener(TRIPMATCH_AUTH_EXPIRED_EVENT, handleExpiredSession);
    };
  }, [navigate]);

  useEffect(() => {
    const authenticatedUserId = user?._id ?? null;

    if (previousAuthenticatedUserIdRef.current !== authenticatedUserId) {
      dispatch(resetConversations());
      previousAuthenticatedUserIdRef.current = authenticatedUserId;
    }
  }, [dispatch, user?._id]);

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
    const revision = beginAuthenticationAttempt();
    await signOutFirebaseForAccountReplacement();
    if (!isCurrentAuthenticationAttempt(revision)) {
      throw new AuthenticationSupersededError();
    }
    const response = await emailLogin(email, password);
    return establishAuthenticatedSession(response.data.token, revision);
  }

  async function register(payload: RegisterPayload) {
    const revision = beginAuthenticationAttempt();
    await signOutFirebaseForAccountReplacement();
    if (!isCurrentAuthenticationAttempt(revision)) {
      throw new AuthenticationSupersededError();
    }
    const response = await registerUser(payload);
    return establishAuthenticatedSession(response.data.token, revision);
  }

  async function authenticateWithGoogle(
    idToken: string,
    intent: AuthenticationIntent,
  ) {
    const revision = beginAuthenticationAttempt();
    let response;

    try {
      response = await googleLogin(idToken, intent);
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

      if (isCurrentAuthenticationAttempt(revision)) {
        await signOutFirebaseForAccountReplacement();
      }
      throw error;
    }

    if (response.status !== 200) {
      await signOutFirebaseForAccountReplacement();
      throw new Error("Unexpected Google authentication response");
    }

    const authoritativeUser = await establishAuthenticatedSession(
      response.data.token,
      revision,
    );
    return {
      user: authoritativeUser,
      isNewUser: response.data.isNewUser,
    };
  }

  async function authenticateWithEmailCode(
    email: string,
    code: string,
    intent: AuthenticationIntent,
  ) {
    const revision = beginAuthenticationAttempt();
    await signOutFirebaseForAccountReplacement();
    if (!isCurrentAuthenticationAttempt(revision)) {
      throw new AuthenticationSupersededError();
    }
    const response = await verifyEmailOtp(email, code, intent);

    const authoritativeUser = await establishAuthenticatedSession(
      response.data.token,
      revision,
    );

    return {
      user: authoritativeUser,
      isNewUser: response.data.isNewUser,
    };
  }

  /**
   * Persists profile changes and refreshes identity only if the same session remains active.
   * @param payload Allowed profile fields sent to the backend.
   * @returns The refreshed authoritative user.
   * @throws AuthenticationSupersededError when the account changes during the refresh.
   */
  async function updateProfile(payload: ProfileUpdatePayload) {
    const revision = authRevisionRef.current;
    const token = getAuthToken();
    const authenticatedUserId = user?._id;

    if (!token || !authenticatedUserId) {
      throw new Error("An authenticated session is required");
    }

    await updateCurrentProfile(payload);
    const currentUserResponse = await getCurrentUser(token);

    if (
      !isCurrentAuthenticationAttempt(revision, token) ||
      user?._id !== authenticatedUserId
    ) {
      throw new AuthenticationSupersededError();
    }

    const authoritativeUser = currentUserResponse.data.data;
    setUser(authoritativeUser);
    return authoritativeUser;
  }

  async function logout() {
    await clearAuthenticatedSession();
  }

  async function deleteAccount() {
    const deletedUserId = user?._id;
    await deleteCurrentAccount();

    authRevisionRef.current += 1;
    removeAuthToken();
    clearDemoConversationState(deletedUserId);
    clearBoostPromoSnooze();
    dispatch(resetConversations());
    setUser(null);

    await signOutFirebaseForAccountReplacement();
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
      {authRestorationFailed ? (
        <AuthRestorationError />
      ) : isDocumentTransitionPending ? (
        <LoadingState message="מאבטחים את החיבור שלך..." fullScreen />
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

/**
 * Reads the active authentication context.
 * @returns Session state and account lifecycle actions from the nearest provider.
 * @throws When rendered outside `AuthProvider`.
 */
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
