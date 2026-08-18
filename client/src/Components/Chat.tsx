import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { PublicUser } from "../services/authService";
import {
  getMessages,
  sendMessage as persistMessage,
} from "../services/conversationService";
import {
  demoChatMessages,
  demoChatReplies,
  getConversationById,
} from "../data/conversations";
import "./Chat.css";

type ChatMessage = {
  id: string;
  from: "me" | "them";
  text: string;
  time: string;
};

function formatMessageTime(value: string) {
  return new Date(value).toLocaleTimeString("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Chat() {
  const navigate = useNavigate();
  const { userId: conversationId } = useParams();
  const { user } = useAuth();
  const demoConversation = getConversationById(conversationId);
  const isDemo = Boolean(demoConversation);
  const [otherUser, setOtherUser] = useState<PublicUser | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadConversation() {
      if (!conversationId) return;

      setErrorMessage("");

      if (getConversationById(conversationId)) {
        setOtherUser(null);
        setMessages(demoChatMessages.map((message) => ({ ...message })));
        return;
      }

      try {
        const conversation = await getMessages(conversationId);

        if (!isActive) return;
        setOtherUser(
          conversation.participants.find(
            (participant) => participant._id !== user?._id,
          ) || null,
        );
        setMessages(
          conversation.messages.map((message) => ({
            id: message._id,
            from: message.sender === user?._id ? "me" : "them",
            text: message.text,
            time: formatMessageTime(message.createdAt),
          })),
        );
      } catch (error) {
        console.warn(
          "[Chat] Failed to load real conversation.",
          error instanceof Error ? error.message : "Unknown error",
        );
        if (isActive) setErrorMessage("לא הצלחנו לטעון את השיחה");
      }
    }

    void loadConversation();
    return () => {
      isActive = false;
    };
  }, [conversationId, user?._id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    const cleanText = text.trim();

    if (!cleanText || !conversationId || isSending) return;

    setIsSending(true);
    setErrorMessage("");

    if (isDemo) {
      const now = new Date().toLocaleTimeString("he-IL", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const localMessage: ChatMessage = {
        id: `demo-local-${Date.now()}`,
        from: "me",
        text: cleanText,
        time: now,
      };

      setMessages((current) => [...current, localMessage]);
      setText("");
      setIsSending(false);

      window.setTimeout(() => {
        const reply =
          demoChatReplies[Math.floor(Math.random() * demoChatReplies.length)];
        setMessages((current) => [
          ...current,
          {
            id: `demo-reply-${Date.now()}`,
            from: "them",
            text: reply,
            time: new Date().toLocaleTimeString("he-IL", {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ]);
      }, 900);
      return;
    }

    try {
      const message = await persistMessage(conversationId, cleanText);
      setMessages((current) => [
        ...current,
        {
          id: message._id,
          from: "me",
          text: message.text,
          time: formatMessageTime(message.createdAt),
        },
      ]);
      setText("");
    } catch (error) {
      console.error("[Chat] Failed to persist message.", {
        conversationId,
        message: error instanceof Error ? error.message : "Unknown error",
      });
      setErrorMessage("לא הצלחנו לשלוח את ההודעה נסי שוב");
    } finally {
      setIsSending(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      void sendMessage();
    }
  }

  const destination = [
    otherUser?.preferredDestinations?.[0],
    otherUser?.tripDates,
  ].filter(Boolean).join(" · ");
  const displayName = demoConversation?.name || otherUser?.name || "TripMatch";
  const displayImage =
    demoConversation?.images[0] ||
    otherUser?.photoURL ||
    otherUser?.photo ||
    "/pic2.png";
  const displayDestination =
    demoConversation?.destination || destination || "שיחה חדשה";

  return (
    <div className="chat-page" dir="rtl">
      <main className="chat-shell">
        <header className="chat-header">
          <button className="chat-back-btn" onClick={() => navigate("/matches")}>
            ‹
          </button>

          <img
            className="chat-avatar"
            src={displayImage}
            alt={displayName}
          />

          <div className="chat-meta">
            <h1>{displayName}</h1>
            <p>✈️ {displayDestination}</p>
          </div>

          <button className="chat-more-btn">⋮</button>
        </header>

        <section className="chat-messages">
          <div className="chat-date-divider">היום</div>

          {errorMessage && <p role="alert">{errorMessage}</p>}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`chat-message ${message.from}`}
            >
              <div className="chat-bubble">{message.text}</div>
              <div className="chat-time">{message.time}</div>
            </div>
          ))}

          <div ref={messagesEndRef}></div>
        </section>

        <footer className="chat-input-bar">
          <button className="chat-attach-btn">📎</button>

          <div className="chat-input-wrap">
            <input
              type="text"
              placeholder="כתבי הודעה..."
              value={text}
              maxLength={2000}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>

          <button
            className="chat-send-btn"
            onClick={() => void sendMessage()}
            disabled={isSending || !text.trim()}
          >
            ➤
          </button>
        </footer>
      </main>
    </div>
  );
}
