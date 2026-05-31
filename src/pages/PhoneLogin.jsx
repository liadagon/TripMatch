import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./PhoneLogin.css";

export default function PhoneLogin() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState(false);

  function validatePhone() {
    const cleanPhone = phone.replace(/\D/g, "");

    if (cleanPhone.length < 9) {
      setError(true);
      return;
    }

    navigate("/verify-code");
  }

  return (
    <div className="phone-login-page" dir="rtl">
      <div className="phone-login-shell">
        <div className="phone-login-top-bar">
          <button className="phone-login-circle-btn" onClick={() => navigate(-1)}>
            ‹
          </button>

          <button
            className="phone-login-circle-btn phone-login-skip-btn"
            onClick={() => navigate("/discover")}
          >
            ›
          </button>
        </div>

        <h1 className="phone-login-title">התחברות עם מספר טלפון</h1>

        <div className="phone-login-phone-row">
          <div className="phone-login-country-select">🇮🇱 +972 ▾</div>

          <input
            className={error ? "phone-login-input error" : "phone-login-input"}
            type="tel"
            placeholder="05X-XXX-XXXX"
            inputMode="numeric"
            maxLength="10"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setError(false);
            }}
          />
        </div>

        <div className={error ? "phone-login-error show" : "phone-login-error"}>
          יש להזין מספר טלפון תקין, לפחות 9 ספרות
        </div>

        <p className="phone-login-helper">
          נשלח הודעת טקסט עם קוד אימות. ייתכן שיחולו תעריפי הודעות ונתונים.
        </p>

        <div className="phone-login-spacer"></div>

        <button className="phone-login-primary-btn" onClick={validatePhone}>
          הבא
        </button>

        <button
          className="phone-login-email-link"
          onClick={() => navigate("/register")}
        >
          כניסה עם אימייל
        </button>
      </div>
    </div>
  );
}