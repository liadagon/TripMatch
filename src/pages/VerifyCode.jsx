import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./VerifyCode.css";

export default function VerifyCode() {
  const navigate = useNavigate();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const inputsRef = useRef([]);

  const isComplete = code.every((digit) => digit.length === 1);

  function handleChange(value, index) {
    const cleanValue = value.replace(/\D/g, "").slice(0, 1);

    const nextCode = [...code];
    nextCode[index] = cleanValue;
    setCode(nextCode);

    if (cleanValue && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(event, index) {
    if (event.key === "Backspace" && !code[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  function goNext() {
    if (!isComplete) return;
    navigate("/register");
  }

  return (
    <div className="verify-page" dir="rtl">
      <div className="verify-shell">
        <div className="verify-top-bar">
          <button className="verify-circle-btn" onClick={() => navigate(-1)}>
            ‹
          </button>

          <button
            className="verify-circle-btn verify-skip-btn"
            onClick={() => navigate("/register")}
          >
            ›
          </button>
        </div>

        <h1 className="verify-title">יש להזין את הקוד ששלחנו לטלפון שלך</h1>

        <div className="verify-code-boxes">
          {code.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputsRef.current[index] = el)}
              className={digit ? "verify-code-box filled" : "verify-code-box"}
              type="text"
              inputMode="numeric"
              maxLength="1"
              value={digit}
              onChange={(event) => handleChange(event.target.value, index)}
              onKeyDown={(event) => handleKeyDown(event, index)}
            />
          ))}
        </div>

        <p className="verify-helper">
          הקוד הוא לצורך הדמו בלבד. אפשר להקליד כל 6 ספרות כדי להמשיך.
        </p>

        <div className="verify-spacer"></div>

        <button
          className={isComplete ? "verify-primary-btn active" : "verify-primary-btn"}
          onClick={goNext}
        >
          הבא
        </button>

        <button className="verify-resend-link">לא קיבלת קוד?</button>
      </div>
    </div>
  );
}