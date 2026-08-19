import type { ReactNode } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import "./App.css";

import NavigationBar from "./Components/NavigationBar";

import Welcome from "./Components/Welcome";
import EmailLogin from "./Components/EmailLogin";
import PhoneLogin from "./Components/PhoneLogin";
import VerifyCode from "./Components/VerifyCode";
import Register from "./Components/Register";
import Questionnaire from "./Components/Questionnaire";
import PostLoginWelcome from "./Components/PostLoginWelcome";
import PhotoUpload from "./Components/PhotoUpload";
import Discover from "./Components/Discover";
import Likes from "./Components/Likes";
import Matches from "./Components/Matches";
import Chat from "./Components/Chat";
import Profile from "./Components/Profile";
import MyProfilePreview from "./Components/MyProfilePreview";
import MatchedProfile from "./Components/MatchedProfile";
import ProtectedRoute from "./Components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";

const protectedPage = (page: ReactNode) => (
  <ProtectedRoute>{page}</ProtectedRoute>
);

export default function App() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  const isApplicationScreen =
    location.pathname === "/discover" ||
    location.pathname === "/likes" ||
    location.pathname === "/messages" ||
    location.pathname === "/matches" ||
    location.pathname === "/profile" ||
    location.pathname === "/profile-preview" ||
    location.pathname.startsWith("/matched-profile/") ||
    location.pathname.startsWith("/chat/");

  return (
    <>
      <Routes>
        {/* Public / Auth routes */}
        <Route path="/" element={<Welcome />} />
        <Route path="/email-login" element={<EmailLogin />} />
        <Route path="/phone-login" element={<PhoneLogin />} />
        <Route path="/verify-code" element={<VerifyCode />} />
        <Route path="/register" element={<Register />} />
        <Route path="/post-login-welcome" element={<PostLoginWelcome />} />
        <Route path="/photo-upload" element={<PhotoUpload />} />
        <Route path="/questionnaire" element={<Questionnaire />} />

        {/* App routes */}
        <Route path="/discover" element={protectedPage(<Discover />)} />
        <Route path="/likes" element={protectedPage(<Likes />)} />
        <Route path="/messages" element={protectedPage(<Matches />)} />
        <Route path="/matches" element={protectedPage(<Matches />)} />
        <Route path="/chat" element={<Navigate to="/matches" replace />} />
        <Route path="/chat/:userId" element={protectedPage(<Chat />)} />
        <Route path="/profile" element={protectedPage(<Profile />)} />
        <Route
          path="/profile-preview"
          element={protectedPage(<MyProfilePreview />)}
        />
        <Route
          path="/matched-profile/:userId"
          element={protectedPage(<MatchedProfile />)}
        />

        {/* fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {isAuthenticated && isApplicationScreen && <NavigationBar />}
    </>
  );
}
