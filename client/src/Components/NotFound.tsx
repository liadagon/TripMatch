import { Compass, House } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./NotFound.css";

export default function NotFound() {
  const { isAuthenticated } = useAuth();
  const returnPath = isAuthenticated ? "/discover" : "/";

  return (
    <main className="not-found-page" dir="rtl">
      <div className="not-found-brand" dir="ltr" aria-label="TripMatch">
        Trip<span>Match</span>
      </div>

      <section className="not-found-card" aria-labelledby="not-found-title">
        <div className="not-found-icon" aria-hidden="true">
          <Compass size={38} strokeWidth={2.2} />
        </div>
        <span className="not-found-code">404</span>
        <h1 id="not-found-title">העמוד שחיפשת לא נמצא</h1>
        <p>
          נראה שהמסלול הזה לא קיים. אפשר לחזור למקום בטוח ולהמשיך למצוא
          שותפים לטיול.
        </p>
        <Link className="not-found-action" to={returnPath}>
          <House size={19} aria-hidden="true" />
          {isAuthenticated ? "חזרה ל-Discover" : "חזרה לעמוד הראשי"}
        </Link>
      </section>
    </main>
  );
}
