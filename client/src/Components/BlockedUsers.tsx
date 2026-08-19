import { useEffect, useState } from "react";
import { ArrowRight, Ban, UserRoundCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  getBlockedUsers,
  unblockMatchedUser,
  type BlockedUserRecord,
} from "../services/blockService";
import "./BlockedUsers.css";

export default function BlockedUsers() {
  const navigate = useNavigate();
  const [blocks, setBlocks] = useState<BlockedUserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingUserId, setPendingUserId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isActive = true;

    getBlockedUsers()
      .then((records) => {
        if (isActive) setBlocks(records);
      })
      .catch(() => {
        if (isActive) setErrorMessage("לא הצלחנו לטעון את המשתמשים החסומים");
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  async function unblock(record: BlockedUserRecord) {
    const userId = record.blocked._id;
    if (pendingUserId) return;

    setPendingUserId(userId);
    setErrorMessage("");

    try {
      const result = await unblockMatchedUser(userId);
      if (result.removed) {
        setBlocks((current) =>
          current.filter((block) => block._id !== record._id),
        );
      }
    } catch {
      setErrorMessage("לא הצלחנו לבטל את החסימה. נסו שוב");
    } finally {
      setPendingUserId("");
    }
  }

  return (
    <div className="blocked-users-page" dir="rtl">
      <main className="blocked-users-shell">
        <header className="blocked-users-header">
          <button type="button" onClick={() => navigate("/profile")}>
            <ArrowRight size={20} />
            חזרה לפרופיל
          </button>
          <div>
            <Ban size={27} />
            <h1>משתמשים חסומים</h1>
          </div>
          <p>כאן מופיעים רק משתמשים שחסמת בעצמך.</p>
        </header>

        {errorMessage && <p className="blocked-users-error" role="alert">{errorMessage}</p>}

        <section className="blocked-users-list" aria-live="polite">
          {isLoading ? (
            <p className="blocked-users-empty">טוענים משתמשים חסומים...</p>
          ) : blocks.length === 0 ? (
            <p className="blocked-users-empty">אין משתמשים חסומים כרגע</p>
          ) : (
            blocks.map((record) => {
              const user = record.blocked;
              const image = user.photoURL || user.photo || "/pic2.png";

              return (
                <article className="blocked-user-card" key={record._id}>
                  <img src={image} alt={user.name} />
                  <div>
                    <h2>{user.name}{user.age ? `, ${user.age}` : ""}</h2>
                    <p>{user.preferredDestinations?.[0] || "TripMatch"}</p>
                  </div>
                  <button
                    type="button"
                    disabled={pendingUserId === user._id}
                    onClick={() => void unblock(record)}
                  >
                    <UserRoundCheck size={18} />
                    {pendingUserId === user._id ? "מבטלת..." : "ביטול חסימה"}
                  </button>
                </article>
              );
            })
          )}
        </section>
      </main>
    </div>
  );
}
