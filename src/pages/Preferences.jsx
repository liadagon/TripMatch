import { useNavigate } from "react-router-dom";

const sections = [
  {
    title: "מידע בסיסי",
    icon: "🔲",
    rows: [
      ["מגדר", "הכל"],
      ["גיל", "18–26"],
      ["מרחק", "עד 50 ק״מ"],
    ],
  },
  {
    title: "טיול",
    icon: "✈️",
    rows: [
      ["יעד מועדף", "דרום אמריקה"],
      ["חודש יציאה", "ספטמבר"],
      ["תקציב", "בינוני"],
      ["סגנון טיול", "תרמילאות"],
      ["סוג לינה", "הוסטל"],
      ["רמת תכנון", "בינונית"],
    ],
  },
  {
    title: "רקע וזהות",
    icon: "🌐",
    rows: [
      ["שפות", "הכל"],
      ["השכלה", "הכל"],
      ["תעסוקה", "הכל"],
    ],
  },
];

export default function Preferences() {
  return (
    <div className="page preferences-page">
      <header className="page-dark-header">
        <h1>השותפה האידיאלית לטיול</h1>
        <p>אנחנו מתעדפים המלצות שמבוססות על ההעדפות שלך.</p>
      </header>

      <main className="preferences-content">
        {sections.map((section) => (
          <section className="preference-section" key={section.title}>
            <h2>
              <span>{section.icon}</span>
              {section.title}
            </h2>

            <div className="preference-list">
              {section.rows.map(([label, value]) => (
                <button key={label} className="preference-row">
                  <span>{label}</span>

                  <strong>
                    {value}
                    <span className="chevron">‹</span>
                  </strong>
                </button>
              ))}
            </div>
          </section>
        ))}
      </main>

      <BottomNav active="preferences" />
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