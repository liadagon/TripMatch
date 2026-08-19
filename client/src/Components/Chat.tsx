import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { Ban, UserRoundCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import type { PublicUser } from "../services/authService";
import {
  getMessages,
  sendMessage as persistMessage,
} from "../services/conversationService";
import {
  blockMatchedUser,
  unblockMatchedUser,
} from "../services/blockService";
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

type BlockStatus = {
  blocked: boolean;
  blockedByMe: boolean;
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
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isBlockPending, setIsBlockPending] = useState(false);
  const [showBlockConfirmation, setShowBlockConfirmation] = useState(false);
  const [blockStatus, setBlockStatus] = useState<BlockStatus>({
    blocked: false,
    blockedByMe: false,
  });
  const [isDemoBlocked, setIsDemoBlocked] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadConversation() {
      if (!conversationId) return;

      setErrorMessage("");
      setFeedbackMessage("");
      setIsMenuOpen(false);

      if (getConversationById(conversationId)) {
        setOtherUser(null);
        setMessages(demoChatMessages.map((message) => ({ ...message })));
        setIsDemoBlocked(false);
        setBlockStatus({ blocked: false, blockedByMe: false });
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
        setBlockStatus(conversation.blockStatus);
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
    function closeMenu(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    function closeWithEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
        setShowBlockConfirmation(false);
      }
    }

    document.addEventListener("pointerdown", closeMenu);
    document.addEventListener("keydown", closeWithEscape);
    return () => {
      document.removeEventListener("pointerdown", closeMenu);
      document.removeEventListener("keydown", closeWithEscape);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    const cleanText = text.trim();

    const relationshipBlocked = isDemo ? isDemoBlocked : blockStatus.blocked;
    if (!cleanText || !conversationId || isSending || relationshipBlocked) return;

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
      if (axios.isAxiosError(error) && error.response?.status === 403) {
        setBlockStatus({ blocked: true, blockedByMe: false });
        setErrorMessage("לא ניתן לשלוח הודעות בשיחה זו");
      } else {
        setErrorMessage("לא הצלחנו לשלוח את ההודעה נסי שוב");
      }
    } finally {
      setIsSending(false);
    }
  }

  async function performBlockAction() {
    if (isBlockPending) return;

    setIsBlockPending(true);
    setErrorMessage("");
    setFeedbackMessage("");

    try {
      if (isDemo) {
        setIsDemoBlocked((current) => !current);
        setFeedbackMessage(
          isDemoBlocked ? "החסימה בוטלה" : "המשתמש נחסם בשיחת ההדגמה",
        );
      } else if (otherUser) {
        if (blockStatus.blockedByMe) {
          await unblockMatchedUser(otherUser._id);
          setBlockStatus({ blocked: false, blockedByMe: false });
          setFeedbackMessage("החסימה בוטלה בהצלחה");
        } else {
          await blockMatchedUser(otherUser._id);
          setBlockStatus({ blocked: true, blockedByMe: true });
          setFeedbackMessage("המשתמש נחסם בהצלחה");
        }
      }

      setShowBlockConfirmation(false);
      setIsMenuOpen(false);
    } catch (error) {
      console.error("[Chat] Failed to update block state.", {
        targetUserId: otherUser?._id,
        message: error instanceof Error ? error.message : "Unknown error",
      });
      setErrorMessage("לא הצלחנו לעדכן את החסימה. נסי שוב");
    } finally {
      setIsBlockPending(false);
    }
  }

  function selectBlockAction() {
    const blockedByCurrentUser = isDemo ? isDemoBlocked : blockStatus.blockedByMe;

    if (blockedByCurrentUser) {
      void performBlockAction();
      return;
    }

    setIsMenuOpen(false);
    setShowBlockConfirmation(true);
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
  const relationshipBlocked = isDemo ? isDemoBlocked : blockStatus.blocked;
  const blockedByCurrentUser = isDemo ? isDemoBlocked : blockStatus.blockedByMe;

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

          <div className="chat-more-wrap" ref={menuRef}>
            <button
              type="button"
              className="chat-more-btn"
              aria-label="אפשרויות שיחה"
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen((current) => !current)}
            >
              ⋮
            </button>

            {isMenuOpen && (
              <div className="chat-menu" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  disabled={isBlockPending || (!isDemo && !otherUser)}
                  onClick={selectBlockAction}
                >
                  {blockedByCurrentUser ? (
                    <UserRoundCheck size={18} />
                  ) : (
                    <Ban size={18} />
                  )}
                  {blockedByCurrentUser ? "ביטול חסימה" : "חסימת משתמש"}
                </button>
              </div>
            )}
          </div>
        </header>

        <section className="chat-messages">
          <div className="chat-date-divider">היום</div>

          {errorMessage && <p role="alert">{errorMessage}</p>}
          {feedbackMessage && (
            <p className="chat-feedback" role="status">
              {feedbackMessage}
            </p>
          )}

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

        <footer className={`chat-input-bar ${relationshipBlocked ? "blocked" : ""}`}>
          {relationshipBlocked && (
            <div className="chat-relationship-state" role="status">
              {blockedByCurrentUser
                ? "המשתמש חסום"
                : "לא ניתן לשלוח הודעות בשיחה זו"}
            </div>
          )}

          <button className="chat-attach-btn" disabled={relationshipBlocked}>
            📎
          </button>

          <div className="chat-input-wrap">
            <input
              type="text"
              placeholder="כתבי הודעה..."
              value={text}
              maxLength={2000}
              disabled={relationshipBlocked}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>

          <button
            className="chat-send-btn"
            onClick={() => void sendMessage()}
            disabled={isSending || !text.trim() || relationshipBlocked}
          >
            ➤
          </button>
        </footer>

        {showBlockConfirmation && (
          <div className="chat-confirm-backdrop" role="presentation">
            <section
              className="chat-confirm-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="chat-block-confirm-title"
            >
              <Ban size={28} />
              <h2 id="chat-block-confirm-title">לחסום את המשתמש?</h2>
              <p>לא תוכלו לשלוח הודעות זה לזה עד לביטול החסימה.</p>
              <div>
                <button
                  type="button"
                  className="chat-confirm-cancel"
                  disabled={isBlockPending}
                  onClick={() => setShowBlockConfirmation(false)}
                >
                  ביטול
                </button>
                <button
                  type="button"
                  className="chat-confirm-destructive"
                  disabled={isBlockPending}
                  onClick={() => void performBlockAction()}
                >
                  {isBlockPending ? "חוסמת..." : "חסימה"}
                </button>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
