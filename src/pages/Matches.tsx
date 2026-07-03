import { useNavigate } from "react-router-dom";
import "./Matches.css";

const newMatches = [
  {
    name: "נועה",
    image: "https://api.dicebear.com/8.x/lorelei/svg?seed=Noa&backgroundColor=b6e3f4",
  },
  {
    name: "מאיה",
    image: "https://api.dicebear.com/8.x/lorelei/svg?seed=Maya&backgroundColor=ffd5dc",
  },
  {
    name: "נועה",
    image: "https://api.dicebear.com/8.x/lorelei/svg?seed=Ido&backgroundColor=c0aede",
  },
  {
    name: "דניאל",
    image: "https://api.dicebear.com/8.x/lorelei/svg?seed=Daniel&backgroundColor=d1f4d1",
  },
];

const chats = [
  {
    name: "נועה",
    age: 23,
    time: "עכשיו",
    destination: "דרום אמריקה · ספטמבר עד דצמבר",
    preview: "היי! ראיתי שגם את מתכננת לטוס לפרו 🌎",
    match: 91,
    image: "https://api.dicebear.com/8.x/lorelei/svg?seed=Noa&backgroundColor=b6e3f4",
    unread: true,
  },
  {
    name: "מאיה",
    age: 22,
    time: "לפני 3 דק׳",
    destination: "הודו · אוקטובר עד ינואר",
    preview: "גם אני מתכננת להתחיל מגואה! 🙏",
    match: 88,
    image: "https://api.dicebear.com/8.x/lorelei/svg?seed=Maya&backgroundColor=ffd5dc",
    unread: true,
  },
  {
    name: "נועה",
    age: 24,
    time: "אתמול",
    destination: "תאילנד וויאטנם · יולי עד ספטמבר",
    preview: "נשמע מעולה, אבל עוד לא קניתי כרטיס...",
    match: 84,
    image: "https://api.dicebear.com/8.x/lorelei/svg?seed=Ido&backgroundColor=c0aede",
    online: true,
  },
  {
    name: "דניאל",
    age: 25,
    time: "שלשום",
    destination: "אוסטרליה · נובמבר עד פברואר",
    preview: "יש לי מכרים בסידני שיכולים לעזור 🦘",
    match: 79,
    image: "https://api.dicebear.com/8.x/lorelei/svg?seed=Daniel&backgroundColor=d1f4d1",
  },
];

export default function Matches() {
  const navigate = useNavigate();

  return (
    <div className="matches-page" dir="rtl">
      <main className="matches-shell">
        <header className="matches-header">
          <h1>הודעות</h1>
        </header>

        <section className="matches-scroll">
          <div className="matches-section-label">התאמות חדשות 🎉</div>

          <div className="matches-stories-row">
            {newMatches.map((match) => (
              <button
                key={match.name}
                className="matches-story"
                onClick={() => navigate("/chat")}
              >
                <div className="matches-story-ring">
                  <img src={match.image} alt={match.name} />
                </div>
                <span>{match.name}</span>
              </button>
            ))}
          </div>

          <div className="matches-section-label">שיחות פעילות</div>

          <div className="matches-chat-list">
            {chats.map((chat) => (
              <button
                key={chat.name}
                className="matches-chat-card"
                onClick={() => navigate("/chat")}
              >
                <div className="matches-avatar-wrap">
                  <img src={chat.image} alt={chat.name} />

                  {chat.unread && <span className="matches-unread-dot"></span>}
                  {chat.online && <span className="matches-online-dot"></span>}
                </div>

                <div className="matches-info">
                  <div className="matches-chat-top">
                    <h2>
                      {chat.name}, {chat.age}
                    </h2>
                    <span>{chat.time}</span>
                  </div>

                  <p className="matches-dest">✈️ {chat.destination}</p>

                  <p className={chat.unread ? "matches-preview unread" : "matches-preview"}>
                    {chat.preview}
                  </p>
                </div>

                <div className="matches-percent">{chat.match}%</div>
              </button>
            ))}
          </div>
        </section>

        <nav className="matches-bottom-nav">
          <button onClick={() => navigate("/discover")}>
            <span>🔍</span>
            גילוי
          </button>

          <button onClick={() => navigate("/likes")}>
            <span>♡</span>
            לייקים
          </button>

          <button className="active" onClick={() => navigate("/matches")}>
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