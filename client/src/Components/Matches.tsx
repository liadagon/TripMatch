import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getMatches } from "../services/matchService";
import {
  getConversations,
  getConversationWithUser,
} from "../services/conversationService";
import {
  conversations as demoConversations,
  newMatches as demoMatches,
} from "../data/conversations";
import "./Matches.css";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

type DisplayMatch = {
  id: string;
  userId: string;
  name: string;
  image: string;
  isDemo: boolean;
};

type DisplayConversation = {
  id: string;
  userId: string;
  name: string;
  age: number;
  destination: string;
  preview: string;
  image: string;
  time: string;
  isDemo: boolean;
};

const fallbackMatches: DisplayMatch[] = demoMatches.map((match) => ({
  id: `demo-match-${match.id}`,
  userId: match.id,
  name: match.name,
  image: match.images[0],
  isDemo: true,
}));

const fallbackConversations: DisplayConversation[] = demoConversations.map(
  (conversation) => ({
    id: conversation.id,
    userId: conversation.id,
    name: conversation.name,
    age: conversation.age,
    destination: conversation.destination,
    preview: conversation.preview,
    image: conversation.images[0],
    time: conversation.time || "",
    isDemo: true,
  }),
);

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
      setLoadError("");

      const [matchesResult, conversationsResult] = await Promise.allSettled([
        getMatches(),
        getConversations(),
      ]);

      if (!isActive) return;

      if (matchesResult.status === "fulfilled") {
        const realMatches = matchesResult.value.flatMap((record) => {
          const otherUser = record.users.find(
            (matchUser) => matchUser._id !== user?._id,
          );

          return otherUser
            ? [
                {
                  id: record._id,
                  userId: otherUser._id,
                  name: otherUser.name,
                  image: otherUser.photoURL || otherUser.photo || "/pic2.png",
                  isDemo: false,
                },
              ]
            : [];
        });
        setMatches(realMatches.length ? realMatches : fallbackMatches);
      } else {
        console.warn(
          "[Matches] Backend matches unavailable; using demo fallback.",
          getErrorMessage(matchesResult.reason),
        );
        setMatches(fallbackMatches);
      }

      if (conversationsResult.status === "fulfilled") {
        const realConversations = conversationsResult.value.flatMap(
          (conversation) => {
            const otherUser = conversation.participants.find(
              (participant) => participant._id !== user?._id,
            );

            return otherUser
              ? [
                  {
                    id: conversation._id,
                    userId: otherUser._id,
                    name: otherUser.name,
                    age: otherUser.age || 18,
                    destination:
                      [
                        otherUser.preferredDestinations?.[0],
                        otherUser.tripDates,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "TripMatch",
                    preview:
                      conversation.lastMessage?.text || "התחילו שיחה חדשה",
                    image:
                      otherUser.photoURL || otherUser.photo || "/pic2.png",
                    time: new Date(
                      conversation.updatedAt,
                    ).toLocaleTimeString("he-IL", {
                      hour: "2-digit",
                      minute: "2-digit",
                    }),
                    isDemo: false,
                  },
                ]
              : [];
          },
        );
        setConversations(
          realConversations.length ? realConversations : fallbackConversations,
        );
      } else {
        console.warn(
          "[Matches] Backend conversations unavailable; using demo fallback.",
          getErrorMessage(conversationsResult.reason),
        );
        setConversations(fallbackConversations);
      }

      if (
        matchesResult.status === "rejected" ||
        conversationsResult.status === "rejected"
      ) {
        setLoadError("לא הצלחנו לטעון את כל הנתונים מהשרת. מוצגים נתוני הדגמה");
      }

      setIsLoading(false);
    }

    void loadMatches();
    return () => {
      isActive = false;
    };
  }, [user?._id]);

  async function openMatchConversation(match: DisplayMatch) {
    if (match.isDemo) {
      navigate(`/chat/${match.userId}`);
      return;
    }

    try {
      const conversation = await getConversationWithUser(match.userId);
      navigate(`/chat/${conversation._id}`);
    } catch {
      setLoadError("לא הצלחנו לפתוח את השיחה");
    }
  }

  function openConversationProfile(chat: DisplayConversation) {
    navigate(`/matched-profile/${chat.userId}`);
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
            {!isLoading && matches.length === 0 && (
              <p className="matches-empty-state">עדיין אין התאמות חדשות</p>
            )}
            {loadError && <p className="matches-empty-state">{loadError}</p>}
            {matches.map((match) => (
              <button
                key={match.id}
                className="matches-story"
                onClick={() => void openMatchConversation(match)}
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
            {!isLoading && conversations.length === 0 && (
              <p className="matches-empty-state">עדיין אין שיחות פעילות</p>
            )}
            {conversations.map((chat) => (
              <article
                key={chat.id}
                className="matches-chat-card"
              >
                <button
                  type="button"
                  className="matches-avatar-wrap matches-avatar-button"
                  aria-label={`פתיחת הפרופיל של ${chat.name}`}
                  onClick={() => openConversationProfile(chat)}
                >
                  <img src={chat.image} alt={chat.name} />
                </button>

                <button
                  type="button"
                  className="matches-info matches-conversation-open"
                  onClick={() => navigate(`/chat/${chat.id}`)}
                >
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
                </button>

              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
