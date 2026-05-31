import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Likes.css";

export default function Likes() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("interest");

  return (
    <div className="likes-page" dir="rtl">
      <main className="likes-shell">
        <header className="likes-header">
          <div className="likes-header-row">
            <button className="likes-boost-icon">⚡</button>
            <h1>לייקים</h1>
            <div className="likes-empty-space"></div>
          </div>

          <div className="likes-tabs">
            <button
              className={activeTab === "interest" ? "active" : ""}
              onClick={() => setActiveTab("interest")}
            >
              בעניין שלך
            </button>

            <button
              className={activeTab === "intro" ? "active" : ""}
              onClick={() => setActiveTab("intro")}
            >
              הודעות היכרות
            </button>

            <button
              className={activeTab === "liked" ? "active" : ""}
              onClick={() => setActiveTab("liked")}
            >
              עשית לייק
            </button>
          </div>
        </header>

        <section className="likes-content">
          {activeTab === "interest" && (
            <>
              <div className="likes-empty-state">
                <h2>אין לך לייקים עדיין</h2>
                <p>
                  מטיילים שאהבו את הפרופיל שלך יופיעו כאן. הם יכולים לעזור לך
                  למצוא שותפה מתאימה לטיול.
                </p>
              </div>

              <BoostCard />
            </>
          )}

          {activeTab === "intro" && (
            <>
              <div className="likes-empty-state">
                <h2>אין לך הודעות היכרות</h2>
                <p>הודעות פתיחה ממטיילים אחרים יופיעו כאן.</p>
              </div>

              <BoostCard />
            </>
          )}

          {activeTab === "liked" && (
            <>
              <div className="likes-empty-box">
                <div className="likes-heart">💗</div>
                <h2>זה הזמן לעשות לייקים!</h2>
                <p>
                  כל מי שקיבלה ממך לייק תופיע כאן עד שתיווצר התאמה או עד
                  שתמשיכי הלאה.
                </p>

                <button onClick={() => navigate("/discover")}>
                  מעבר להמלצות
                </button>
              </div>

              <BoostCard />
            </>
          )}
        </section>

        <nav className="likes-bottom-nav">
          <button onClick={() => navigate("/discover")}>
            <span>🔍</span>
            גילוי
          </button>

          <button className="active" onClick={() => navigate("/likes")}>
            <span>♥</span>
            לייקים
          </button>

          <button onClick={() => navigate("/matches")}>
            <span>💬</span>
            הודעות
          </button>

          <button onClick={() => navigate("/preferences")}>
            <span>⚙️</span>
            העדפות
          </button>

          <button onClick={() => navigate("/profile")}>
            <span>👤</span>
            פרופיל
          </button>
        </nav>
      </main>
    </div>
  );
}

function BoostCard() {
  return (
    <div className="likes-boost-card">
      <div className="likes-boost-avatar-wrap">
        <div className="likes-boost-avatar">🏔️</div>
        <span className="bolt tl">⚡</span>
        <span className="bolt tr">⚡</span>
        <span className="bolt bl">⚡</span>
        <span className="bolt br">⚡</span>
      </div>

      <h2>לתת לעצמך בוסט!</h2>

      <p>
        לקבל יום שלם של חשיפה למטיילים שמתכננים טיול דומה לשלך
      </p>

      <button>בוסט</button>

      <div className="likes-dots">
        <span></span>
        <span className="active"></span>
      </div>
    </div>
  );
}