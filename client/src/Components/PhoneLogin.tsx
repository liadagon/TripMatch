import { type ChangeEvent, type FormEvent, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getAuthenticationIntent } from "../utils/authNavigation";
import "./PhoneLogin.css";

const MAX_PHONE_LENGTH = 10;

export default function PhoneLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const authIntent = getAuthenticationIntent(location.state);
  const [phone, setPhone] = useState("");

  const isPhoneValid = /^05\d{8}$/.test(phone);

  function handlePhoneChange(event: ChangeEvent<HTMLInputElement>) {
    const digitsOnly = event.target.value
      .replace(/\D/g, "")
      .slice(0, MAX_PHONE_LENGTH);

    setPhone(digitsOnly);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isPhoneValid) {
      return;
    }

    navigate("/verify-code", {
      state: {
        authIntent,
        phone: `+972${phone.replace(/^0/, "")}`,
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

          <h1>
            {authIntent === "register"
              ? "הרשמה עם טלפון"
              : "התחברות עם טלפון"}
          </h1>

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
                onChange={handlePhoneChange}
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
