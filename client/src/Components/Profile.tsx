import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
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
  LogOut,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import type { AuthUser } from "../services/authService";
import { uploadProfileImage } from "../services/profileService";
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

const MAX_PROFILE_IMAGE_SIZE = 5 * 1024 * 1024;

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

function profileFromUser(user: AuthUser | null): ProfileData {
  return {
    ...defaultProfile,
    name: user?.name || defaultProfile.name,
    age: String(user?.age ?? defaultProfile.age),
    city: user?.location || defaultProfile.city,
    destination:
      user?.preferredDestinations?.[0] || defaultProfile.destination,
    dates: user?.tripDates || defaultProfile.dates,
    budget: user?.budget || defaultProfile.budget,
    travelStyle: user?.travelStyle || defaultProfile.travelStyle,
    interests: user?.interests?.length
      ? user.interests.filter(Boolean)
      : defaultProfile.interests,
    aboutMe: user?.bio || defaultProfile.aboutMe,
    imageUrl: user?.photoURL || user?.photo || defaultProfile.imageUrl,
  };
}

function validateProfileImage(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("יש לבחור קובץ תמונה בלבד");
  }

  if (file.size > MAX_PROFILE_IMAGE_SIZE) {
    throw new Error("גודל התמונה המרבי הוא 5MB");
  }
}

function readImagePreview(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("לא הצלחנו לקרוא את התמונה"));
    reader.readAsDataURL(file);
  });
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, logout, updateProfile: persistProfile } = useAuth();
  const directPhotoInputRef = useRef<HTMLInputElement>(null);
  const modalPhotoInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<ProfileData>(() => profileFromUser(user));
  const [draftProfile, setDraftProfile] = useState<ProfileData>(profile);
  const [pendingProfileImage, setPendingProfileImage] = useState<File | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setProfile(profileFromUser(user));
  }, [user]);

  useEffect(() => {
    if (!showSuccess) return;

    const timeoutId = window.setTimeout(() => {
      setShowSuccess(false);
    }, 2600);

    return () => window.clearTimeout(timeoutId);
  }, [showSuccess]);

  function openEditModal() {
    setDraftProfile(profile);
    setPendingProfileImage(null);
    setIsEditing(true);
    setShowSuccess(false);
    setPhotoError("");
  }

  function closeEditModal() {
    setDraftProfile(profile);
    setPendingProfileImage(null);
    setIsEditing(false);
    setPhotoError("");
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

  async function handlePhotoSelection(
    event: ChangeEvent<HTMLInputElement>,
    destination: "profile" | "draft",
  ) {
    const file = event.target.files?.[0];
    const previousProfile = profile;
    event.target.value = "";

    if (!file) return;

    setPhotoError("");

    try {
      validateProfileImage(file);
      const previewUrl = await readImagePreview(file);

      if (destination === "draft") {
        setDraftProfile((current) => ({ ...current, imageUrl: previewUrl }));
        setPendingProfileImage(file);
        return;
      }

      setProfile((current) => ({ ...current, imageUrl: previewUrl }));
      setIsSaving(true);
      const imageUrl = await uploadProfileImage(file);
      const updatedUser = await persistProfile({ photoURL: imageUrl });
      setProfile(profileFromUser(updatedUser));
      setShowSuccess(true);
    } catch (error) {
      if (destination === "profile") {
        setProfile(previousProfile);
      }

      setPhotoError(
        error instanceof Error ? error.message : "לא הצלחנו לעדכן את התמונה",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSaving(true);
    setPhotoError("");

    try {
      const imageUrl = pendingProfileImage
        ? await uploadProfileImage(pendingProfileImage)
        : draftProfile.imageUrl;
      const updatedUser = await persistProfile({
        name: draftProfile.name.trim(),
        age: Number(draftProfile.age),
        location: draftProfile.city.trim(),
        preferredDestinations: draftProfile.destination.trim()
          ? [draftProfile.destination.trim()]
          : [],
        tripDates: draftProfile.dates.trim(),
        budget: draftProfile.budget.trim(),
        travelStyle: draftProfile.travelStyle.trim(),
        interests: draftProfile.interests,
        bio: draftProfile.aboutMe.trim(),
        ...(pendingProfileImage ? { photoURL: imageUrl } : {}),
      });
      setProfile(profileFromUser(updatedUser));
      setPendingProfileImage(null);
      setIsEditing(false);
      setShowSuccess(true);
    } catch {
      setPhotoError("לא הצלחנו לשמור את תמונת הפרופיל נסי שוב");
    } finally {
      setIsSaving(false);
    }
  }

  function handleLogout() {
    logout();
    navigate("/");
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

        {photoError && !isEditing && (
          <div className="profile-error-message" role="alert">
            {photoError}
          </div>
        )}

        <section className="profile-card">
          <div className="profile-cover">
            <input
              ref={directPhotoInputRef}
              className="profile-photo-input"
              type="file"
              accept="image/*"
              onChange={(event) => handlePhotoSelection(event, "profile")}
            />
            <button
              type="button"
              className="profile-edit-photo"
              disabled={isSaving}
              onClick={() => directPhotoInputRef.current?.click()}
            >
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
                <p>המידע מוצג רק למשתמשים רלוונטיים בתוך TripMatch</p>
              </div>
            </section>

            <button type="button" className="profile-logout-btn" onClick={handleLogout}>
              <LogOut size={18} />
              יציאה מהחשבון
            </button>
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

              <div className="profile-photo-picker profile-form-wide">
                <span>תמונת פרופיל</span>
                <div className="profile-photo-picker-content">
                  <img
                    src={draftProfile.imageUrl}
                    alt="תצוגה מקדימה של תמונת הפרופיל"
                  />
                  <input
                    ref={modalPhotoInputRef}
                    className="profile-photo-input"
                    type="file"
                    accept="image/*"
                    onChange={(event) => handlePhotoSelection(event, "draft")}
                  />
                  <button
                    type="button"
                    className="profile-choose-photo-btn"
                    onClick={() => modalPhotoInputRef.current?.click()}
                  >
                    <Camera size={17} />
                    בחירת תמונה
                  </button>
                </div>
                {photoError && <small className="profile-photo-error">{photoError}</small>}
              </div>

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
                <button
                  type="button"
                  className="profile-cancel-btn"
                  onClick={closeEditModal}
                  disabled={isSaving}
                >
                  ביטול
                </button>

                <button type="submit" className="profile-save-btn" disabled={isSaving}>
                  {isSaving ? "שומרת..." : "שמירה"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
