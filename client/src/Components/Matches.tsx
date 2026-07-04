import { useNavigate } from "react-router-dom";
import { conversations, newMatches } from "../data/conversations";
import "./Matches.css";

export default function Matches() {
  const navigate = useNavigate();

  return (
    <div className="matches-page" dir="rtl">
      <header className="matches-topbar">
        <div className="matches-logo" dir="ltr">
          <span className="matches-logo-trip">Trip</span>
          <span className="matches-logo-match">Match</span>
        </div>
      </header>

      <main className="matches-shell">
        <header className="matches-header">
          <h1>הודעות</h1>
        </header>

        <section className="matches-scroll">
          <div className="matches-section-label">התאמות חדשות</div>

          <div className="matches-stories-row">
            {newMatches.map((match) => (
              <button
                key={match.id}
                className="matches-story"
                onClick={() => navigate(`/chat/${match.id}`)}
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
            {conversations.map((chat) => (
              <button
                key={chat.id}
                className={
                  chat.unread ? "matches-chat-card unread" : "matches-chat-card"
                }
                onClick={() => navigate(`/chat/${chat.id}`)}
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

                  <p
                    className={
                      chat.unread
                        ? "matches-preview unread"
                        : "matches-preview"
                    }
                  >
                    {chat.preview}
                  </p>
                </div>

                <div className="matches-percent">{chat.match}%</div>
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
