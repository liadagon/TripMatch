import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { conversations, getConversationById } from "../data/conversations";
import "./Chat.css";

const initialMessages = [
  {
    from: "them",
    text: "היי! ראיתי שגם את מתכננת לטוס לפרו בספטמבר 🌎",
    time: "14:22",
  },
  {
    from: "me",
    text: "כן! אני מחפשת שותפה לשלושה השבועות הראשונים 🎒",
    time: "14:24",
  },
  {
    from: "them",
    text: "נשמע מעולה, גם אני רוצה להתחיל בלימה ואז להמשיך לקוסקו",
    time: "14:25",
  },
  {
    from: "me",
    text: "זה בדיוק המסלול שלי! ראית את מאצ'ו פיצ'ו בתוכנית שלך?",
    time: "14:26",
  },
  {
    from: "them",
    text: "כן בטח! אבל שמעתי שצריך להזמין הרבה מראש, כבר התחלת?",
    time: "14:27",
  },
];

const replies = [
  "ממש מגניב! 🙌",
  "כן, בדיוק חשבתי על זה!",
  "נשמע לי טוב, בואי נתאם פרטים 📅",
  "אחלה! יש לי עוד כמה שאלות...",
  "מגניב, אשמח לשמוע עוד 😊",
];

function getCurrentTime() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export default function Chat() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const conversation = getConversationById(userId) ?? conversations[0];
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function sendMessage() {
    const cleanText = text.trim();

    if (!cleanText) return;

    setMessages((prev) => [
      ...prev,
      {
        from: "me",
        text: cleanText,
        time: getCurrentTime(),
      },
    ]);

    setText("");

    window.setTimeout(() => {
      const randomReply = replies[Math.floor(Math.random() * replies.length)];

      setMessages((prev) => [
        ...prev,
        {
          from: "them",
          text: randomReply,
          time: getCurrentTime(),
        },
      ]);
    }, 900);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="chat-page" dir="rtl">
      <main className="chat-shell">
        <header className="chat-header">
          <button className="chat-back-btn" onClick={() => navigate("/matches")}>
            ‹
          </button>

          <img
            className="chat-avatar"
            src={conversation.images[0]}
            alt={conversation.name}
          />

          <div className="chat-meta">
            <h1>{conversation.name}</h1>
            <p>
              ✈️ {conversation.destination} ·{" "}
              <strong>{conversation.match}% התאמה</strong>
            </p>
          </div>

          <button className="chat-more-btn">⋮</button>
        </header>

        <section className="chat-messages">
          <div className="chat-date-divider">היום</div>

          {messages.map((message, index) => (
            <div key={index} className={`chat-message ${message.from}`}>
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
              onChange={(event) => setText(event.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>

          <button className="chat-send-btn" onClick={sendMessage}>
            ➤
          </button>
        </footer>
      </main>
    </div>
  );
}
