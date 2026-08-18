import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getMatches } from "../services/matchService";
import {
  getConversations,
  getConversationWithUser,
} from "../services/conversationService";
import "./Matches.css";

type DisplayMatch = {
  id: string;
  userId: string;
  name: string;
  image: string;
};

type DisplayConversation = {
  id: string;
  name: string;
  age: number;
  destination: string;
  preview: string;
  image: string;
  time: string;
};

export default function Matches() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [matches, setMatches] = useState<DisplayMatch[]>([]);
  const [conversations, setConversations] = useState<DisplayConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadMatches() {
      try {
        const [records, conversationRecords] = await Promise.all([
          getMatches(),
          getConversations(),
        ]);

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
        setConversations(
          conversationRecords.flatMap((conversation) => {
            const otherUser = conversation.participants.find(
              (participant) => participant._id !== user?._id,
            );

            return otherUser
              ? [{
                  id: conversation._id,
                  name: otherUser.name,
                  age: otherUser.age || 18,
                  destination: [
                    otherUser.preferredDestinations?.[0],
                    otherUser.tripDates,
                  ].filter(Boolean).join(" · ") || "TripMatch",
                  preview: conversation.lastMessage?.text || "התחילו שיחה חדשה",
                  image: otherUser.photoURL || otherUser.photo || "/pic2.png",
                  time: new Date(conversation.updatedAt).toLocaleTimeString("he-IL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
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

  async function openMatchConversation(userId: string) {
    try {
      const conversation = await getConversationWithUser(userId);
      navigate(`/chat/${conversation._id}`);
    } catch {
      setLoadError("לא הצלחנו לפתוח את השיחה");
    }
  }

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
                onClick={() => void openMatchConversation(match.userId)}
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
            {!isLoading && !loadError && conversations.length === 0 && (
              <p className="matches-empty-state">עדיין אין שיחות פעילות</p>
            )}
            {conversations.map((chat) => (
              <button
                key={chat.id}
                className={
                  "matches-chat-card"
                }
                onClick={() => navigate(`/chat/${chat.id}`)}
              >
                <div className="matches-avatar-wrap">
                  <img src={chat.image} alt={chat.name} />
                </div>

                <div className="matches-info">
                  <div className="matches-chat-top">
                    <h2>
                      {chat.name}, {chat.age}
                    </h2>
                    <span>{chat.time}</span>
                  </div>

                  <p className="matches-dest">✈️ {chat.destination}</p>

                  <p
                    className="matches-preview"
                  >
                    {chat.preview}
                  </p>
                </div>

              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
