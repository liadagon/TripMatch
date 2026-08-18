import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { conversations } from "../data/conversations";
import { useAuth } from "../context/AuthContext";
import { getMatches } from "../services/matchService";
import "./Matches.css";

type DisplayMatch = {
  id: string;
  userId: string;
  name: string;
  image: string;
};

export default function Matches() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [matches, setMatches] = useState<DisplayMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadMatches() {
      try {
        const records = await getMatches();

        if (!isActive) return;

        setMatches(
          records.flatMap((record) => {
            const otherUser = record.users.find(
              (matchUser) => matchUser._id !== user?._id,
            );

            return otherUser
              ? [{
                  id: record._id,
                  userId: otherUser._id,
                  name: otherUser.name,
                  image: otherUser.photoURL || otherUser.photo || "/pic2.png",
                }]
              : [];
          }),
        );
      } catch {
        if (isActive) setLoadError("לא הצלחנו לטעון את ההתאמות");
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    void loadMatches();
    return () => {
      isActive = false;
    };
  }, [user?._id]);

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
            {!isLoading && !loadError && matches.length === 0 && (
              <p className="matches-empty-state">עדיין אין התאמות חדשות</p>
            )}
            {loadError && <p className="matches-empty-state">{loadError}</p>}
            {matches.map((match) => (
              <button
                key={match.id}
                className="matches-story"
                onClick={() => navigate(`/chat/${match.userId}`)}
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
