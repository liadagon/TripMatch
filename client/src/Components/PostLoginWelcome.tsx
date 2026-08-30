import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getProfileCompletionPath } from "../utils/authNavigation";
import "./PostLoginWelcome.css";

/** Introduces newly authenticated users to the remaining onboarding flow. */
export default function PostLoginWelcome() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  function continueOnboarding() {
    navigate(user ? getProfileCompletionPath(user) : "/", { replace: true });
  }

  async function exitOnboarding() {
    await logout();
    navigate("/", { replace: true });
  }

  return (
    <main className="post-login-welcome-page" dir="rtl">
      <header className="post-login-welcome-header">
        <div className="post-login-welcome-logo" dir="ltr" aria-label="TripMatch">
          <span className="post-login-welcome-logo-trip">Trip</span>
          <span className="post-login-welcome-logo-match">Match</span>
        </div>

        <button
          type="button"
          className="post-login-welcome-back-button"
          onClick={() => void exitOnboarding()}
        >
          חזרה
        </button>
      </header>

      <section className="post-login-welcome-screen">
        <div className="post-login-welcome-card">
          <div className="post-login-welcome-icon" aria-hidden="true">
            <svg
              width="34"
              height="34"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21Z"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path
                d="M8.5 12.5L11 15L16 9"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div className="post-login-welcome-title">
            <h1>האימות הצליח</h1>

            <div
              className="post-login-welcome-brand-badge"
              dir="ltr"
              aria-label="TripMatch"
            >
              <span className="post-login-welcome-brand-trip">Trip</span>
              <span className="post-login-welcome-brand-match">Match</span>
            </div>
          </div>

          <p className="post-login-welcome-subtitle">
            נשארו עוד כמה שלבים להשלמת הפרופיל
            <br />
            לאחר מכן תוכלו להתחיל למצוא שותפים לטיול
          </p>

          <button
            type="button"
            className="post-login-welcome-continue-button"
            onClick={continueOnboarding}
          >
            המשך
          </button>
        </div>

        <div className="post-login-welcome-visual-card">
          <img
            src="/phone.png"
            alt="לטייל יחד, להתחבר בקלות"
            className="post-login-welcome-visual-image"
          />
        </div>
      </section>
    </main>
  );
}
