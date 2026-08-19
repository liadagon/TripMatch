import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import {
  getReceivedLikes,
  type ReceivedLike,
} from "../services/swipeService";
import {
  Check,
  Heart,
  MessageCircle,
  Search,
  Zap,
} from "lucide-react";
import "./Likes.css";

type LikesTab = "received" | "messages";

const boostBenefits = [
  "הפרופיל שלך יופיע גבוה יותר בתוצאות",
  "יותר חשיפה למטיילים רלוונטיים",
  "אפשרות לראות מי אהב אותך",
  "עדיפות בהתאמות",
  "תג Boost ליד הפרופיל",
];

export default function Likes() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<LikesTab>("received");
  const [showBoostMessage, setShowBoostMessage] = useState(false);
  const [receivedLikes, setReceivedLikes] = useState<ReceivedLike[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadReceivedLikes() {
      setLoadError("");

      try {
        const likes = await getReceivedLikes();
        if (isActive) setReceivedLikes(likes);
      } catch {
        if (isActive) {
          setLoadError("לא הצלחנו לטעון את הלייקים. נסו שוב מאוחר יותר.");
        }
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    void loadReceivedLikes();
    return () => {
      isActive = false;
    };
  }, []);

  function handleStartBoost() {
    setShowBoostMessage(true);

    window.setTimeout(() => {
      setShowBoostMessage(false);
    }, 3500);
  }

  function handleMessagesTabClick() {
    setActiveTab("messages");
    navigate("/matches");
  }

  return (
    <main className="likes-page" dir="rtl">
      <header className="likes-topbar">
        <div className="likes-logo" dir="ltr">
          <span className="likes-logo-trip">Trip</span>
          <span className="likes-logo-match">Match</span>
        </div>

        <button
          type="button"
          className="likes-profile-button"
          onClick={() => navigate("/profile")}
        >
          <span>
            <strong>נועה רגב</strong>
            <small>צפה בפרופיל</small>
          </span>
          <img src="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=90" alt="נועה רגב" />
        </button>
      </header>

      <section className="likes-dashboard">
        <aside className="likes-boost-card" aria-label="TripMatch Boost">
          <div className="likes-boost-header">
            <div>
              <p>תן לעצמך בוסט</p>
              <h2>
                Trip<span>Match</span> Boost
              </h2>
            </div>

            <div className="likes-boost-icon">
              <Zap size={25} fill="currentColor" />
            </div>
          </div>
          <div className="likes-price">
            <strong>₪100</strong>
            <span>לחודש</span>
          </div>

          <ul className="likes-benefits">
            {boostBenefits.map((benefit) => (
              <li key={benefit}>
                <Check size={16} />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>

          <button
            type="button"
            className="likes-boost-primary"
            onClick={handleStartBoost}
          >
            התחילי עכשיו
          </button>

          <button type="button" className="likes-boost-secondary">
            לא עכשיו
          </button>

          <small>
            ניתן לבטל בכל רגע דרך החשבון שלך בשלב הבא נחבר תשלום מאובטח
            באמצעות Stripe
          </small>
        </aside>

        <section className="likes-main-area">
          <nav className="likes-tabs" aria-label="לשוניות לייקים">
            <button
              type="button"
              className={
                activeTab === "received" ? "likes-tab active" : "likes-tab"
              }
              onClick={() => setActiveTab("received")}
            >
              <Heart size={17} fill="currentColor" />
              בעינייך
            </button>

            <button
              type="button"
              className="likes-tab"
              onClick={handleMessagesTabClick}
            >
              <MessageCircle size={17} />
              הודעות היכרות
            </button>
          </nav>

          {showBoostMessage && (
            <div className="likes-success-message">
              בשלב הבא נחבר את הכפתור לתשלום אמיתי ומאובטח דרך Stripe.
            </div>
          )}

          <article className="likes-main-card">
            <div className="likes-count">{receivedLikes.length}</div>

            <div className="likes-main-heading">
              <h1>מי סימנו אותך</h1>
              <p>ברגע שמטיילים יאהבו אותך, הם יופיעו כאן.</p>
            </div>

            {isLoading ? (
              <div className="likes-empty-state">
                <Heart size={34} />
                <h2>טוענים לייקים...</h2>
              </div>
            ) : loadError ? (
              <div className="likes-empty-state">
                <Heart size={34} />
                <h2>{loadError}</h2>
              </div>
            ) : receivedLikes.length > 0 ? (
              <div className="likes-received-grid">
                {receivedLikes.map((like) => {
                  const admirer = like.fromUser;
                  const image =
                    admirer.photoURL || admirer.photo || "/pic2.png";
                  const destination =
                    admirer.preferredDestinations?.[0] || "יעד עדיין לא נבחר";

                  return (
                    <article className="likes-received-card" key={like._id}>
                      <img src={image} alt={admirer.name} />
                      <div>
                        <h2>
                          {admirer.name}
                          {admirer.age ? `, ${admirer.age}` : ""}
                        </h2>
                        <p>{admirer.location || "ישראל"}</p>
                        <strong>{destination}</strong>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="likes-empty-state">
              <div className="likes-empty-icon">
                <Heart size={34} fill="currentColor" />
              </div>

              <h2>אין לך לייקים עדיין</h2>

              <p>
                כשמטיילים יאהבו את הפרופיל שלך, הם יופיעו כאן. בינתיים אפשר
                להמשיך לגלות מטיילים חדשים לטיול.
              </p>

              <button
                type="button"
                className="likes-discover-button"
                onClick={() => navigate("/discover")}
              >
                לגלות מטיילים
                <Search size={16} />
              </button>
              </div>
            )}
          </article>
        </section>
      </section>

    </main>
  );
}
