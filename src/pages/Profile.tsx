import { FormEvent, useEffect, useState } from "react";
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
  X,
} from "lucide-react";
import "./Profile.css";

type ProfileData = {
  name: string;
  age: string;
  city: string;
  destination: string;
  dates: string;
  budget: string;
  travelStyle: string;
  interests: string[];
  aboutMe: string;
  imageUrl: string;
};

const PROFILE_STORAGE_KEY = "tripmatch_profile";

const defaultProfile: ProfileData = {
  name: "נועה",
  age: "23",
  city: "תל אביב",
  destination: "דרום אמריקה",
  dates: "ספטמבר עד דצמבר",
  budget: "בינוני",
  travelStyle: "טרקים ותרמילאות",
  interests: ["אמינות", "ראש פתוח", "תקציב דומה", "אהבה לטבע", "תקשורת טובה"],
  aboutMe:
    "מחפשת שותפה או שותף לטיול בדרום אמריקה. אוהבת טבע, טרקים, אוכל מקומי וחוויות ספונטניות, אבל כן חשוב לי לתכנן מסגרת בסיסית מראש.",
  imageUrl:
    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=90",
};

function normalizeProfile(value: Partial<ProfileData>): ProfileData {
  return {
    ...defaultProfile,
    ...value,
    age: String(value.age || defaultProfile.age),
    interests: Array.isArray(value.interests)
      ? value.interests.filter(Boolean)
      : defaultProfile.interests,
  };
}

function readStoredProfile(): ProfileData {
  const savedProfile = localStorage.getItem(PROFILE_STORAGE_KEY);

  if (savedProfile) {
    try {
      return normalizeProfile(JSON.parse(savedProfile));
    } catch {
      localStorage.removeItem(PROFILE_STORAGE_KEY);
    }
  }

  return defaultProfile;
}

export default function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData>(() => readStoredProfile());
  const [draftProfile, setDraftProfile] = useState<ProfileData>(profile);
  const [isEditing, setIsEditing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!showSuccess) return;

    const timeoutId = window.setTimeout(() => {
      setShowSuccess(false);
    }, 2600);

    return () => window.clearTimeout(timeoutId);
  }, [showSuccess]);

  function openEditModal() {
    setDraftProfile(profile);
    setIsEditing(true);
    setShowSuccess(false);
  }

  function closeEditModal() {
    setDraftProfile(profile);
    setIsEditing(false);
  }

  function updateDraft(field: keyof ProfileData, value: string) {
    setDraftProfile((current) => ({
      ...current,
      [field]: field === "interests"
        ? value
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
        : value,
    }));
  }

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextProfile = normalizeProfile(draftProfile);
    setProfile(nextProfile);
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(nextProfile));
    setIsEditing(false);
    setShowSuccess(true);
  }

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

        {showSuccess && (
          <div className="profile-success-message" role="status">
            הפרופיל עודכן בהצלחה
          </div>
        )}

        <section className="profile-card">
          <div className="profile-cover">
            <button className="profile-edit-photo" onClick={openEditModal}>
              <Camera size={18} />
              שינוי תמונה
            </button>
          </div>

          <div className="profile-avatar-wrap">
            <img
              className="profile-avatar"
              src={profile.imageUrl}
              alt="תמונת פרופיל"
            />
          </div>

          <div className="profile-content">
            <div className="profile-title-row">
              <div>
                <h2>
                  {profile.name}, {profile.age}
                </h2>
                <p>
                  <MapPin size={16} />
                  {profile.city}
                </p>
              </div>

              <button className="profile-edit-btn" onClick={openEditModal}>
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
                    <strong>{profile.destination}</strong>
                  </div>
                </div>

                <div className="profile-info-item">
                  <CalendarDays size={22} />
                  <div>
                    <span>תאריכים</span>
                    <strong>{profile.dates}</strong>
                  </div>
                </div>

                <div className="profile-info-item">
                  <Wallet size={22} />
                  <div>
                    <span>תקציב</span>
                    <strong>{profile.budget}</strong>
                  </div>
                </div>

                <div className="profile-info-item">
                  <Heart size={22} />
                  <div>
                    <span>סגנון</span>
                    <strong>{profile.travelStyle}</strong>
                  </div>
                </div>
              </div>
            </section>

            <section className="profile-section">
              <h3>קצת עליי</h3>

              <p className="profile-about">{profile.aboutMe}</p>
            </section>

            <section className="profile-section">
              <h3>מה חשוב לי בשותף לטיול</h3>

              <div className="profile-tags">
                {profile.interests.map((interest) => (
                  <span key={interest}>{interest}</span>
                ))}
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

      {isEditing && (
        <div className="profile-modal-backdrop" role="presentation">
          <section
            className="profile-edit-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-edit-title"
          >
            <div className="profile-modal-header">
              <div>
                <h2 id="profile-edit-title">עריכת פרופיל</h2>
                <p>העדכונים נשמרים בדפדפן שלך עד שנחבר את הבקנד.</p>
              </div>

              <button
                className="profile-modal-close"
                type="button"
                aria-label="סגירת עריכה"
                onClick={closeEditModal}
              >
                <X size={22} />
              </button>
            </div>

            <form className="profile-edit-form" onSubmit={saveProfile}>
              <label>
                <span>שם</span>
                <input
                  value={draftProfile.name}
                  onChange={(event) => updateDraft("name", event.target.value)}
                />
              </label>

              <label>
                <span>גיל</span>
                <input
                  type="number"
                  min="18"
                  max="120"
                  value={draftProfile.age}
                  onChange={(event) => updateDraft("age", event.target.value)}
                />
              </label>

              <label>
                <span>עיר</span>
                <input
                  value={draftProfile.city}
                  onChange={(event) => updateDraft("city", event.target.value)}
                />
              </label>

              <label>
                <span>יעד</span>
                <input
                  value={draftProfile.destination}
                  onChange={(event) => updateDraft("destination", event.target.value)}
                />
              </label>

              <label>
                <span>תאריכי טיול</span>
                <input
                  value={draftProfile.dates}
                  onChange={(event) => updateDraft("dates", event.target.value)}
                />
              </label>

              <label>
                <span>תקציב</span>
                <input
                  value={draftProfile.budget}
                  onChange={(event) => updateDraft("budget", event.target.value)}
                />
              </label>

              <label>
                <span>סגנון טיול</span>
                <input
                  value={draftProfile.travelStyle}
                  onChange={(event) => updateDraft("travelStyle", event.target.value)}
                />
              </label>

              <label>
                <span>קישור לתמונת פרופיל</span>
                <input
                  dir="ltr"
                  value={draftProfile.imageUrl}
                  onChange={(event) => updateDraft("imageUrl", event.target.value)}
                />
              </label>

              <label className="profile-form-wide">
                <span>תחומי עניין / תגיות</span>
                <input
                  value={draftProfile.interests.join(", ")}
                  onChange={(event) => updateDraft("interests", event.target.value)}
                />
              </label>

              <label className="profile-form-wide">
                <span>קצת עליי</span>
                <textarea
                  rows={5}
                  value={draftProfile.aboutMe}
                  onChange={(event) => updateDraft("aboutMe", event.target.value)}
                />
              </label>

              <div className="profile-modal-actions">
                <button type="button" className="profile-cancel-btn" onClick={closeEditModal}>
                  ביטול
                </button>

                <button type="submit" className="profile-save-btn">
                  שמירה
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
