import { FormEvent, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./PhoneLogin.css";
import "./EmailLogin.css";

type ApiError = {
  message?: string;
};

type LoginFieldErrors = {
  email?: string;
  password?: string;
};

export default function EmailLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) return;

    setErrorMessage("");
    const validationErrors: LoginFieldErrors = {};
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      validationErrors.email = "יש להזין כתובת אימייל תקינה.";
    }
    if (password.length < 8) {
      validationErrors.password = "הסיסמה חייבת להכיל לפחות 8 תווים.";
    }
    setFieldErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setErrorMessage("יש לתקן את הפרטים המסומנים לפני הכניסה.");
      return;
    }

    setIsSubmitting(true);

    try {
      await login(email.trim(), password);
      navigate("/discover", { replace: true });
    } catch (error) {
      if (!axios.isAxiosError<ApiError>(error) || !error.response) {
        setErrorMessage("לא ניתן להתחבר לשרת. בדקו את החיבור ונסו שוב.");
      } else if (error.response.status === 400) {
        setErrorMessage(
          error.response.data?.message || "כתובת האימייל או הסיסמה אינן תקינות.",
        );
      } else if (error.response.status === 401) {
        setErrorMessage("כתובת האימייל או הסיסמה שגויות.");
      } else {
        setErrorMessage("אירעה שגיאת שרת. נסו שוב מאוחר יותר.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="phone-login-page" dir="rtl">
      <header className="phone-login-header">
        <div className="phone-logo" dir="ltr">
          Trip<span>Match</span>
        </div>

        <button
          className="back-button"
          type="button"
          onClick={() => navigate("/")}
        >
          חזרה
        </button>
      </header>

      <section className="phone-login-screen">
        <div className="phone-login-card email-login-card">
          <div className="phone-icon" aria-hidden="true">
            <svg
              width="34"
              height="34"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="3"
                y="5"
                width="18"
                height="14"
                rx="2.5"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M4.5 7L12 13L19.5 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <h1>כניסה לחשבון</h1>
          <p className="phone-subtitle">התחברו עם כתובת האימייל והסיסמה</p>

          <form className="phone-form email-auth-form" onSubmit={handleSubmit}>
            <label className="email-auth-field" htmlFor="login-email">
              <span>כתובת אימייל</span>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                dir="ltr"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setFieldErrors((current) => ({ ...current, email: undefined }));
                  setErrorMessage("");
                }}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? "login-email-error" : undefined}
                required
              />
              {fieldErrors.email && (
                <small id="login-email-error" className="email-auth-field-error">
                  {fieldErrors.email}
                </small>
              )}
            </label>

            <label className="email-auth-field" htmlFor="login-password">
              <span>סיסמה</span>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                dir="ltr"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setFieldErrors((current) => ({ ...current, password: undefined }));
                  setErrorMessage("");
                }}
                minLength={8}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? "login-password-error" : undefined}
                required
              />
              {fieldErrors.password && (
                <small id="login-password-error" className="email-auth-field-error">
                  {fieldErrors.password}
                </small>
              )}
            </label>

            {errorMessage && (
              <p className="email-auth-error" role="alert">
                {errorMessage}
              </p>
            )}

            <button
              className="phone-submit"
              type="submit"
              disabled={isSubmitting || !email.trim() || !password}
            >
              {isSubmitting ? "מתחבר..." : "כניסה"}
            </button>
          </form>

          <div className="divider">
            <span>או</span>
          </div>

          <button
            className="email-login-link"
            type="button"
            onClick={() => navigate("/register")}
          >
            אין לך חשבון? הרשמה
          </button>
        </div>

        <div className="phone-visual-card">
          <img
            src="/phone.png"
            alt="לטייל יחד, להתחבר בקלות"
            className="phone-visual-image"
          />
        </div>
      </section>
    </main>
  );
}
