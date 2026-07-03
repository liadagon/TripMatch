import { useNavigate } from "react-router-dom";
import "./Matches.css";

const demoProfileImages = {
  noa: [
    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=90",
    "/noa1.png",
    "/noa2.png",
  ],
  maya: [
    "/maya3.png",
    "/maya1.png",
    "/maya2.png",
  ],
  traveler: [
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=1200&q=90",
    "/ido1.png",
    "/ido2.png",
  ],
  daniel: [
    "https://api.dicebear.com/8.x/lorelei/svg?seed=Daniel&backgroundColor=d1f4d1",
  ],
};

const newMatches = [
  {
    name: "נועה",
    images: demoProfileImages.noa,
  },
  {
    name: "מאיה",
    images: demoProfileImages.maya,
  },
  {
    name: "עידו",
    images: demoProfileImages.traveler,
  },
  {
    name: "דניאל",
    images: demoProfileImages.daniel,
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
    images: demoProfileImages.noa,
    unread: true,
  },
  {
    name: "מאיה",
    age: 22,
    time: "לפני 3 דק׳",
    destination: "הודו · אוקטובר עד ינואר",
    preview: "גם אני מתכננת להתחיל מגואה! 🙏",
    match: 88,
    images: demoProfileImages.maya,
    unread: true,
  },
  {
    name: "עידו",
    age: 24,
    time: "אתמול",
    destination: "תאילנד וויאטנם · יולי עד ספטמבר",
    preview: "נשמע מעולה, אבל עוד לא קניתי כרטיס...",
    match: 84,
    images: demoProfileImages.traveler,
    online: true,
  },
  {
    name: "דניאל",
    age: 25,
    time: "שלשום",
    destination: "אוסטרליה · נובמבר עד פברואר",
    preview: "יש לי מכרים בסידני שיכולים לעזור 🦘",
    match: 79,
    images: demoProfileImages.daniel,
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
            {newMatches.map((match, index) => (
              <button
                key={`${match.name}-${index}`}
                className="matches-story"
                onClick={() => navigate("/chat")}
              >
                <div className="matches-story-ring">
                  <img src={match.images[0]} alt={match.name} />
                </div>
                <span>{match.name}</span>
              </button>
            ))}
          </div>

          <div className="matches-section-label">שיחות פעילות</div>

          <div className="matches-chat-list">
            {chats.map((chat, index) => (
              <button
                key={`${chat.name}-${index}`}
                className={chat.unread ? "matches-chat-card unread" : "matches-chat-card"}
                onClick={() => navigate("/chat")}
              >
                <div className="matches-avatar-wrap">
                  <img src={chat.images[0]} alt={chat.name} />

                  {chat.unread && <span className="matches-unread-dot"></span>}
                  {chat.online && <span className="matches-online-dot"></span>}
                </div>

                <div className="matches-info">
                  <div className="matches-chat-top">
                    <h2>
                      {chat.name}, {chat.age}
                    </h2>
                    {chat.time && <span>{chat.time}</span>}
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