import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Camera,
  MapPin,
  CalendarDays,
  Plane,
  Wallet,
  Heart,
  Pencil,
  ShieldCheck,
} from "lucide-react";
import "./Profile.css";

export default function Profile() {
  const navigate = useNavigate();

  return (
    <div className="profile-page" dir="rtl">
      <main className="profile-layout">
        <header className="profile-header">
          <button className="profile-back-btn" onClick={() => navigate("/discover")}>
            <ArrowRight size={20} />
            חזרה
          </button>

          <h1 className="profile-logo">
            Trip<span>Match</span>
          </h1>
        </header>

        <section className="profile-card">
          <div className="profile-cover">
            <button className="profile-edit-photo">
              <Camera size={18} />
              שינוי תמונה
            </button>
          </div>

          <div className="profile-avatar-wrap">
            <img
              className="profile-avatar"
              src="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=90"
              alt="תמונת פרופיל"
            />
          </div>

          <div className="profile-content">
            <div className="profile-title-row">
              <div>
                <h2>נועה, 23</h2>
                <p>
                  <MapPin size={16} />
                  תל אביב
                </p>
              </div>

              <button className="profile-edit-btn">
                <Pencil size={17} />
                עריכה
              </button>
            </div>

            <div className="profile-stats">
              <div>
                <strong>91%</strong>
                <span>התאמה ממוצעת</span>
              </div>

              <div>
                <strong>12</strong>
                <span>לייקים</span>
              </div>

              <div>
                <strong>5</strong>
                <span>שיחות</span>
              </div>
            </div>

            <section className="profile-section">
              <h3>הטיול שלי</h3>

              <div className="profile-info-grid">
                <div className="profile-info-item">
                  <Plane size={22} />
                  <div>
                    <span>יעד</span>
                    <strong>דרום אמריקה</strong>
                  </div>
                </div>

                <div className="profile-info-item">
                  <CalendarDays size={22} />
                  <div>
                    <span>תאריכים</span>
                    <strong>ספטמבר עד דצמבר</strong>
                  </div>
                </div>

                <div className="profile-info-item">
                  <Wallet size={22} />
                  <div>
                    <span>תקציב</span>
                    <strong>בינוני</strong>
                  </div>
                </div>

                <div className="profile-info-item">
                  <Heart size={22} />
                  <div>
                    <span>סגנון</span>
                    <strong>טרקים ותרמילאות</strong>
                  </div>
                </div>
              </div>
            </section>

            <section className="profile-section">
              <h3>קצת עליי</h3>

              <p className="profile-about">
                מחפשת שותפה או שותף לטיול בדרום אמריקה. אוהבת טבע, טרקים,
                אוכל מקומי וחוויות ספונטניות, אבל כן חשוב לי לתכנן מסגרת
                בסיסית מראש.
              </p>
            </section>

            <section className="profile-section">
              <h3>מה חשוב לי בשותף לטיול</h3>

              <div className="profile-tags">
                <span>אמינות</span>
                <span>ראש פתוח</span>
                <span>תקציב דומה</span>
                <span>אהבה לטבע</span>
                <span>תקשורת טובה</span>
              </div>
            </section>

            <section className="profile-safe-box">
              <ShieldCheck size={24} />
              <div>
                <strong>הפרופיל שלך מוגן</strong>
                <p>המידע מוצג רק למשתמשים רלוונטיים בתוך TripMatch.</p>
              </div>
            </section>
          </div>
        </section>
      </main>
    </div>
  );
}
