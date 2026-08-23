import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Camera,
  MapPin,
  CalendarDays,
  Wallet,
  Heart,
  Pencil,
  Eye,
  ShieldCheck,
  LogOut,
  Ban,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import type { AuthUser } from "../services/authService";
import { uploadProfileImage } from "../services/profileService";
import TripLocationPicker, {
  getTripLocationLabel,
} from "./TripLocationPicker";
import type { TripLocation } from "../types/tripLocation";
import {
  getProfileStatistics,
  type ProfileStatistics,
} from "../services/profileStatsService";
import "./Profile.css";
import {
  createInnerProfileNavigationState,
  getSafeProfileReturnPath,
} from "../utils/profileNavigation";
import { getMySubscription } from "../services/subscriptionService";
import { hasActiveBoost } from "../utils/subscriptionUi";

type ProfileData = {
  name: string;
  age: string;
  city: string;
  tripLocation: TripLocation | null;
  dates: string;
  budget: string;
  travelStyle: string;
  interests: string[];
  companionPriority: string;
  aboutMe: string;
  imageUrl: string;
};

const MAX_PROFILE_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_PROFILE_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const defaultProfile: ProfileData = {
  name: "נועה",
  age: "23",
  city: "תל אביב",
  tripLocation: null,
  dates: "ספטמבר עד דצמבר",
  budget: "בינוני",
  travelStyle: "טרקים ותרמילאות",
  interests: ["אמינות", "ראש פתוח", "תקציב דומה", "אהבה לטבע", "תקשורת טובה"],
  companionPriority: "אמינות ואחריות",
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
    city: user?.tripLocation
      ? getTripLocationLabel(user.tripLocation)
      : user?.location || defaultProfile.city,
    tripLocation: user?.tripLocation || null,
    dates: user?.tripDates || defaultProfile.dates,
    budget: user?.budget || defaultProfile.budget,
    travelStyle: user?.travelStyle || defaultProfile.travelStyle,
    interests: user?.interests?.length
      ? user.interests.filter(Boolean)
      : defaultProfile.interests,
    companionPriority:
      user?.questionnaire?.companionPriority || defaultProfile.companionPriority,
    aboutMe: user?.bio || defaultProfile.aboutMe,
    imageUrl: user?.photoURL || user?.photo || defaultProfile.imageUrl,
  };
}

function validateProfileImage(file: File) {
  if (!ALLOWED_PROFILE_IMAGE_TYPES.has(file.type)) {
    throw new Error("יש לבחור תמונת JPG, PNG, WEBP או GIF בלבד");
  }

  if (file.size > MAX_PROFILE_IMAGE_SIZE) {
    throw new Error("גודל התמונה המרבי הוא 5MB");
  }
}

function getProfilePhotoError(error: unknown) {
  if (
    error instanceof Error &&
    (error.message === "יש לבחור תמונת JPG, PNG, WEBP או GIF בלבד" ||
      error.message === "גודל התמונה המרבי הוא 5MB" ||
      error.message === "לא הצלחנו לקרוא את התמונה")
  ) {
    return error.message;
  }

  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401) {
      return "החיבור לחשבון פג. יש להתחבר מחדש ולנסות שוב";
    }

    if (!error.response) {
      return "לא הצלחנו להתחבר לשרת. בדקי את החיבור ונסי שוב";
    }

    if (error.response.status === 400) {
      return "השרת דחה את קובץ התמונה. יש לבחור תמונה תקינה עד 5MB";
    }
  }

  return "לא הצלחנו להעלות ולשמור את התמונה. נסי שוב";
}

function readImagePreview(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("לא הצלחנו לקרוא את התמונה"));
    reader.readAsDataURL(file);
  });
}

function replacePrimaryPhoto(photos: string[] | undefined, imageUrl: string) {
  const remainingPhotos = (photos || [])
    .map((photo) => photo.trim())
    .filter(Boolean)
    .slice(1);

  return [imageUrl, ...remainingPhotos];
}

export default function Profile() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, deleteAccount, updateProfile: persistProfile } = useAuth();
  const directPhotoInputRef = useRef<HTMLInputElement>(null);
  const modalPhotoInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<ProfileData>(() => profileFromUser(user));
  const [draftProfile, setDraftProfile] = useState<ProfileData>(profile);
  const [pendingProfileImage, setPendingProfileImage] = useState<File | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [tripLocationError, setTripLocationError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [statistics, setStatistics] = useState<ProfileStatistics | null>(null);
  const [hasPrivateBoostBadge, setHasPrivateBoostBadge] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState("");

  useEffect(() => {
    setProfile(profileFromUser(user));
  }, [user]);

  useEffect(() => {
    let isActive = true;

    async function loadStatistics() {
      setStatistics(null);

      try {
        const nextStatistics = await getProfileStatistics();
        if (isActive) setStatistics(nextStatistics);
      } catch (error) {
        console.warn(
          "[Profile] Failed to load account statistics",
          error instanceof Error ? error.message : "Unknown error",
        );
      }
    }

    void loadStatistics();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    async function loadPrivateBoostStatus() {
      try {
        const subscription = await getMySubscription();
        if (isActive) setHasPrivateBoostBadge(hasActiveBoost(subscription));
      } catch {
        if (isActive) setHasPrivateBoostBadge(false);
      }
    }

    void loadPrivateBoostStatus();
    return () => {
      isActive = false;
    };
  }, []);

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
    setTripLocationError("");
  }

  function closeEditModal() {
    setDraftProfile(profile);
    setPendingProfileImage(null);
    setIsEditing(false);
    setPhotoError("");
    setTripLocationError("");
  }

  function updateDraft(
    field: Exclude<keyof ProfileData, "tripLocation">,
    value: string,
  ) {
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
      const updatedUser = await persistProfile({
        photoURL: imageUrl,
        photos: replacePrimaryPhoto(user?.photos, imageUrl),
      });
      setProfile(profileFromUser(updatedUser));
      setShowSuccess(true);
    } catch (error) {
      if (destination === "profile") {
        setProfile(previousProfile);
      }

      setPhotoError(getProfilePhotoError(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draftProfile.tripLocation) {
      setTripLocationError("יש לבחור יעד מתוך תוצאות החיפוש");
      return;
    }

    setIsSaving(true);
    setPhotoError("");
    setTripLocationError("");

    try {
      const imageUrl = pendingProfileImage
        ? await uploadProfileImage(pendingProfileImage)
        : draftProfile.imageUrl;
      const updatedUser = await persistProfile({
        name: draftProfile.name.trim(),
        age: Number(draftProfile.age),
        tripLocation: draftProfile.tripLocation,
        tripDates: draftProfile.dates.trim(),
        budget: draftProfile.budget.trim(),
        travelStyle: draftProfile.travelStyle.trim(),
        interests: draftProfile.interests,
        bio: draftProfile.aboutMe.trim(),
        ...(pendingProfileImage
          ? {
              photoURL: imageUrl,
              photos: replacePrimaryPhoto(user?.photos, imageUrl),
            }
          : {}),
      });
      setProfile(profileFromUser(updatedUser));
      setPendingProfileImage(null);
      setIsEditing(false);
      setShowSuccess(true);
    } catch (error) {
      setPhotoError(getProfilePhotoError(error));
    } finally {
      setIsSaving(false);
    }
  }

  function handleLogout() {
    logout();
    navigate("/");
  }

  function handleBack() {
    navigate(getSafeProfileReturnPath(location.state) || "/discover", {
      replace: true,
    });
  }

  async function handleDeleteAccount() {
    setIsDeletingAccount(true);
    setDeleteAccountError("");

    try {
      await deleteAccount();
      navigate("/", { replace: true });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        setDeleteAccountError("החיבור לחשבון פג. יש להתחבר מחדש ולנסות שוב.");
      } else {
        setDeleteAccountError(
          "לא הצלחנו למחוק את החשבון בבטחה. החשבון נשמר ולא נמחק. נסי שוב.",
        );
      }
    } finally {
      setIsDeletingAccount(false);
    }
  }

  return (
    <div className="profile-page" dir="rtl">
      <main className="profile-layout">
        <header className="profile-header">
          <button className="profile-back-btn" onClick={handleBack}>
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
              aria-busy={isSaving}
            >
              <Camera size={18} />
              {isSaving ? "מעלה תמונה..." : "שינוי תמונה"}
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
                {hasPrivateBoostBadge && (
                  <div className="profile-private-boost-badge" role="status">
                    <Zap size={16} fill="currentColor" />
                    TripMatch Boost פעיל
                    <small>מוצג רק לך</small>
                  </div>
                )}
              </div>

              <div className="profile-title-actions">
                <button
                  type="button"
                  className="profile-preview-btn"
                  onClick={() =>
                    navigate("/profile-preview", {
                      state: createInnerProfileNavigationState(
                        "/profile",
                        location.state,
                      ),
                    })
                  }
                >
                  <Eye size={18} />
                  איך הפרופיל שלי נראה
                </button>

                <button
                  type="button"
                  className="profile-edit-btn"
                  onClick={openEditModal}
                >
                  <Pencil size={17} />
                  עריכה
                </button>
              </div>
            </div>

            <div className="profile-stats">
              <div>
                <strong>{statistics ? `${statistics.matchRate}%` : "—"}</strong>
                <span>שיעור התאמות</span>
              </div>

              <div>
                <strong>{statistics?.likesReceived ?? "—"}</strong>
                <span>לייקים שקיבלתי</span>
              </div>

              <div>
                <strong>{statistics?.conversations ?? "—"}</strong>
                <span>שיחות</span>
              </div>
            </div>

            <section className="profile-section">
              <h3>הטיול שלי</h3>

              <div className="profile-info-grid">
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
              <h3>תחומי עניין</h3>

              <div className="profile-tags">
                {profile.interests.map((interest) => (
                  <span key={interest}>{interest}</span>
                ))}
              </div>
            </section>

            <section className="profile-section">
              <h3>מה חשוב לי בשותף לטיול</h3>

              <div className="profile-tags">
                <span>{profile.companionPriority}</span>
              </div>
            </section>

            <section className="profile-safe-box">
              <ShieldCheck size={24} />
              <div>
                <strong>הפרופיל שלך מוגן</strong>
                <p>המידע מוצג רק למשתמשים רלוונטיים בתוך TripMatch</p>
              </div>
            </section>

            <button
              type="button"
              className="profile-blocked-users-btn"
              onClick={() => navigate("/blocked-users", { state: location.state })}
            >
              <Ban size={18} />
              משתמשים חסומים
            </button>

            <button type="button" className="profile-logout-btn" onClick={handleLogout}>
              <LogOut size={18} />
              יציאה מהחשבון
            </button>

            <button
              type="button"
              className="profile-delete-account-btn"
              onClick={() => {
                setDeleteAccountError("");
                setIsDeleteModalOpen(true);
              }}
            >
              <Trash2 size={18} />
              מחיקת חשבון
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

              <div className="profile-trip-location profile-form-wide">
                <span>איפה תהיו בחו״ל? *</span>
                <TripLocationPicker
                  value={draftProfile.tripLocation}
                  onChange={(tripLocation) => {
                    setDraftProfile((current) => ({
                      ...current,
                      tripLocation,
                      city: tripLocation
                        ? getTripLocationLabel(tripLocation)
                        : current.city,
                    }));
                    setTripLocationError("");
                  }}
                  hasError={Boolean(tripLocationError)}
                  disabled={isSaving}
                />
                {tripLocationError && (
                  <small className="profile-photo-error">{tripLocationError}</small>
                )}
              </div>

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
                    disabled={isSaving}
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

      {isDeleteModalOpen && (
        <div className="profile-modal-backdrop" role="presentation">
          <section
            className="profile-delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-delete-title"
          >
            <Trash2 size={34} aria-hidden="true" />
            <h2 id="profile-delete-title">מחיקת חשבון</h2>
            <p>
              מחיקת החשבון תמחק לצמיתות את הפרופיל, הלייקים, ההתאמות והשיחות שלך.
              לא ניתן לבטל פעולה זו.
            </p>
            {hasPrivateBoostBadge && (
              <p className="profile-delete-subscription-notice">
                מנוי TripMatch Boost הפעיל יבוטל כחלק ממחיקת החשבון.
              </p>
            )}
            {deleteAccountError && (
              <div className="profile-delete-error" role="alert">
                {deleteAccountError}
              </div>
            )}
            <div className="profile-delete-actions">
              <button
                type="button"
                className="profile-cancel-btn"
                disabled={isDeletingAccount}
                onClick={() => setIsDeleteModalOpen(false)}
              >
                ביטול
              </button>
              <button
                type="button"
                className="profile-confirm-delete-btn"
                disabled={isDeletingAccount}
                onClick={handleDeleteAccount}
              >
                {isDeletingAccount ? "מוחקת..." : "מחקי את החשבון לצמיתות"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
