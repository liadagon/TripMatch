import { useEffect, useState } from "react";
import {
  ArrowRight,
  CircleCheck,
  ImageOff,
  LoaderCircle,
  ShieldBan,
  UserRoundCheck,
  UserRoundX,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  getBlockedUsers,
  unblockMatchedUser,
  type BlockedUserRecord,
} from "../services/blockService";
import { conversations, type Conversation } from "../data/conversations";
import {
  getBlockedDemoUserIds,
  setDemoUserBlocked,
} from "../services/demoConversationState";
import { isAppOwnedProfilePhoto } from "../utils/authenticatedIdentity";
import { useAuth } from "../context/AuthContext";
import "./BlockedUsers.css";

/** Renders a blocked account avatar with a stable failure fallback. */
function BlockedUserAvatar({ user }: { user: BlockedUserRecord["blocked"] }) {
  const image = [user.photoURL, user.photo].find(isAppOwnedProfilePhoto);
  const [imageFailed, setImageFailed] = useState(false);

  if (!image || imageFailed) {
    return (
      <div className="blocked-user-avatar-placeholder" aria-hidden="true">
        <ImageOff size={26} />
      </div>
    );
  }

  return (
    <img
      className="blocked-user-avatar"
      src={image}
      alt=""
      loading="lazy"
      onError={() => setImageFailed(true)}
    />
  );
}

/** Renders the equivalent avatar state for an account-scoped demo user. */
function DemoBlockedUserAvatar({ user }: { user: Conversation }) {
  const [imageFailed, setImageFailed] = useState(false);
  const image = user.images[0];

  if (!image || imageFailed) {
    return (
      <div className="blocked-user-avatar-placeholder" aria-hidden="true">
        <ImageOff size={26} />
      </div>
    );
  }

  return (
    <img
      className="blocked-user-avatar"
      src={image}
      alt=""
      loading="lazy"
      onError={() => setImageFailed(true)}
    />
  );
}

/** Lists and manages real and demo users blocked by the current account. */
export default function BlockedUsers() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser } = useAuth();
  const [blocks, setBlocks] = useState<BlockedUserRecord[]>([]);
  const [demoBlocks, setDemoBlocks] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingUserId, setPendingUserId] = useState("");
  const [pendingDemoUserId, setPendingDemoUserId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  function returnToProfile() {
    navigate("/profile", { replace: true, state: location.state });
  }

  useEffect(() => {
    let isActive = true;
    const blockedDemoIds = new Set(getBlockedDemoUserIds(currentUser?._id));
    setDemoBlocks(
      conversations.filter((conversation) => blockedDemoIds.has(conversation.id)),
    );

    getBlockedUsers()
      .then((records) => {
        if (isActive) setBlocks(records);
      })
      .catch(() => {
        if (isActive) {
          setErrorMessage("לא הצלחנו לטעון את המשתמשים החסומים. נסו שוב.");
        }
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [currentUser?._id]);

  /** Removes a server block and refreshes the account's visible list. */
  async function unblock(record: BlockedUserRecord) {
    const userId = record.blocked._id;
    if (pendingUserId) return;

    setPendingUserId(userId);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const result = await unblockMatchedUser(userId);
      if (!result.removed) {
        setErrorMessage("לא הצלחנו לבטל את החסימה. נסו שוב.");
        return;
      }

      setBlocks((current) =>
        current.filter((block) => block._id !== record._id),
      );
      setSuccessMessage("החסימה בוטלה בהצלחה");
    } catch {
      setErrorMessage("לא הצלחנו לבטל את החסימה. נסו שוב.");
    } finally {
      setPendingUserId("");
    }
  }

  function unblockDemo(user: Conversation) {
    if (pendingUserId || pendingDemoUserId) return;

    setPendingDemoUserId(user.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (!currentUser?._id) throw new Error("Missing authenticated user scope");
      setDemoUserBlocked(currentUser._id, user.id, false);
      setDemoBlocks((current) =>
        current.filter((blockedUser) => blockedUser.id !== user.id),
      );
      setSuccessMessage("החסימה בוטלה בהצלחה");
    } catch {
      setErrorMessage("לא הצלחנו לבטל את החסימה. נסו שוב.");
    } finally {
      setPendingDemoUserId("");
    }
  }

  return (
    <div className="blocked-users-page" dir="rtl">
      <main className="blocked-users-shell">
        <button
          type="button"
          className="blocked-users-back"
          onClick={returnToProfile}
        >
          <ArrowRight size={20} />
          חזרה לפרופיל
        </button>

        <header className="blocked-users-header">
          <div className="blocked-users-header-icon" aria-hidden="true">
            <ShieldBan size={32} />
          </div>
          <div>
            <p className="blocked-users-eyebrow">TripMatch Safety</p>
            <h1>משתמשים חסומים</h1>
            <p>כאן תוכלו לנהל משתמשים שחסמתם.</p>
          </div>
        </header>

        {successMessage && (
          <p className="blocked-users-notice blocked-users-success" role="status">
            <CircleCheck size={19} />
            {successMessage}
          </p>
        )}
        {errorMessage && (
          <p className="blocked-users-notice blocked-users-error" role="alert">
            {errorMessage}
          </p>
        )}

        <section className="blocked-users-content" aria-live="polite">
          {isLoading ? (
            <div className="blocked-users-state-card">
              <LoaderCircle className="blocked-users-spinner" size={34} />
              <h2>טוענים משתמשים חסומים...</h2>
            </div>
          ) : blocks.length + demoBlocks.length === 0 ? (
            <div className="blocked-users-state-card blocked-users-empty">
              <div className="blocked-users-empty-icon" aria-hidden="true">
                <UserRoundX size={42} />
              </div>
              <h2>אין משתמשים חסומים כרגע</h2>
              <p>
                משתמשים שתחסמו יופיעו כאן ותוכלו לבטל את החסימה בכל עת.
              </p>
              <button type="button" onClick={returnToProfile}>
                <ArrowRight size={18} />
                חזרה לפרופיל
              </button>
            </div>
          ) : (
            <div className="blocked-users-list">
              {blocks.map((record) => {
                const user = record.blocked;
                const isPending = pendingUserId === user._id;

                return (
                  <article className="blocked-user-card" key={record._id}>
                    <BlockedUserAvatar user={user} />
                    <div className="blocked-user-summary">
                      <span>משתמש חסום</span>
                      <h2>{user.name}</h2>
                    </div>
                    <button
                      type="button"
                      disabled={Boolean(pendingUserId)}
                      onClick={() => void unblock(record)}
                    >
                      {isPending ? (
                        <LoaderCircle className="blocked-users-spinner" size={18} />
                      ) : (
                        <UserRoundCheck size={18} />
                      )}
                      {isPending ? "מבטלים..." : "בטל חסימה"}
                    </button>
                  </article>
                );
              })}
              {demoBlocks.map((user) => {
                const isPending = pendingDemoUserId === user.id;

                return (
                  <article className="blocked-user-card" key={`demo-${user.id}`}>
                    <DemoBlockedUserAvatar user={user} />
                    <div className="blocked-user-summary">
                      <span>משתמש הדגמה חסום</span>
                      <h2>{user.name}</h2>
                    </div>
                    <button
                      type="button"
                      disabled={Boolean(pendingUserId || pendingDemoUserId)}
                      onClick={() => unblockDemo(user)}
                    >
                      {isPending ? (
                        <LoaderCircle className="blocked-users-spinner" size={18} />
                      ) : (
                        <UserRoundCheck size={18} />
                      )}
                      {isPending ? "מבטלים..." : "בטל חסימה"}
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
