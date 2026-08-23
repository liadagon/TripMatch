import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock3, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import {
  getMySubscription,
  getSubscriptionErrorMessage,
  type SubscriptionState,
} from "../services/subscriptionService";
import {
  getSubscriptionStatusLabel,
  hasActiveBoost,
  isPendingSubscription,
} from "../utils/subscriptionUi";
import "./BoostReturn.css";

const MAX_AUTOMATIC_CHECKS = 4;
const POLL_INTERVAL_MS = 2500;

export default function BoostReturn() {
  const [subscription, setSubscription] = useState<SubscriptionState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const requestRefresh = useCallback(() => {
    setRefreshKey((value) => value + 1);
  }, []);

  useEffect(() => {
    let isActive = true;
    let timeoutId: number | undefined;

    async function verifySubscription(attempt = 1) {
      if (attempt === 1) {
        setIsLoading(true);
        setErrorMessage("");
      }

      try {
        const nextSubscription = await getMySubscription();
        if (!isActive) return;

        setSubscription(nextSubscription);
        setIsLoading(false);

        if (
          isPendingSubscription(nextSubscription) &&
          attempt < MAX_AUTOMATIC_CHECKS
        ) {
          timeoutId = window.setTimeout(
            () => void verifySubscription(attempt + 1),
            POLL_INTERVAL_MS,
          );
        }
      } catch (error) {
        if (!isActive) return;
        setIsLoading(false);
        setErrorMessage(
          getSubscriptionErrorMessage(
            error,
            "לא הצלחנו לאמת את מצב המנוי. בדקי שהחיבור פעיל ונסי שוב.",
          ),
        );
      }
    }

    void verifySubscription();

    return () => {
      isActive = false;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [refreshKey]);

  const isBoostActive = hasActiveBoost(subscription);
  const isPending = isPendingSubscription(subscription);
  const isInactive = Boolean(subscription && !isBoostActive && !isPending);

  return (
    <main className="boost-return-page" dir="rtl">
      <div className="boost-return-brand" dir="ltr" aria-label="TripMatch">
        Trip<span>Match</span>
      </div>

      <section className="boost-return-card" aria-live="polite">
        {isLoading ? (
          <>
            <div className="boost-return-icon pending" aria-hidden="true">
              <RefreshCw className="boost-return-spinner" size={38} />
            </div>
            <h1>מאמתים את מנוי ה-Boost</h1>
            <p>אנחנו בודקים את המצב ישירות מול PayPal והשרת המאובטח.</p>
          </>
        ) : errorMessage ? (
          <>
            <div className="boost-return-icon error" aria-hidden="true">
              <XCircle size={42} />
            </div>
            <h1>לא הצלחנו להשלים את הבדיקה</h1>
            <p>{errorMessage}</p>
            <button type="button" className="boost-return-primary" onClick={requestRefresh}>
              <RefreshCw size={18} />
              ניסיון נוסף
            </button>
          </>
        ) : isBoostActive && subscription ? (
          <>
            <div className="boost-return-icon success" aria-hidden="true">
              <CheckCircle2 size={42} />
            </div>
            <span className="boost-return-eyebrow">האישור הושלם בהצלחה</span>
            <h1>TripMatch Boost פעיל</h1>
            <p>
              מצב המנוי: <strong>{getSubscriptionStatusLabel(subscription.status)}</strong>
            </p>
            <div className="boost-return-price">₪100 לחודש</div>
            <Link className="boost-return-primary" to="/likes">
              חזרה ללייקים
            </Link>
          </>
        ) : isPending && subscription ? (
          <>
            <div className="boost-return-icon pending" aria-hidden="true">
              <Clock3 size={42} />
            </div>
            <span className="boost-return-eyebrow">האישור התקבל</span>
            <h1>אנחנו מאמתים את המנוי</h1>
            <p>
              מצב נוכחי: <strong>{getSubscriptionStatusLabel(subscription.status)}</strong>.
              ההפעלה תופיע רק לאחר אישור השרת.
            </p>
            <button type="button" className="boost-return-primary" onClick={requestRefresh}>
              <RefreshCw size={18} />
              בדיקה מחדש
            </button>
            <Link className="boost-return-secondary" to="/likes">
              חזרה ללייקים
            </Link>
          </>
        ) : isInactive && subscription ? (
          <>
            <div className="boost-return-icon inactive" aria-hidden="true">
              <ShieldCheck size={42} />
            </div>
            <h1>Boost אינו פעיל כרגע</h1>
            <p>
              מצב המנוי: <strong>{getSubscriptionStatusLabel(subscription.status)}</strong>.
              לא ניתנה הרשאת Boost.
            </p>
            <Link className="boost-return-primary" to="/likes">
              חזרה לעמוד הלייקים
            </Link>
          </>
        ) : null}
      </section>
    </main>
  );
}
