import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";

import Welcome from "./pages/Welcome";
import PhoneLogin from "./pages/PhoneLogin";
import VerifyCode from "./pages/VerifyCode";
import Register from "./pages/Register";
import Questionnaire from "./pages/Questionnaire";
import Discover from "./pages/Discover";
import Likes from "./pages/Likes";
import Matches from "./pages/Matches";
import Chat from "./pages/Chat";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/phone-login" element={<PhoneLogin />} />
        <Route path="/verify-code" element={<VerifyCode />} />
        <Route path="/register" element={<Register />} />
        <Route path="/questionnaire" element={<Questionnaire />} />
        <Route path="/discover" element={<Discover />} />
        <Route path="/likes" element={<Likes />} />
        <Route path="/matches" element={<Matches />} />
        <Route path="/chat" element={<Chat />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}