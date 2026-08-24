import { useState, type FormEvent } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import { requestEmailOtp } from "../services/authService";
import { getAuthenticationIntent } from "../utils/authNavigation";
import "./EmailOtp.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type OtpErrorResponse = {
  code?: string;
  message?: string;
  retryAfterSeconds?: number;
};

export default function EmailOtpRequest() {
  const navigate = useNavigate();
  const location = useLocation();
  const authIntent = getAuthenticationIntent(location.state);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [hasBlurred, setHasBlurred] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const normalizedEmail = email.trim().toLowerCase();
  const isEmailValid = EMAIL_PATTERN.test(normalizedEmail);
  const validationError =
    hasBlurred && normalizedEmail && !isEmailValid
      ? "כתובת האימייל אינה תקינה."
      : "";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isEmailValid || isLoading) {
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      const response = await requestEmailOtp(normalizedEmail, authIntent);

      navigate("/email-otp/verify", {
        state: {
          authIntent,
          email: normalizedEmail,
          cooldownSeconds: response.data.cooldownSeconds,
        },
      });
    } catch (requestError) {
      if (axios.isAxiosError<OtpErrorResponse>(requestError)) {
        if (requestError.response?.data.code === "OTP_RESEND_COOLDOWN") {
          setError("כבר נשלח קוד לכתובת הזו. נסו שוב בעוד דקה.");
        } else if (requestError.response?.status === 429) {
          setError("נשלחו יותר מדי בקשות. נסו שוב מאוחר יותר.");
        } else if (!requestError.response) {
          setError("לא ניתן להתחבר לשרת כרגע. בדקו את החיבור ונסו שוב.");
        } else {
          setError("לא הצלחנו לשלוח את הקוד כרגע. נסו שוב מאוחר יותר.");
        }
      } else {
        setError("לא הצלחנו לשלוח את הקוד כרגע. נסו שוב מאוחר יותר.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="email-otp-page" dir="rtl">
      <header className="email-otp-header">
        <div className="email-otp-logo" dir="ltr">
          Trip<span>Match</span>
        </div>
        <button type="button" onClick={() => navigate("/")}>
          חזרה
        </button>
      </header>

      <section className="email-otp-layout">
        <div className="email-otp-card">
          <div className="email-otp-icon" aria-hidden="true">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="5" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="2" />
              <path d="m5 7 7 6 7-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <h1>
            {authIntent === "register"
              ? "הרשמה עם אימייל"
              : "המשך עם אימייל"}
          </h1>
          <p className="email-otp-subtitle">
            נשלח אליכם קוד חד-פעמי ומאובטח. אין צורך בסיסמה.
          </p>

          <form className="email-otp-form" onSubmit={handleSubmit} noValidate>
            <label htmlFor="email-otp-address">כתובת אימייל</label>
            <input
              id="email-otp-address"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="name@example.com"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError("");
              }}
              onBlur={() => setHasBlurred(true)}
              aria-invalid={Boolean(error || validationError)}
              aria-describedby={
                error || validationError ? "email-otp-error" : undefined
              }
              dir="ltr"
            />

            {(error || validationError) && (
              <p id="email-otp-error" className="email-otp-error" role="alert">
                {error || validationError}
              </p>
            )}

            <button type="submit" disabled={!isEmailValid || isLoading}>
              {isLoading ? "שולחים..." : "שליחת קוד"}
            </button>
          </form>
        </div>

        <aside className="email-otp-side" aria-hidden="true">
          <div dir="ltr">Trip<span>Match</span></div>
          <h2>הדרך הבטוחה להכיר את השותפים לטיול שלכם</h2>
          <p>קוד קצר לאימייל, אימות מאובטח, וממשיכים לתכנן.</p>
        </aside>
      </section>
    </main>
  );
}
