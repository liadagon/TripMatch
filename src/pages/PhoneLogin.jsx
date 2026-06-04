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
          <div className="phone-icon" aria-hidden="true">
            <svg
              width="34"
              height="34"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="7"
                y="2.75"
                width="10"
                height="18.5"
                rx="2.6"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M10.25 5.75H13.75"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <circle cx="12" cy="17.75" r="1" fill="currentColor" />
            </svg>
          </div>

          <h1>התחברות עם טלפון</h1>

          <p className="phone-subtitle">נשלח לך קוד אימות ב־SMS</p>

          <form className="phone-form" onSubmit={handleSubmit}>
            <div className="phone-input-row" dir="ltr">
              <div className="country-code">
                <span>IL</span>
                <strong>+972</strong>
                <span className="country-arrow">▼</span>
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