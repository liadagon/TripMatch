import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { Ban, Trash2, UserRoundCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import type { PublicUser } from "../services/authService";
import {
  getMessages,
  clearConversation,
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
import {
  hideDemoConversation,
  isDemoUserBlocked,
  setDemoUserBlocked,
} from "../services/demoConversationState";
import LoadingState from "./LoadingState";
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
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isBlockPending, setIsBlockPending] = useState(false);
  const [showBlockConfirmation, setShowBlockConfirmation] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isDeletePending, setIsDeletePending] = useState(false);
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
      setIsLoading(true);

      if (!conversationId) {
        setErrorMessage("לא הצלחנו לזהות את השיחה");
        setIsLoading(false);
        return;
      }

      setErrorMessage("");
      setFeedbackMessage("");
      setIsMenuOpen(false);

      if (getConversationById(conversationId)) {
        setOtherUser(null);
        setMessages(demoChatMessages.map((message) => ({ ...message })));
        setIsDemoBlocked(isDemoUserBlocked(conversationId));
        setBlockStatus({ blocked: false, blockedByMe: false });
        setIsLoading(false);
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
      } finally {
        if (isActive) setIsLoading(false);
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
        setShowDeleteConfirmation(false);
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
        const nextBlocked = !isDemoBlocked;
        setDemoUserBlocked(conversationId || "", nextBlocked);
        setIsDemoBlocked(nextBlocked);
        setFeedbackMessage(
          isDemoBlocked ? "החסימה בוטלה" : "המשתמש נחסם בשיחת ההדגמה",
        );
      } else if (otherUser) {
        if (blockStatus.blockedByMe) {
          const result = await unblockMatchedUser(otherUser._id);
          setBlockStatus(result.blockStatus);
          setFeedbackMessage("החסימה בוטלה בהצלחה");
        } else {
          const nextBlockStatus = await blockMatchedUser(otherUser._id);
          setBlockStatus(nextBlockStatus);
          setFeedbackMessage("חסמת את המשתמש הזה");
        }
      }

      setShowBlockConfirmation(false);
      setIsMenuOpen(false);
    } catch (error) {
      console.error("[Chat] Failed to update block state.", {
        targetUserId: otherUser?._id,
        message: error instanceof Error ? error.message : "Unknown error",
      });
      setShowBlockConfirmation(false);
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

  async function deleteConversationForMe() {
    if (isDeletePending) return;

    setIsDeletePending(true);
    setErrorMessage("");
    setFeedbackMessage("");

    try {
      if (isDemo && conversationId) {
        hideDemoConversation(conversationId);
      } else if (conversationId) {
        await clearConversation(conversationId);
      }

      setMessages([]);
      setShowDeleteConfirmation(false);
      setIsMenuOpen(false);
      navigate("/matches", { replace: true });
    } catch (error) {
      console.error("[Chat] Failed to clear conversation.", {
        conversationId,
        message: error instanceof Error ? error.message : "Unknown error",
      });
      setShowDeleteConfirmation(false);
      setErrorMessage("לא הצלחנו למחוק את השיחה. נסי שוב");
    } finally {
      setIsDeletePending(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      void sendMessage();
    }
  }

  function openMatchedProfile() {
    const profileUserId = isDemo ? conversationId : otherUser?._id;
    if (profileUserId) navigate(`/matched-profile/${profileUserId}`);
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

          <button
            type="button"
            className="chat-avatar-button"
            aria-label={`פתיחת הפרופיל של ${displayName}`}
            disabled={!isDemo && !otherUser}
            onClick={openMatchedProfile}
          >
            <img
              className="chat-avatar"
              src={displayImage}
              alt={displayName}
            />
          </button>

          <button
            type="button"
            className="chat-meta chat-meta-button"
            disabled={!isDemo && !otherUser}
            onClick={openMatchedProfile}
          >
            <h1>{displayName}</h1>
            <p>✈️ {displayDestination}</p>
          </button>

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
                {(!relationshipBlocked || blockedByCurrentUser) && (
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
                )}
                <button
                  type="button"
                  role="menuitem"
                  disabled={isDeletePending || !conversationId}
                  onClick={() => {
                    setIsMenuOpen(false);
                    setShowDeleteConfirmation(true);
                  }}
                >
                  <Trash2 size={18} />
                  מחיקת שיחה
                </button>
              </div>
            )}
          </div>
        </header>

        <section className="chat-messages">
          {isLoading ? (
            <LoadingState message="טוענים את השיחה..." />
          ) : (
            <>
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
            </>
          )}
        </section>

        <footer className={`chat-input-bar ${relationshipBlocked ? "blocked" : ""}`}>
          {relationshipBlocked && (
            <div className="chat-relationship-state" role="status">
              {blockedByCurrentUser
                ? "חסמת את המשתמש הזה"
                : "לא ניתן לשלוח הודעות בשיחה זו"}
              {blockedByCurrentUser && (
                <button
                  type="button"
                  className="chat-inline-unblock"
                  disabled={isBlockPending}
                  onClick={() => void performBlockAction()}
                >
                  {isBlockPending ? "מבטלת חסימה..." : "ביטול חסימה"}
                </button>
              )}
            </div>
          )}

          <div className="chat-input-wrap">
            <input
              type="text"
              placeholder="כתבי הודעה..."
              value={text}
              maxLength={2000}
              disabled={isLoading || relationshipBlocked}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>

          <button
            className="chat-send-btn"
            type="button"
            onClick={() => void sendMessage()}
            disabled={isLoading || isSending || !text.trim() || relationshipBlocked}
          >
            שליחה
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
              <p>לא תוכלו לשלוח הודעות זה לזה כל עוד החסימה פעילה.</p>
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

        {showDeleteConfirmation && (
          <div className="chat-confirm-backdrop" role="presentation">
            <section
              className="chat-confirm-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="chat-delete-confirm-title"
            >
              <Trash2 size={28} />
              <h2 id="chat-delete-confirm-title">למחוק את השיחה?</h2>
              <p>השיחה תיעלם עבורך, אך לא עבור המשתמש השני.</p>
              <div>
                <button
                  type="button"
                  className="chat-confirm-cancel"
                  disabled={isDeletePending}
                  onClick={() => setShowDeleteConfirmation(false)}
                >
                  ביטול
                </button>
                <button
                  type="button"
                  className="chat-confirm-destructive"
                  disabled={isDeletePending}
                  onClick={() => void deleteConversationForMe()}
                >
                  {isDeletePending ? "מוחקת..." : "מחיקה"}
                </button>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
