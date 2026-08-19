import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  signInWithGoogle,
  getGoogleAuthErrorMessage,
} from "../firebase";
import { useAuth } from "../context/AuthContext";
import "./welcome.css";

const heroImages = [
  "/pic2.png",
  "/pic3.png",
  "/pic4.png",
  "/pic5.png",
];

export default function Welcome() {
  const navigate = useNavigate();
  const { authenticateWithGoogle } = useAuth();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [googleError, setGoogleError] = useState("");
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentImageIndex((previousIndex) => {
        return (previousIndex + 1) % heroImages.length;
      });
    }, 10000);

    return () => clearInterval(intervalId);
  }, []);

  const handleGoogleLogin = async () => {
    setGoogleError("");
    setIsGoogleLoading(true);

    try {
      const { idToken } = await signInWithGoogle();
      await authenticateWithGoogle(idToken);
      navigate("/post-login-welcome");
    } catch (error) {
      console.error("Google login failed:", error);

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 400) {
          setGoogleError(
            "כתובת האימייל הזו כבר רשומה באמצעות שיטת התחברות אחרת.",
          );
        } else if (error.response?.status === 401) {
          setGoogleError(
            "לא הצלחנו לאמת את חשבון Google. נסי להתחבר מחדש.",
          );
        } else if (!error.response) {
          setGoogleError(
            "לא ניתן להתחבר לשרת TripMatch. בדקי את החיבור ונסי שוב.",
          );
        } else {
          setGoogleError(
            "שירות ההתחברות אינו זמין כרגע. נסי שוב מאוחר יותר.",
          );
        }
      } else {
        setGoogleError(getGoogleAuthErrorMessage(error));
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <main className="welcome-page" dir="rtl">
      <header className="top-bar">
        <div className="site-logo" dir="ltr">
          Trip<span>Match</span>
        </div>

        <button className="top-login" onClick={() => navigate("/email-login")}>
          כניסה לחשבון
        </button>
      </header>

      <section className="welcome-screen">
        <div className="image-side">
          <img
            key={heroImages[currentImageIndex]}
            className="hero-image"
            src={heroImages[currentImageIndex]}
            alt="TripMatch travelers"
          />
        </div>

        <div className="content-side">
          <div className="login-card">
            <p className="tagline">לטייל יחד, בלי להתחיל לבד</p>

            <h1>
              מוצאים שותף או שותפה
              <br />
              לטיול הגדול שלך
            </h1>

            <p className="subtitle">
              התאמות למטיילים ישראלים לפי יעד, תאריכים וסגנון טיול.
            </p>

            <button
              className="main-action-btn"
              onClick={() => navigate("/phone-login")}
            >
              המשך עם טלפון
            </button>

            <button
              className="google-login-btn"
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading}
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.46H12v4.65h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.87c2.27-2.09 3.58-5.17 3.58-8.82z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.94-2.91l-3.87-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.95H1.27v3.1A12 12 0 0 0 12 24z"/>
                <path fill="#FBBC05" d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58v-3.1H1.27a12 12 0 0 0 0 10.78l4-3.1z"/>
                <path fill="#EA4335" d="M12 4.75c1.76 0 3.34.6 4.58 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.61l4 3.1C6.22 6.87 8.87 4.75 12 4.75z"/>
              </svg>
              <span>{isGoogleLoading ? "מתחבר..." : "המשך עם Google"}</span>
            </button>

            {googleError && <p className="google-error">{googleError}</p>}

            <p className="note">מיועד למטיילים ישראלים</p>
          </div>
        </div>
      </section>
    </main>
  );
}
