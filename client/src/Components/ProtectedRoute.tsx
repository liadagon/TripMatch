import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getOnboardingRouteRedirect } from "../utils/authNavigation";
import LoadingState from "./LoadingState";

type ProtectedRouteProps = {
  allowIncomplete?: boolean;
  onboardingOnly?: boolean;
  children: ReactNode;
};

/** Enforces authentication and server-derived onboarding route access. */
export default function ProtectedRoute({
  allowIncomplete = false,
  onboardingOnly = false,
  children,
}: ProtectedRouteProps) {
  const location = useLocation();
  const { isAuthenticated, isInitializing, user } = useAuth();

  if (isInitializing) {
    return <LoadingState message="בודקים את החיבור שלך..." fullScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  if (user) {
    const redirect = getOnboardingRouteRedirect(user, location.pathname, {
      allowIncomplete,
      onboardingOnly,
    });

    if (redirect) {
      return <Navigate to={redirect} replace />;
    }
  }

  return children;
}
