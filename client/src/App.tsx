import { lazy, Suspense, type ReactNode } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import "./App.css";

import NavigationBar from "./Components/NavigationBar";
import ProtectedRoute from "./Components/ProtectedRoute";
import LoadingState from "./Components/LoadingState";
import { useAuth } from "./context/AuthContext";

const Welcome = lazy(() => import("./Components/Welcome"));
const EmailLogin = lazy(() => import("./Components/EmailLogin"));
const EmailOtpRequest = lazy(() => import("./Components/EmailOtpRequest"));
const EmailOtpVerify = lazy(() => import("./Components/EmailOtpVerify"));
const Register = lazy(() => import("./Components/Register"));
const PostLoginWelcome = lazy(
  () => import("./Components/PostLoginWelcome"),
);
const PhotoUpload = lazy(() => import("./Components/PhotoUpload"));
const Questionnaire = lazy(() => import("./Components/Questionnaire"));
const Discover = lazy(() => import("./Components/Discover"));
const Likes = lazy(() => import("./Components/Likes"));
const BoostReturn = lazy(() => import("./Components/BoostReturn"));
const Matches = lazy(() => import("./Components/Matches"));
const MatchesMap = lazy(() => import("./Components/MatchesMap"));
const Chat = lazy(() => import("./Components/Chat"));
const Profile = lazy(() => import("./Components/Profile"));
const BlockedUsers = lazy(() => import("./Components/BlockedUsers"));
const MyProfilePreview = lazy(
  () => import("./Components/MyProfilePreview"),
);
const MatchedProfile = lazy(() => import("./Components/MatchedProfile"));
const NotFound = lazy(() => import("./Components/NotFound"));

const protectedPage = (
  page: ReactNode,
  options: { allowIncomplete?: boolean; onboardingOnly?: boolean } = {},
) => (
  <ProtectedRoute {...options}>{page}</ProtectedRoute>
);

export default function App() {
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();

  const isApplicationScreen =
    location.pathname === "/discover" ||
    location.pathname === "/likes" ||
    location.pathname === "/messages" ||
    location.pathname === "/matches" ||
    location.pathname === "/matches-map" ||
    location.pathname === "/profile" ||
    location.pathname === "/profile-preview" ||
    location.pathname === "/boost/return" ||
    location.pathname === "/blocked-users" ||
    location.pathname.startsWith("/matched-profile/") ||
    location.pathname.startsWith("/chat/");

  return (
    <>
      <Suspense
        fallback={<LoadingState message="טוענים את העמוד..." fullScreen />}
      >
        <Routes>
          {/* Public / Auth routes */}
          <Route path="/" element={<Welcome />} />
          <Route path="/email-login" element={<EmailLogin />} />
          <Route path="/email-otp" element={<EmailOtpRequest />} />
          <Route path="/email-otp/verify" element={<EmailOtpVerify />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/post-login-welcome"
            element={protectedPage(<PostLoginWelcome />, {
              allowIncomplete: true,
              onboardingOnly: true,
            })}
          />
          <Route
            path="/photo-upload"
            element={protectedPage(<PhotoUpload />, {
              allowIncomplete: true,
              onboardingOnly: true,
            })}
          />
          <Route
            path="/questionnaire"
            element={protectedPage(<Questionnaire />, {
              allowIncomplete: true,
              onboardingOnly: true,
            })}
          />

          {/* App routes */}
          <Route path="/discover" element={protectedPage(<Discover />)} />
          <Route path="/likes" element={protectedPage(<Likes />)} />
          <Route
            path="/boost/return"
            element={protectedPage(<BoostReturn />)}
          />
          <Route path="/messages" element={protectedPage(<Matches />)} />
          <Route path="/matches" element={protectedPage(<Matches />)} />
          <Route
            path="/matches-map"
            element={protectedPage(<MatchesMap />)}
          />
          <Route path="/chat" element={<Navigate to="/matches" replace />} />
          <Route path="/chat/:userId" element={protectedPage(<Chat />)} />
          <Route
            path="/profile/setup"
            element={protectedPage(<Navigate to="/profile" replace />)}
          />
          <Route path="/profile" element={protectedPage(<Profile />)} />
          <Route
            path="/blocked-users"
            element={protectedPage(<BlockedUsers />)}
          />
          <Route
            path="/profile-preview"
            element={protectedPage(<MyProfilePreview />)}
          />
          <Route
            path="/matched-profile/:userId"
            element={protectedPage(<MatchedProfile />)}
          />

          {/* fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>

      {isAuthenticated && user?.registrationComplete && isApplicationScreen && (
        <NavigationBar />
      )}
    </>
  );
}
