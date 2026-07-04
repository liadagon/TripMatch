import { useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./VerifyCode.css";

export default function VerifyCode() {
  const navigate = useNavigate();
  const location = useLocation();
  const inputsRef = useRef([]);

  const phone = location.state?.phone || "";
  const [code, setCode] = useState(["", "", "", "", "", ""]);

  const codeValue = useMemo(() => code.join(""), [code]);
  const isCodeComplete = codeValue.length === 6;

  function handleChange(index, value) {
    const digit = value.replace(/\D/g, "").slice(-1);

    const nextCode = [...code];
    nextCode[index] = digit;
    setCode(nextCode);

    if (digit && index < code.length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index, event) {
    if (event.key === "Backspace" && !code[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }

    if (event.key === "ArrowLeft" && index < code.length - 1) {
      inputsRef.current[index + 1]?.focus();
    }

    if (event.key === "ArrowRight" && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  function handlePaste(event) {
    event.preventDefault();

    const pastedDigits = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6)
      .split("");

    if (!pastedDigits.length) {
      return;
    }

    const nextCode = ["", "", "", "", "", ""];

    pastedDigits.forEach((digit, index) => {
      nextCode[index] = digit;
    });

    setCode(nextCode);

    const nextFocusIndex = Math.min(pastedDigits.length, 5);
    inputsRef.current[nextFocusIndex]?.focus();
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!isCodeComplete) {
      return;
    }

    navigate("/questionnaire", {
      state: {
        phone,
        code: codeValue,
      },
    });
  }

  function handleResendCode() {
    setCode(["", "", "", "", "", ""]);
    inputsRef.current[0]?.focus();
  }

  return (
    <main className="verify-page" dir="rtl">
      <header className="verify-header">
        <div className="verify-logo" dir="ltr">
          Trip<span>Match</span>
        </div>

        <button
          className="verify-back-button"
          type="button"
          onClick={() => navigate("/phone-login")}
        >
          חזרה
        </button>
      </header>

      <section className="verify-screen">
        <div className="verify-card">
          <div className="verify-icon" aria-hidden="true">
            <svg
              width="34"
              height="34"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="5"
                y="11"
                width="14"
                height="9"
                rx="2.2"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M8 11V8.2C8 5.9 9.6 4.2 12 4.2C14.4 4.2 16 5.9 16 8.2V11"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle cx="12" cy="15.5" r="1.2" fill="currentColor" />
            </svg>
          </div>

          <h1>אימות קוד</h1>

          <p className="verify-subtitle">
            הזיני את הקוד שקיבלת ב־SMS
          </p>

          {phone && <p className="verify-phone">{phone}</p>}

          <form className="verify-form" onSubmit={handleSubmit}>
            <div className="code-inputs" dir="ltr" onPaste={handlePaste}>
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={(element) => {
                    inputsRef.current[index] = element;
                  }}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={1}
                  value={digit}
                  onChange={(event) => handleChange(index, event.target.value)}
                  onKeyDown={(event) => handleKeyDown(index, event)}
                  aria-label={`ספרה ${index + 1}`}
                />
              ))}
            </div>

            <p className="verify-help">
              הקוד תקף לזמן קצר. אפשר להדביק את כל 6 הספרות בבת אחת.
            </p>

            <button
              className="verify-submit"
              type="submit"
              disabled={!isCodeComplete}
            >
              המשך
            </button>
          </form>

          <button
            className="resend-button"
            type="button"
            onClick={handleResendCode}
          >
            לא קיבלת קוד? שליחה מחדש
          </button>
        </div>

        <aside className="verify-side-card">
          <div className="side-logo" dir="ltr">
            Trip<span>Match</span>
          </div>

          <h2>
            עוד רגע,
            <br />
            מתחילים לטייל יחד
          </h2>

          <div className="side-line"></div>

          <div className="side-list">
            <div>
              <span>1</span>
              אימות מספר הטלפון
            </div>

            <div>
              <span>2</span>
              מילוי פרטי טיול
            </div>

            <div>
              <span>3</span>
              מציאת שותפים מתאימים
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
