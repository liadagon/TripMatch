import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { AuthUser } from "../services/authService";
import {
  getMessages,
  sendMessage as persistMessage,
  type MessageRecord,
} from "../services/conversationService";
import "./Chat.css";

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
  const [otherUser, setOtherUser] = useState<AuthUser | null>(null);
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [text, setText] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadConversation() {
      if (!conversationId) return;

      try {
        const conversation = await getMessages(conversationId);

        if (!isActive) return;
        setOtherUser(
          conversation.participants.find(
            (participant) => participant._id !== user?._id,
          ) || null,
        );
        setMessages(conversation.messages);
      } catch {
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

    try {
      const message = await persistMessage(conversationId, cleanText);
      setMessages((current) => [...current, message]);
      setText("");
    } catch {
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

  return (
    <div className="chat-page" dir="rtl">
      <main className="chat-shell">
        <header className="chat-header">
          <button className="chat-back-btn" onClick={() => navigate("/matches")}>
            ‹
          </button>

          <img
            className="chat-avatar"
            src={otherUser?.photoURL || otherUser?.photo || "/pic2.png"}
            alt={otherUser?.name || "TripMatch"}
          />

          <div className="chat-meta">
            <h1>{otherUser?.name || "TripMatch"}</h1>
            <p>✈️ {destination || "שיחה חדשה"}</p>
          </div>

          <button className="chat-more-btn">⋮</button>
        </header>

        <section className="chat-messages">
          <div className="chat-date-divider">היום</div>

          {errorMessage && <p role="alert">{errorMessage}</p>}

          {messages.map((message) => (
            <div
              key={message._id}
              className={`chat-message ${message.sender === user?._id ? "me" : "them"}`}
            >
              <div className="chat-bubble">{message.text}</div>
              <div className="chat-time">{formatMessageTime(message.createdAt)}</div>
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
