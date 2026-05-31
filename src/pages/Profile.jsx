import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const [tab, setTab] = useState("preferences");

  return (
    <div className="page profile-page">
      <header className="profile-header">
        <div className="profile-top">
          <button className="edit-button">✏️</button>

          <div className="profile-name-box">
            <h1>ליה</h1>
            <p>📍 רחובות</p>
          </div>

          <div className="profile-avatar">
            <img
              src="https://api.dicebear.com/8.x/lorelei/svg?seed=Noa&backgroundColor=b6e3f4"
              alt="ליה"
            />
            <span>!</span>
          </div>
        </div>

        <div className="photo-strip">
          <img
            src="https://api.dicebear.com/8.x/lorelei/svg?seed=Noa&backgroundColor=b6e3f4"
            alt=""
          />
          <img
            src="https://api.dicebear.com/8.x/lorelei/svg?seed=Maya&backgroundColor=ffd5dc"
            alt=""
          />
          <img
            src="https://api.dicebear.com/8.x/lorelei/svg?seed=Ido&backgroundColor=c0aede"
            alt=""
          />
          <button>＋</button>
        </div>

        <div className="tabs">
          <button
            className={tab === "preferences" ? "active" : ""}
            onClick={() => setTab("preferences")}
          >
            ⚙️ העדפות
          </button>

          <button
            className={tab === "settings" ? "active" : ""}
            onClick={() => setTab("settings")}
          >
            🔧 הגדרות
          </button>
        </div>
      </header>

      <main className="profile-content">
        <section className="profile-card">
          <div className="card-title-row">
            <h2>📋 השלמת פרופיל</h2>
            <strong>72%</strong>
          </div>

          <div className="mini-progress">
            <span style={{ width: "72%" }}></span>
          </div>

          <div className="profile-task done">
            <span>✓</span>
            <p>פרטים בסיסיים מלאים</p>
            <strong>הושלם</strong>
          </div>

          <div className="profile-task">
            <span>🖼</span>
            <p>להוסיף עוד תמונות</p>
            <strong>הוסיפי</strong>
          </div>

          <div className="profile-task">
            <span>❓</span>
            <p>לענות על עוד שאלות</p>
            <strong>עני</strong>
          </div>
        </section>

        <section className="profile-card dark-card">
          <h2>שאלות שענינו</h2>

          <div className="question-scale">
            <div>
              <strong>45</strong>
              <span>שאלות</span>
            </div>

            <div>
              <strong>100</strong>
              <span>אלופה</span>
            </div>

            <div>
              <strong>500+</strong>
              <span>עילוי</span>
            </div>
          </div>

          <div className="scale-track">
            <span style={{ width: "9%" }}></span>
          </div>

          <p>ככל שעונים על יותר שאלות, ההתאמות נעשות מדויקות יותר.</p>
        </section>

        <section className="question-box">
          <p>מענה על עוד שאלות</p>
          <h2>מה יותר חשוב לך בטיול משותף?</h2>

          <div>
            <button className="btn btn-primary">תכנון מראש</button>
            <button className="btn btn-outline">זרימה וספונטניות</button>
          </div>
        </section>
      </main>

      <BottomNav active="profile" />
    </div>
  );
}

function BottomNav({ active }) {
  const navigate = useNavigate();

  return (
    <nav className="bottom-nav">
      <button
        className={active === "discover" ? "active" : ""}
        onClick={() => navigate("/discover")}
      >
        <span>🔍</span>
        גילוי
      </button>

      <button
        className={active === "likes" ? "active" : ""}
        onClick={() => navigate("/likes")}
      >
        <span>♡</span>
        לייקים
      </button>

      <button
        className={active === "matches" ? "active" : ""}
        onClick={() => navigate("/matches")}
      >
        <span>💬</span>
        הודעות
      </button>

      <button
        className={active === "preferences" ? "active" : ""}
        onClick={() => navigate("/preferences")}
      >
        <span>⚙️</span>
        העדפות
      </button>

      <button
        className={active === "profile" ? "active" : ""}
        onClick={() => navigate("/profile")}
      >
        <span>👤</span>
        פרופיל
      </button>
    </nav>
  );
}