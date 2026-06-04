import { useNavigate } from "react-router-dom";
import "./welcome.css";

export default function Welcome() {
  const navigate = useNavigate();

  return (
    <main className="welcome-page" dir="rtl">
      <header className="top-bar">
        <div className="site-logo" dir="ltr">
          Trip<span>Match</span>
        </div>

        <button className="top-login" onClick={() => navigate("/phone-login")}>
          כניסה לחשבון
        </button>
      </header>

      <section className="welcome-screen">
        <div className="image-side">
          <img src="/hero.png" alt="TripMatch travelers" />
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
              התחברות עם טלפון
            </button>

            <div className="signup-row">
              <span>אין לך חשבון?</span>

              <button
                className="signup-link"
                onClick={() => navigate("/register")}
              >
                הרשמה
              </button>
            </div>

            <p className="note">מיועד למטיילים ישראלים</p>
          </div>
        </div>
      </section>
    </main>
  );
}