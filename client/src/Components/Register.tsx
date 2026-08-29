import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getProfileCompletionPath } from "../utils/authNavigation";
import "./Register.css";

type RegisterForm = {
  email: string;
  password: string;
  israelCheck: boolean;
};

type RegisterFieldErrors = Partial<Record<keyof RegisterForm, boolean>>;

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState<RegisterForm>({
    email: "",
    password: "",
    israelCheck: false,
  });
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});

  function updateField<K extends keyof RegisterForm>(name: K, value: RegisterForm[K]) {
    setForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: false }));
    setShowError(false);
    setErrorMessage("");
  }

  /** Creates the account and follows server-derived onboarding state. */
  async function submitRegistration() {
    if (isSubmitting) return;
    const errors: RegisterFieldErrors = {};
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errors.email = true;
    if (form.password.length < 8) errors.password = true;
    if (!form.israelCheck) errors.israelCheck = true;
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setShowError(true);
      setErrorMessage("יש למלא את כל פרטי החשבון הנדרשים בצורה תקינה.");
      return;
    }

    setIsSubmitting(true);
    try {
      const registeredUser = await register({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      navigate(getProfileCompletionPath(registeredUser), { replace: true });
    } catch (error) {
      setShowError(true);
      if (axios.isAxiosError(error) && error.response?.status === 400) {
        const serverMessage = String(error.response.data?.message || "");
        setErrorMessage(
          serverMessage.includes("already exists")
            ? "כבר קיים חשבון עם כתובת האימייל הזו."
            : "פרטי ההרשמה אינם תקינים. בדקו אותם ונסו שוב.",
        );
      } else if (axios.isAxiosError(error) && !error.response) {
        setErrorMessage("לא ניתן להתחבר לשרת. בדקו את החיבור ונסו שוב.");
      } else {
        setErrorMessage("אירעה שגיאת שרת. נסו שוב מאוחר יותר.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="register-page" dir="rtl">
      <div className="register-shell">
        <header className="register-header">
          <div className="register-brand" dir="ltr">Trip<span>Match</span></div>
          <div className="register-header-copy">
            <span className="register-eyebrow">יצירת חשבון</span>
            <h1>בואו נתחיל</h1>
            <p>אחרי יצירת החשבון נעלה תמונה ונשלים יחד שאלון התאמה קצר.</p>
          </div>
        </header>

        <main className="register-content">
          <div className={showError ? "register-error-banner show" : "register-error-banner"} role={showError ? "alert" : undefined}>
            {errorMessage}
          </div>

          <section className="register-section">
            <div className="register-section-title">פרטי החשבון</div>
            <div className={fieldErrors.email ? "register-field error" : "register-field"}>
              <label htmlFor="register-email">כתובת אימייל *</label>
              <input id="register-email" type="email" autoComplete="email" dir="ltr" placeholder="name@example.com" value={form.email} aria-label="כתובת האימייל" aria-invalid={Boolean(fieldErrors.email)} onChange={(event) => updateField("email", event.target.value)} />
            </div>
            <div className={fieldErrors.password ? "register-field error" : "register-field"}>
              <label htmlFor="register-password">סיסמה *</label>
              <input id="register-password" type="password" autoComplete="new-password" dir="ltr" placeholder="לפחות 8 תווים" value={form.password} minLength={8} aria-label="סיסמה" aria-invalid={Boolean(fieldErrors.password)} onChange={(event) => updateField("password", event.target.value)} />
            </div>
          </section>

          <label className={fieldErrors.israelCheck ? "register-checkbox-row error" : "register-checkbox-row"}>
            <input type="checkbox" checked={form.israelCheck} onChange={(event) => updateField("israelCheck", event.target.checked)} />
            <span>🇮🇱 מקום המגורים שלי הוא בישראל</span>
          </label>

          <button type="button" className="register-primary-btn" onClick={submitRegistration} disabled={isSubmitting}>
            {isSubmitting ? "יוצרים חשבון..." : "המשך להעלאת תמונות"}
          </button>
        </main>
      </div>
    </div>
  );
}
