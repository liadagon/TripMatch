import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  Compass,
  Heart,
  MessageCircle,
  Search,
  SlidersHorizontal,
  UserRound,
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

  function handleStartBoost() {
    setShowBoostMessage(true);

    window.setTimeout(() => {
      setShowBoostMessage(false);
    }, 3500);
  }

  function handleMessagesTabClick() {
    setActiveTab("messages");
    navigate("/chat");
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
            <strong>עידו רגב</strong>
            <small>צפה בפרופיל</small>
          </span>
          <img src="/ido1.png" alt="עידו רגב" />
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
            ניתן לבטל בכל רגע דרך החשבון שלך. בשלב הבא נחבר תשלום מאובטח
            באמצעות Stripe.
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
            <div className="likes-count">0</div>

            <div className="likes-main-heading">
              <h1>מי סימנו אותך</h1>
              <p>ברגע שמטיילים יאהבו אותך, הם יופיעו כאן.</p>
            </div>

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
          </article>
        </section>
      </section>

      <nav className="likes-bottom-nav" aria-label="ניווט ראשי">
        <button type="button" onClick={() => navigate("/discover")}>
          <Compass size={21} />
          <span>גילוי</span>
        </button>

        <button type="button" onClick={() => navigate("/preferences")}>
          <SlidersHorizontal size={21} />
          <span>העדפות</span>
        </button>

        <button type="button" className="active" onClick={() => navigate("/likes")}>
          <Heart size={21} fill="currentColor" />
          <span>לייקים</span>
        </button>

        <button type="button" onClick={() => navigate("/chat")}>
          <MessageCircle size={21} />
          <span>הודעות</span>
        </button>

        <button type="button" onClick={() => navigate("/profile")}>
          <UserRound size={21} />
          <span>פרופיל</span>
        </button>
      </nav>
    </main>
  );
}