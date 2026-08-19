import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Register.css";

type RegisterForm = {
  fullName: string;
  email: string;
  password: string;
  age: string;
  city: string;
  dest: string;
  month: string;
  duration: string;
  bio: string;
  israelCheck: boolean;
};

type RegisterFieldErrors = Partial<Record<keyof RegisterForm, boolean>>;

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState<RegisterForm>({
    fullName: "",
    email: "",
    password: "",
    age: "",
    city: "",
    dest: "",
    month: "",
    duration: "",
    bio: "",
    israelCheck: false,
  });

  const [budget, setBudget] = useState("");
  const [style, setStyle] = useState("");
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});

  function updateField<K extends keyof RegisterForm>(
    name: K,
    value: RegisterForm[K]
  ) {
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: false }));
    setShowError(false);
    setErrorMessage("");
  }

  async function validateForm() {
    const errors: RegisterFieldErrors = {};
    const requiredFields: Array<keyof RegisterForm> = [
      "fullName",
      "email",
      "password",
      "age",
      "city",
      "dest",
      "month",
      "duration",
    ];

    requiredFields.forEach((field) => {
      if (!String(form[field]).trim()) {
        errors[field] = true;
      }
    });

    if (Number(form.age) < 18) {
      errors.age = true;
    }

    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      errors.email = true;
    }

    if (form.password.length < 8) {
      errors.password = true;
    }

    if (!form.israelCheck) {
      errors.israelCheck = true;
    }

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setShowError(true);
      setErrorMessage("יש למלא את כל השדות הנדרשים בצורה תקינה");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setIsSubmitting(true);

    try {
      await register({
        name: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        bio: form.bio.trim(),
        age: Number(form.age),
        location: form.city,
        preferredDestinations: [form.dest],
        travelStyle: style,
        budget,
        tripDates: form.month,
        tripDuration: form.duration,
      });
      navigate("/questionnaire");
    } catch (error) {
      setShowError(true);

      if (axios.isAxiosError(error) && error.response?.status === 400) {
        const serverMessage = String(error.response.data?.message || "");
        setErrorMessage(
          serverMessage.includes("already exists")
            ? "כבר קיים חשבון עם כתובת האימייל הזו"
            : "חלק מפרטי ההרשמה אינם תקינים בדקי אותם ונסי שוב",
        );
      } else if (axios.isAxiosError(error) && !error.response) {
        setErrorMessage("לא ניתן להתחבר לשרת בדקי את החיבור ונסי שוב");
      } else {
        setErrorMessage("אירעה שגיאת שרת נסי שוב מאוחר יותר");
      }

      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="register-page" dir="rtl">
      <div className="register-shell">
        <header className="register-header">
          <div className="register-brand" dir="ltr">
            Trip<span>Match</span>
          </div>

          <div className="register-header-copy">
            <span className="register-eyebrow">השלמת פרופיל</span>
            <h1>✈️ בואו נתחיל</h1>
            <p>ספרי לנו קצת על עצמך כדי שנוכל למצוא לך שותף מושלם לטיול</p>
          </div>
        </header>

        <main className="register-content">
          <div className={showError ? "register-error-banner show" : "register-error-banner"}>
            {errorMessage}
          </div>

          <section className="register-section">
            <div className="register-section-title">פרטים אישיים</div>

            <div className={fieldErrors.fullName ? "register-field error" : "register-field"}>
              <label>שם מלא *</label>
              <input
                type="text"
                placeholder="הכנסי שם מלא"
                value={form.fullName}
                onChange={(e) => updateField("fullName", e.target.value)}
              />
            </div>

            <div className={fieldErrors.email ? "register-field error" : "register-field"}>
              <label>כתובת אימייל *</label>
              <input
                type="email"
                autoComplete="email"
                dir="ltr"
                placeholder="name@example.com"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
              />
            </div>

            <div className={fieldErrors.password ? "register-field error" : "register-field"}>
              <label>סיסמה *</label>
              <input
                type="password"
                autoComplete="new-password"
                dir="ltr"
                placeholder="לפחות 8 תווים"
                value={form.password}
                onChange={(e) => updateField("password", e.target.value)}
              />
            </div>

            <div className={fieldErrors.age ? "register-field error" : "register-field"}>
              <label>גיל *</label>
              <input
                type="number"
                placeholder="כמה שנים יש לך?"
                min="18"
                max="99"
                value={form.age}
                onChange={(e) => updateField("age", e.target.value)}
              />
            </div>

            <div className={fieldErrors.city ? "register-field error" : "register-field"}>
              <label>עיר בישראל *</label>
              <select
                value={form.city}
                onChange={(e) => updateField("city", e.target.value)}
              >
                <option value="">בחרי עיר</option>
                <option>תל אביב</option>
                <option>ירושלים</option>
                <option>חיפה</option>
                <option>באר שבע</option>
                <option>ראשון לציון</option>
                <option>רחובות</option>
                <option>פתח תקווה</option>
                <option>נתניה</option>
                <option>אשדוד</option>
                <option>חולון</option>
                <option>בני ברק</option>
                <option>רמת גן</option>
                <option>אחר</option>
              </select>
            </div>
          </section>

          <section className="register-section">
            <div className="register-section-title">תכניות טיול</div>

            <div className={fieldErrors.dest ? "register-field error" : "register-field"}>
              <label>יעד מתוכנן *</label>
              <select
                value={form.dest}
                onChange={(e) => updateField("dest", e.target.value)}
              >
                <option value="">לאן חולמים לטוס?</option>
                <option>דרום אמריקה</option>
                <option>מרכז אמריקה</option>
                <option>תאילנד וויאטנם</option>
                <option>הודו</option>
                <option>אוסטרליה וניו זילנד</option>
                <option>מזרח אסיה</option>
                <option>אפריקה</option>
                <option>אירופה</option>
                <option>ארה&quot;ב</option>
                <option>אחר</option>
              </select>
            </div>

            <div className={fieldErrors.month ? "register-field error" : "register-field"}>
              <label>חודש יציאה *</label>
              <select
                value={form.month}
                onChange={(e) => updateField("month", e.target.value)}
              >
                <option value="">בחרי חודש</option>
                <option>ינואר</option>
                <option>פברואר</option>
                <option>מרץ</option>
                <option>אפריל</option>
                <option>מאי</option>
                <option>יוני</option>
                <option>יולי</option>
                <option>אוגוסט</option>
                <option>ספטמבר</option>
                <option>אוקטובר</option>
                <option>נובמבר</option>
                <option>דצמבר</option>
              </select>
            </div>

            <div className={fieldErrors.duration ? "register-field error" : "register-field"}>
              <label>משך טיול *</label>
              <select
                value={form.duration}
                onChange={(e) => updateField("duration", e.target.value)}
              >
                <option value="">כמה זמן?</option>
                <option>עד שבועיים</option>
                <option>חודש</option>
                <option>חודשיים</option>
                <option>שלושה חודשים</option>
                <option>חצי שנה</option>
                <option>יותר משנה</option>
              </select>
            </div>
          </section>

          <section className="register-section">
            <div className="register-section-title">סגנון טיול</div>

            <div className="register-chip-field">
              <label>תקציב משוער</label>
              <div className="register-chips">
                {["חסכוני", "בינוני", "גבוה", "גמיש"].map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={budget === item ? "register-chip selected" : "register-chip"}
                    onClick={() => setBudget(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="register-chip-field">
              <label>סגנון טיול מועדף</label>
              <div className="register-chips">
                {[
                  "תרמילאות",
                  "טרקים והרפתקאות",
                  "חופשה רגועה",
                  "תרבות וערים",
                  "מסיבות ונייטלייף",
                  "טבע ואקוטיירוזם",
                ].map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={style === item ? "register-chip selected" : "register-chip"}
                    onClick={() => setStyle(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="register-field register-bio-field">
              <label>ספרי קצת על עצמך</label>
              <textarea
                placeholder="מי את? מה את אוהבת? מה המוטיבציה לטיול?"
                value={form.bio}
                onChange={(e) => updateField("bio", e.target.value)}
              />
            </div>
          </section>

          <label
            className={
              fieldErrors.israelCheck
                ? "register-checkbox-row error"
                : "register-checkbox-row"
            }
          >
            <input
              type="checkbox"
              checked={form.israelCheck}
              onChange={(e) => updateField("israelCheck", e.target.checked)}
            />
            <span>🇮🇱 אני מאשרת שאני גרה בישראל</span>
          </label>

          <button
            className="register-primary-btn"
            onClick={validateForm}
            disabled={isSubmitting}
          >
            המשך לשאלון התאמה ›
          </button>
        </main>
      </div>
    </div>
  );
}
