import { useNavigate } from "react-router-dom";
import "./welcome.css";

export default function Welcome() {
  const navigate = useNavigate();

  return (
    <main className="welcome-page" dir="rtl">
      <section className="welcome-shell">
        <div className="hero-wrap">
          <img src="/hero.png" alt="TripMatch" className="hero-img" />
        </div>

        <section className="welcome-card">
          <div className="handle"></div>

          <h1>
            מוצאים שותף או שותפה
            <br />
            לטיול הגדול שלך
          </h1>

          <p className="subtitle">
            התאמות חכמות לפי יעד, תאריכים, תקציב וסגנון טיול.
            כי כל מסע גדול מתחיל באנשים הנכונים.
          </p>

          <div className="features">
            <div className="feature">
              <strong>יעדים</strong>
              <span>התאמה לפי מסלול ויעד</span>
            </div>

            <div className="feature">
              <strong>תאריכים</strong>
              <span>התאמה לפי זמן וגמישות</span>
            </div>

            <div className="feature">
              <strong>שותפים</strong>
              <span>מטיילים עם תוכניות דומות</span>
            </div>

            <div className="feature">
              <strong>סגנון</strong>
              <span>התאמה לפי אופי הטיול</span>
            </div>
          </div>

          <button className="primary-btn" onClick={() => navigate("/phone-login")}>
            התחברות עם טלפון
          </button>

          <button className="outline-btn" onClick={() => navigate("/register")}>
            הרשמה
          </button>

          <div className="divider">או</div>

          <button className="email-btn" onClick={() => navigate("/discover")}>
            כניסה עם אימייל
          </button>

          <div className="note">
            <span>IL</span>
            <p>מיועד למטיילים ישראלים</p>
          </div>
        </section>
      </section>
    </main>
  );
}