import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./PhoneLogin.css";

export default function PhoneLogin() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");

  const cleanPhone = phone.replace(/\D/g, "");
  const isPhoneValid = cleanPhone.length >= 9;

  function handleSubmit(event) {
    event.preventDefault();

    if (!isPhoneValid) {
      return;
    }

    navigate("/verify-code", {
      state: {
        phone: `+972${cleanPhone.replace(/^0/, "")}`,
      },
    });
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
        <div className="phone-login-card">
          <div className="phone-icon">📱</div>

          <h1>התחברות עם טלפון</h1>

          <p className="phone-subtitle">נשלח לך קוד אימות ב־SMS</p>

          <form className="phone-form" onSubmit={handleSubmit}>
            <div className="phone-input-row" dir="ltr">
              <div className="country-code">
                <span>IL</span>
                <strong>+972</strong>
              </div>

              <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="05X-XXX-XXXX"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </div>

            <button
              className="phone-submit"
              type="submit"
              disabled={!isPhoneValid}
            >
              הבא
            </button>
          </form>

          <div className="divider">
            <span>או</span>
          </div>

          <button
            className="email-login-link"
            type="button"
            onClick={() => navigate("/discover")}
          >
            כניסה עם אימייל
          </button>
        </div>

        <div className="phone-visual-card">
          <div className="plane-badge">✈</div>

          <div className="visual-content">
            <h2>
              לטייל יחד,
              <br />
              להתחבר בקלות
            </h2>

            <div className="visual-line"></div>

            <ul className="benefits-list">
              <li>
                <span>📍</span>
                התאמות לפי יעד
              </li>

              <li>
                <span>👥</span>
                מטיילים ישראלים
              </li>

              <li>
                <span>⚡</span>
                חוויה פשוטה ומהירה
              </li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}