import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useCallback, useEffect } from "react";
import {
  getReceivedLikes,
  type ReceivedLike,
} from "../services/swipeService";
import {
  clearBoostPromoSnooze,
  isBoostPromoSnoozed,
  snoozeBoostPromo,
} from "../utils/boostPromoSnooze";
import {
  cancelPayPalSubscription,
  createPayPalSubscription,
  getMySubscription,
  getSubscriptionErrorMessage,
  type SubscriptionState,
} from "../services/subscriptionService";
import {
  getSandboxApprovalUrl,
  getSubscriptionStatusLabel,
  hasActiveBoost,
  isPendingSubscription,
} from "../utils/subscriptionUi";
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
  "לראות מי אהב אותך",
  "עדיפות מתונה בדירוג Discover בין מטיילים רלוונטיים",
  "סטטוס Boost פרטי בפרופיל האישי שלך",
];

export default function Likes() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<LikesTab>("received");
  const [receivedLikes, setReceivedLikes] = useState<ReceivedLike[]>([]);
  const [receivedLikesCount, setReceivedLikesCount] = useState(0);
  const [areReceivedLikesLocked, setAreReceivedLikesLocked] = useState(true);
  const [usingDemoLikesFallback, setUsingDemoLikesFallback] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionState | null>(null);
  const [isSubscriptionLoading, setIsSubscriptionLoading] = useState(true);
  const [isSubscriptionActionPending, setIsSubscriptionActionPending] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState("");
  const [isBoostPromoHidden, setIsBoostPromoHidden] = useState(() =>
    isBoostPromoSnoozed(),
  );
  const isBoostActive = hasActiveBoost(subscription);
  const isSubscriptionPending = isPendingSubscription(subscription);

  const loadSubscription = useCallback(async () => {
    setSubscriptionError("");

    try {
      const nextSubscription = await getMySubscription();
      setSubscription(nextSubscription);
      return nextSubscription;
    } catch (error) {
      setSubscriptionError(
        getSubscriptionErrorMessage(
          error,
          "לא הצלחנו לטעון את מצב המנוי. נסו שוב.",
        ),
      );
      return null;
    } finally {
      setIsSubscriptionLoading(false);
    }
  }, []);

  const loadReceivedLikes = useCallback(async () => {
    setIsLoading(true);
    setUsingDemoLikesFallback(false);

    try {
      const result = await getReceivedLikes();
      setReceivedLikesCount(result.count);
      setAreReceivedLikesLocked(result.locked);
      setReceivedLikes(result.locked ? [] : result.data);
    } catch {
      setReceivedLikes([]);
      setReceivedLikesCount(3);
      setAreReceivedLikesLocked(true);
      setUsingDemoLikesFallback(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReceivedLikes();
  }, [isBoostActive, loadReceivedLikes]);

  useEffect(() => {
    void loadSubscription();
  }, [loadSubscription]);

  useEffect(() => {
    if (!isBoostActive) return;
    clearBoostPromoSnooze();
    setIsBoostPromoHidden(false);
  }, [isBoostActive]);

  async function handleStartBoost() {
    if (isSubscriptionActionPending) return;

    setIsSubscriptionActionPending(true);
    setSubscriptionError("");

    try {
      const result = await createPayPalSubscription();
      const approvalUrl = getSandboxApprovalUrl(result.approvalUrl);

      if (approvalUrl) {
        window.location.assign(approvalUrl);
        return;
      }

      const refreshedSubscription = await loadSubscription();
      if (!hasActiveBoost(refreshedSubscription)) {
        setSubscriptionError(
          "PayPal לא החזיר קישור אישור תקין. נסו שוב בעוד רגע.",
        );
      }
    } catch (error) {
      setSubscriptionError(
        getSubscriptionErrorMessage(
          error,
          "לא הצלחנו להתחיל את תהליך ה-PayPal. בדקו את החיבור ונסו שוב.",
        ),
      );
    } finally {
      setIsSubscriptionActionPending(false);
    }
  }

  async function handleCancelSubscription() {
    const confirmed = window.confirm(
      "לבטל את מנוי TripMatch Boost? ההרשאה תוסר לפי מצב המנוי בשרת.",
    );
    if (!confirmed) return;

    setIsSubscriptionActionPending(true);
    setSubscriptionError("");

    try {
      const cancelledSubscription = await cancelPayPalSubscription();
      setSubscription(cancelledSubscription);
      await loadSubscription();
      await loadReceivedLikes();
    } catch (error) {
      setSubscriptionError(
        getSubscriptionErrorMessage(
          error,
          "לא הצלחנו לבטל את המנוי. נסו שוב מאוחר יותר.",
        ),
      );
    } finally {
      setIsSubscriptionActionPending(false);
    }
  }

  function handleMessagesTabClick() {
    setActiveTab("messages");
    navigate("/matches");
  }

  async function handleRefreshSubscription() {
    if (isSubscriptionActionPending) return;
    setIsSubscriptionActionPending(true);
    await loadSubscription();
    setIsSubscriptionActionPending(false);
  }

  function handleSnoozeBoostPromo() {
    snoozeBoostPromo();
    setIsBoostPromoHidden(true);
  }

  function handleShowBoostPromo() {
    clearBoostPromoSnooze();
    setIsBoostPromoHidden(false);
  }

  const needsPayPalApproval = subscription?.status === "approval_pending";
  const approvalWasCancelled = searchParams.get("paypal") === "cancel";
  const showBoostCard =
    isBoostActive || isSubscriptionPending || !isBoostPromoHidden;

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
          onClick={() => navigate("/profile", { state: { from: "/likes" } })}
        >
          <span>
            <strong>נועה רגב</strong>
            <small>צפה בפרופיל</small>
          </span>
          <img src="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=90" alt="נועה רגב" />
        </button>
      </header>

      <section
        className={`likes-dashboard${showBoostCard ? "" : " boost-snoozed"}`}
      >
        {showBoostCard && (
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

          {isSubscriptionLoading ? (
            <button type="button" className="likes-boost-primary" disabled>
              טוענים את מצב המנוי...
            </button>
          ) : isBoostActive && subscription ? (
            <div className="likes-subscription-state active" role="status">
              <strong>Boost פעיל</strong>
              <span>מצב מנוי: {getSubscriptionStatusLabel(subscription.status)}</span>
              <button
                type="button"
                className="likes-boost-secondary likes-cancel-subscription"
                onClick={handleCancelSubscription}
                disabled={isSubscriptionActionPending}
              >
                {isSubscriptionActionPending ? "מבטלים..." : "ביטול מנוי"}
              </button>
            </div>
          ) : isSubscriptionPending && subscription ? (
            <div className="likes-subscription-state pending" role="status">
              <strong>השלמת הרשמה ב-PayPal</strong>
              <span>{getSubscriptionStatusLabel(subscription.status)}</span>
              <button
                type="button"
                className="likes-boost-primary"
                onClick={
                  needsPayPalApproval
                    ? handleStartBoost
                    : handleRefreshSubscription
                }
                disabled={isSubscriptionActionPending}
              >
                {isSubscriptionActionPending
                  ? "בודקים את מצב המנוי..."
                  : needsPayPalApproval
                    ? "המשך לאישור ב-PayPal"
                    : "בדיקת הפעלה מחדש"}
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                className="likes-boost-primary"
                onClick={handleStartBoost}
                disabled={isSubscriptionActionPending}
              >
                {isSubscriptionActionPending
                  ? "פותחים את PayPal..."
                  : "התחילי עכשיו"}
              </button>

              <button
                type="button"
                className="likes-boost-secondary"
                onClick={handleSnoozeBoostPromo}
              >
                לא עכשיו
              </button>
            </>
          )}

          <small>
            התשלום והאישור מתבצעים בצורה מאובטחת ב-PayPal Sandbox. ניתן לבטל
            בכל רגע.
          </small>
        </aside>
        )}

        <section className="likes-main-area">
          {!showBoostCard && (
            <div className="likes-boost-collapsed">
              <span>הצעת Boost הוסתרה ל-24 שעות.</span>
              <button type="button" onClick={handleShowBoostPromo}>
                הצגת Boost
              </button>
            </div>
          )}
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

          {approvalWasCancelled && (
            <div className="likes-info-message" role="status">
              <span>תהליך האישור ב-PayPal בוטל ולא הופעל Boost.</span>
              <button
                type="button"
                onClick={() => setSearchParams({}, { replace: true })}
              >
                סגירה
              </button>
            </div>
          )}

          {subscriptionError && (
            <div className="likes-error-message" role="alert">
              <span>{subscriptionError}</span>
              <button type="button" onClick={() => void loadSubscription()}>
                רענון
              </button>
            </div>
          )}

          <article className="likes-main-card">
            <div className="likes-count">{receivedLikesCount}</div>

            <div className="likes-main-heading">
              <h1>מי סימנו אותך</h1>
              <p>ברגע שמטיילים יאהבו אותך, הם יופיעו כאן.</p>
            </div>

            {isLoading ? (
              <div className="likes-empty-state">
                <Heart size={34} />
                <h2>טוענים לייקים...</h2>
              </div>
            ) : areReceivedLikesLocked && receivedLikesCount > 0 ? (
              <div className="likes-locked-state">
                <div className="likes-locked-heading">
                  <Heart size={30} fill="currentColor" />
                  <h2>{receivedLikesCount} אנשים אהבו אותך</h2>
                  <p>
                    {usingDemoLikesFallback
                      ? "השרת אינו זמין כרגע, לכן מוצגת תצוגת הדגמה נעולה ללא פרטי מטיילים."
                      : "זהויות המטיילים נשארות מוגנות עד להפעלת Boost."}
                  </p>
                </div>

                <div className="likes-locked-grid" aria-hidden="true">
                  {Array.from({
                    length: Math.min(receivedLikesCount, 3),
                  }).map((_, index) => (
                    <div className="likes-locked-card" key={index}>
                      <div className="likes-locked-avatar" />
                      <span />
                      <small />
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className="likes-discover-button"
                  onClick={handleStartBoost}
                  disabled={isSubscriptionActionPending}
                >
                  שדרגי ל-Boost כדי לראות מי אהב אותך
                  <Zap size={17} />
                </button>
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
