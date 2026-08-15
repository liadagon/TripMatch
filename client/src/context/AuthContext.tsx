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
  getCurrentUser,
  googleLogin,
} from "../services/authService";
import { TRIPMATCH_TOKEN_KEY } from "../services/api";

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  authenticateWithGoogle: (idToken: string) => Promise<AuthUser>;
  logout: () => void;
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

  async function authenticateWithGoogle(idToken: string) {
    const response = await googleLogin(idToken);

    if (response.status !== 200) {
      throw new Error("Unexpected Google authentication response");
    }

    localStorage.setItem(TRIPMATCH_TOKEN_KEY, response.data.token);
    setUser(response.data.data);
    return response.data.data;
  }

  function logout() {
    localStorage.removeItem(TRIPMATCH_TOKEN_KEY);
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isInitializing,
        authenticateWithGoogle,
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
