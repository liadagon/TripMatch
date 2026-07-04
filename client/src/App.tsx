import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import "./App.css";

import NavigationBar from "./Components/NavigationBar";

import Welcome from "./Components/Welcome";
import PhoneLogin from "./Components/PhoneLogin";
import VerifyCode from "./Components/VerifyCode";
import Register from "./Components/Register";
import Questionnaire from "./Components/Questionnaire";
import Discover from "./Components/Discover";
import Likes from "./Components/Likes";
import Matches from "./Components/Matches";
import Chat from "./Components/Chat";
import Profile from "./Components/Profile";

function AppLayout() {
  const location = useLocation();

  // hide navbar on auth / landing screens
  const hideNavbar =
    location.pathname === "/" ||
    location.pathname === "/phone-login" ||
    location.pathname === "/verify-code" ||
    location.pathname === "/register";

  return (
    <>
      <Routes>
        {/* Public / Auth routes */}
        <Route path="/" element={<Welcome />} />
        <Route path="/phone-login" element={<PhoneLogin />} />
        <Route path="/verify-code" element={<VerifyCode />} />
        <Route path="/register" element={<Register />} />
        <Route path="/questionnaire" element={<Questionnaire />} />

        {/* App routes */}
        <Route path="/discover" element={<Discover />} />
        <Route path="/likes" element={<Likes />} />
        <Route path="/messages" element={<Matches />} />
        <Route path="/matches" element={<Matches />} />
        <Route path="/chat" element={<Navigate to="/matches" replace />} />
        <Route path="/chat/:userId" element={<Chat />} />
        <Route path="/profile" element={<Profile />} />

        {/* fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Navbar only for logged-in app screens */}
      {!hideNavbar && <NavigationBar />}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}
