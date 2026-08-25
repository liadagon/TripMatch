import { RefreshCw, WifiOff } from "lucide-react";
import "./AuthRestorationError.css";

export default function AuthRestorationError() {
  return (
    <main className="auth-restoration-error" dir="rtl">
      <section
        className="auth-restoration-error-card"
        aria-labelledby="auth-restoration-error-title"
      >
        <div className="auth-restoration-error-icon" aria-hidden="true">
          <WifiOff size={36} />
        </div>
        <h1 id="auth-restoration-error-title">לא הצלחנו להתחבר כרגע</h1>
        <p>אירעה בעיית תקשורת זמנית. אפשר לנסות לטעון את העמוד מחדש.</p>
        <button type="button" onClick={() => window.location.reload()}>
          <RefreshCw size={19} aria-hidden="true" />
          נסו שוב
        </button>
      </section>
    </main>
  );
}
