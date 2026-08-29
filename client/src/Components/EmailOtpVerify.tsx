import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { requestEmailOtp } from "../services/authService";
import {
  getAuthenticationIntent,
  getAuthenticationPath,
  shouldConfirmExistingAccount,
  shouldShowEmailLoginSuccessTransition,
} from "../utils/authNavigation";
import ExistingAccountDialog from "./ExistingAccountDialog";
import "./EmailOtp.css";

const EMPTY_CODE = ["", "", "", "", "", ""];
const LOGIN_SUCCESS_TRANSITION_MS = 1350;

type OtpRouteState = {
  email?: unknown;
  cooldownSeconds?: unknown;
};

type OtpErrorResponse = {
  code?: string;
  message?: string;
  retryAfterSeconds?: number;
};

/** Safely reads the pending email address from router state. */
function getEmailFromState(state: unknown) {
  if (typeof state !== "object" || state === null || !("email" in state)) {
    return "";
  }

  return typeof state.email === "string" ? state.email : "";
}

/** Safely reads the OTP resend deadline from router state. */
function getCooldownFromState(state: unknown) {
  const routeState = state as OtpRouteState | null;
  return typeof routeState?.cooldownSeconds === "number"
    ? routeState.cooldownSeconds
    : 60;
}

/** Masks an email address while keeping it recognizable to its owner. */
function maskEmail(email: string) {
  const [localPart, domain] = email.split("@");

  if (!localPart || !domain) {
    return email;
  }

  return `${localPart.slice(0, 1)}${"*".repeat(Math.min(4, Math.max(2, localPart.length - 1)))}@${domain}`;
}

export default function EmailOtpVerify() {
  const navigate = useNavigate();
  const location = useLocation();
  const { authenticateWithEmailCode, logout } = useAuth();
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const email = getEmailFromState(location.state);
  const authIntent = getAuthenticationIntent(location.state);
  const [code, setCode] = useState([...EMPTY_CODE]);
  const [error, setError] = useState("");
  const [showRegistrationCta, setShowRegistrationCta] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(() =>
    getCooldownFromState(location.state),
  );
  const [pendingExistingAccountPath, setPendingExistingAccountPath] = useState<
    ReturnType<typeof getAuthenticationPath> | null
  >(null);
  const [pendingLoginDestination, setPendingLoginDestination] = useState<
    ReturnType<typeof getAuthenticationPath> | null
  >(null);
  const codeValue = useMemo(() => code.join(""), [code]);
  const isCodeComplete = /^\d{6}$/.test(codeValue);
  const isPendingOnboarding =
    pendingLoginDestination !== null &&
    pendingLoginDestination !== "/discover";

  useEffect(() => {
    if (!email) {
      navigate("/email-otp", { replace: true, state: { authIntent } });
    }
  }, [authIntent, email, navigate]);

  useEffect(() => {
    if (cooldownSeconds <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setCooldownSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldownSeconds]);

  useEffect(() => {
    if (!pendingLoginDestination) {
      return;
    }

    const timer = window.setTimeout(() => {
      navigate(pendingLoginDestination, { replace: true });
    }, LOGIN_SUCCESS_TRANSITION_MS);

    return () => window.clearTimeout(timer);
  }, [navigate, pendingLoginDestination]);

  function resetCode() {
    setCode([...EMPTY_CODE]);
    inputsRef.current[0]?.focus();
  }

  function handleChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const nextCode = [...code];
    nextCode[index] = digit;
    setCode(nextCode);
    setError("");
    setShowRegistrationCta(false);

    if (digit && index < code.length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !code[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    event.preventDefault();
    const digits = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6)
      .split("");

    if (!digits.length) return;

    const nextCode = [...EMPTY_CODE];
    digits.forEach((digit, index) => {
      nextCode[index] = digit;
    });
    setCode(nextCode);
    inputsRef.current[Math.min(digits.length, 5)]?.focus();
  }

  /** Verifies the complete OTP and follows the authoritative auth result. */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email || !isCodeComplete || isVerifying) return;

    setError("");
    setIsVerifying(true);

    try {
      const result = await authenticateWithEmailCode(
        email,
        codeValue,
        authIntent,
      );
      const destination = getAuthenticationPath(result);

      if (shouldConfirmExistingAccount(authIntent, result.isNewUser)) {
        setPendingExistingAccountPath(destination);
        return;
      }

      if (
        shouldShowEmailLoginSuccessTransition(authIntent, result.isNewUser)
      ) {
        setPendingLoginDestination(destination);
        return;
      }

      navigate(destination, { replace: true });
    } catch (verifyError) {
      if (axios.isAxiosError<OtpErrorResponse>(verifyError)) {
        const responseCode = verifyError.response?.data.code;

        if (responseCode === "ACCOUNT_NOT_FOUND") {
          setError("החשבון לא קיים. יש להירשם מחדש.");
          setShowRegistrationCta(true);
        } else if (responseCode === "ACCOUNT_ALREADY_EXISTS") {
          setError("החשבון כבר קיים. יש לעבור להתחברות.");
        } else if (responseCode === "OTP_TOO_MANY_ATTEMPTS") {
          setError("בוצעו יותר מדי ניסיונות. בקשו קוד חדש.");
          setCooldownSeconds(0);
        } else if (responseCode === "OTP_INVALID_OR_EXPIRED") {
          setError("הקוד שגוי, פג תוקף או כבר שומש.");
        } else if (verifyError.response?.status === 429) {
          setError("יותר מדי ניסיונות. נסו שוב מאוחר יותר.");
        } else {
          setError("לא הצלחנו לאמת את הקוד כרגע. נסו שוב.");
        }
      } else {
        setError("לא הצלחנו לאמת את הקוד כרגע. נסו שוב.");
      }

      resetCode();
    } finally {
      setIsVerifying(false);
    }
  }

  /** Requests a replacement OTP while enforcing the server-provided cooldown. */
  async function handleResend() {
    if (!email || cooldownSeconds > 0 || isResending) return;

    setError("");
    setIsResending(true);

    try {
      const response = await requestEmailOtp(email, authIntent);
      setCooldownSeconds(response.data.cooldownSeconds);
      resetCode();
    } catch (resendError) {
      if (axios.isAxiosError<OtpErrorResponse>(resendError)) {
        const retryAfter = resendError.response?.data.retryAfterSeconds;

        if (typeof retryAfter === "number") {
          setCooldownSeconds(retryAfter);
          setError("צריך להמתין מעט לפני שליחת קוד נוסף.");
        } else if (resendError.response?.status === 429) {
          setError("נשלחו יותר מדי בקשות. נסו שוב מאוחר יותר.");
        } else {
          setError("לא הצלחנו לשלוח קוד חדש כרגע.");
        }
      } else {
        setError("לא הצלחנו לשלוח קוד חדש כרגע.");
      }
    } finally {
      setIsResending(false);
    }
  }

  function continueToExistingAccount() {
    if (!pendingExistingAccountPath) return;
    navigate(pendingExistingAccountPath, { replace: true });
  }

  /** Clears the discovered account before returning to the entry route. */
  async function exitExistingAccount() {
    setIsExiting(true);

    try {
      await logout();
    } finally {
      setPendingExistingAccountPath(null);
      navigate("/", { replace: true });
    }
  }

  if (!email) return null;

  return (
    <main className="email-otp-page" dir="rtl">
      <header className="email-otp-header">
        <div className="email-otp-logo" dir="ltr">
          Trip<span>Match</span>
        </div>
        <button
          type="button"
          onClick={() => navigate("/email-otp", { state: { authIntent } })}
        >
          חזרה
        </button>
      </header>

      <section className="email-otp-layout email-otp-verify-layout">
        <div className="email-otp-card email-otp-verify-card">
          {pendingLoginDestination ? (
            <div
              className="email-otp-success"
              role="status"
              aria-live="polite"
            >
              <div className="email-otp-success-icon" aria-hidden="true">
                ✓
              </div>
              <h1>
                {isPendingOnboarding ? "האימות הצליח" : "התחברת בהצלחה"}
              </h1>
              <p className="email-otp-subtitle">
                {isPendingOnboarding
                  ? "נשארו עוד כמה שלבים להשלמת הפרופיל"
                  : "עוד רגע ואת בפנים..."}
              </p>
              <div className="email-otp-success-loader" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            </div>
          ) : (
            <>
              <div className="email-otp-icon" aria-hidden="true">✦</div>
              <h1>הזינו את הקוד שקיבלתם</h1>
              <p className="email-otp-subtitle">שלחנו קוד בן שש ספרות אל</p>
              <p className="email-otp-masked" dir="ltr">{maskEmail(email)}</p>

              <form className="email-otp-form" onSubmit={handleSubmit}>
                <div className="email-otp-code" dir="ltr" onPaste={handlePaste}>
                  {code.map((digit, index) => (
                    <input
                      key={index}
                      ref={(element) => {
                        inputsRef.current[index] = element;
                      }}
                      type="text"
                      inputMode="numeric"
                      autoComplete={index === 0 ? "one-time-code" : "off"}
                      maxLength={1}
                      value={digit}
                      onChange={(event) =>
                        handleChange(index, event.target.value)
                      }
                      onKeyDown={(event) => handleKeyDown(index, event)}
                      aria-label={`ספרה ${index + 1}`}
                    />
                  ))}
                </div>

                {error && (
                  <p className="email-otp-error" role="alert">
                    {error}
                  </p>
                )}

                {showRegistrationCta && (
                  <button
                    type="button"
                    className="email-otp-registration-cta"
                    onClick={() =>
                      navigate("/", {
                        replace: true,
                        state: { authIntent: "register" },
                      })
                    }
                  >
                    לעבור להרשמה
                  </button>
                )}

                <button
                  type="submit"
                  disabled={!isCodeComplete || isVerifying}
                >
                  {isVerifying ? "מאמתים..." : "אימות"}
                </button>
              </form>

              <button
                type="button"
                className="email-otp-resend"
                onClick={handleResend}
                disabled={cooldownSeconds > 0 || isResending}
              >
                {isResending
                  ? "שולחים..."
                  : cooldownSeconds > 0
                    ? `שליחה מחדש בעוד ${cooldownSeconds} שניות`
                    : "שליחה מחדש"}
              </button>
            </>
          )}
        </div>

        <aside className="email-otp-side" aria-hidden="true">
          <div dir="ltr">Trip<span>Match</span></div>
          <h2>עוד רגע, ומתחילים לטייל יחד</h2>
          <p>הקוד תקף לזמן קצר וניתן לשימוש פעם אחת בלבד.</p>
        </aside>
      </section>

      {pendingExistingAccountPath && (
        <ExistingAccountDialog
          isExiting={isExiting}
          onContinue={continueToExistingAccount}
          onExit={exitExistingAccount}
        />
      )}
    </main>
  );
}
