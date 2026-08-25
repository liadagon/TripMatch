import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BedDouble,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Clock3,
  Compass,
  Eye,
  ImagePlus,
  LoaderCircle,
  MapPin,
  Plane,
  Save,
  ShieldAlert,
  Sparkles,
  Trash2,
  UsersRound,
  Wallet,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  getOuterProfileNavigationState,
  getSafeParentProfilePath,
} from "../utils/profileNavigation";
import type { ProfilePreviewUser } from "../services/authService";
import { getTripLocationLabel } from "./TripLocationPicker";
import {
  getAuthenticatedIdentity,
  getAuthenticatedProfilePhotos,
} from "../utils/authenticatedIdentity";
import { filterCanonicalInterests } from "../data/profileOptions";
import { uploadProfileImage } from "../services/profileService";
import { getGenderedQuestionnaireOptionLabel } from "../utils/genderedHebrew";
import "./MyProfilePreview.css";
import SafeImage from "./SafeImage";

const MAX_PROFILE_PHOTOS = 6;
const MAX_PROFILE_PHOTO_BYTES = 5 * 1024 * 1024;
const SUPPORTED_PROFILE_PHOTO_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

type EditablePhoto = {
  id: string;
  url: string;
  file?: File;
};

type DetailItem = {
  label: string;
  value: string;
  icon: typeof Plane;
};

type ProfilePreviewViewProps = {
  profile: ProfilePreviewUser;
  backLabel: string;
  onBack: () => void;
  contextText: string;
  galleryLabel: string;
  compatibility?: number;
  galleryAction?: ReactNode;
  footerAction?: ReactNode;
};

function meaningful(value: string | undefined) {
  return value?.trim() || "";
}

function getProfilePhotos(user: ProfilePreviewUser) {
  const galleryPhotos = (user.photos || [])
    .map((photo) => photo.trim())
    .filter(Boolean);

  if (galleryPhotos.length > 0) return galleryPhotos;

  const fallbackPhoto = meaningful(user.photoURL) || meaningful(user.photo);
  return fallbackPhoto ? [fallbackPhoto] : [];
}

export function ProfilePreviewView({
  profile: user,
  backLabel,
  onBack,
  contextText,
  galleryLabel,
  compatibility,
  galleryAction,
  footerAction,
}: ProfilePreviewViewProps) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const [failedPhotos, setFailedPhotos] = useState<Set<string>>(() => new Set());

  const photos = useMemo(() => getProfilePhotos(user), [user]);
  const currentPhoto = photos[photoIndex];
  const currentPhotoFailed = currentPhoto ? failedPhotos.has(currentPhoto) : false;

  useEffect(() => {
    setPhotoIndex(0);
    setFailedPhotos(new Set());
  }, [user]);

  const tripDestination = user.tripLocation
    ? getTripLocationLabel(user.tripLocation)
    : meaningful(user.location);
  const preferredDestinations = Array.from(
    new Set(
      (user.preferredDestinations || [])
        .map((destination) => destination.trim())
        .filter(Boolean),
    ),
  );
  const interests = filterCanonicalInterests(user.interests);
  const travelDetails: DetailItem[] = [
    tripDestination
      ? { label: "יעד הטיול", value: tripDestination, icon: Plane }
      : null,
    preferredDestinations.length
      ? {
          label: "אזור מועדף",
          value: preferredDestinations.join(" · "),
          icon: MapPin,
        }
      : null,
    meaningful(user.tripDates)
      ? { label: "מועד", value: meaningful(user.tripDates), icon: CalendarDays }
      : null,
    meaningful(user.budget)
      ? { label: "תקציב", value: meaningful(user.budget), icon: Wallet }
      : null,
    meaningful(user.travelStyle)
      ? { label: "סגנון טיול", value: meaningful(user.travelStyle), icon: Compass }
      : null,
    meaningful(user.tripDuration)
      ? { label: "משך הטיול", value: meaningful(user.tripDuration), icon: Clock3 }
      : null,
  ].filter((item): item is DetailItem => item !== null);
  const questionnaireDetails: DetailItem[] = [
    meaningful(user.questionnaire?.accommodationPreference)
      ? {
          label: "העדפת לינה",
          value: getGenderedQuestionnaireOptionLabel(
            meaningful(user.questionnaire?.accommodationPreference),
            user.gender,
          ),
          icon: BedDouble,
        }
      : null,
    meaningful(user.questionnaire?.companionScope)
      ? {
          label: "שותפות לטיול",
          value: getGenderedQuestionnaireOptionLabel(
            meaningful(user.questionnaire?.companionScope),
            user.gender,
          ),
          icon: UsersRound,
        }
      : null,
    meaningful(user.questionnaire?.companionPriority)
      ? {
          label: "מה חשוב לי בשותפ/ה",
          value: getGenderedQuestionnaireOptionLabel(
            meaningful(user.questionnaire?.companionPriority),
            user.gender,
          ),
          icon: Sparkles,
        }
      : null,
    meaningful(user.questionnaire?.dealBreaker)
      ? {
          label: "קו אדום מבחינתי",
          value: getGenderedQuestionnaireOptionLabel(
            meaningful(user.questionnaire?.dealBreaker),
            user.gender,
          ),
          icon: ShieldAlert,
        }
      : null,
  ].filter((item): item is DetailItem => item !== null);

  function showPreviousPhoto() {
    setPhotoIndex((current) => (current - 1 + photos.length) % photos.length);
  }

  function showNextPhoto() {
    setPhotoIndex((current) => (current + 1) % photos.length);
  }

  function markCurrentPhotoFailed() {
    if (!currentPhoto) return;
    setFailedPhotos((current) => new Set(current).add(currentPhoto));
  }

  return (
    <div className="profile-preview-page" dir="rtl">
      <main className="profile-preview-layout">
        <header className="profile-preview-header">
          <button
            type="button"
            className="profile-preview-back"
            onClick={onBack}
          >
            <ArrowRight size={20} />
            {backLabel}
          </button>

          <h1 className="profile-preview-logo">
            Trip<span>Match</span>
          </h1>
        </header>

        <div className="profile-preview-context" role="status">
          <Eye size={19} />
          {contextText}
        </div>

        <article className="profile-preview-card">
          <section className="profile-preview-gallery" aria-label={galleryLabel}>
            {currentPhoto && !currentPhotoFailed ? (
              <img
                src={currentPhoto}
                alt={`תמונת פרופיל ${photoIndex + 1} של ${user.name}`}
                onError={markCurrentPhotoFailed}
              />
            ) : (
              <div className="profile-preview-photo-empty">
                <CircleUserRound size={82} strokeWidth={1.5} />
                <span>
                  {currentPhotoFailed
                    ? "לא הצלחנו להציג את התמונה"
                    : "לא הועלתה תמונה"}
                </span>
              </div>
            )}

            <div className="profile-preview-photo-shade" />

            {compatibility !== undefined && (
              <div className="profile-preview-compatibility">
                התאמה <strong>{compatibility}%</strong>
              </div>
            )}

            {galleryAction && (
              <div className="profile-preview-gallery-action">
                {galleryAction}
              </div>
            )}

            {photos.length > 1 && (
              <>
                <div className="profile-preview-progress" aria-hidden="true">
                  {photos.map((photo, index) => (
                    <span key={`${photo}-${index}`} className={index === photoIndex ? "active" : ""} />
                  ))}
                </div>

                <button
                  type="button"
                  className="profile-preview-photo-button previous"
                  onClick={showPreviousPhoto}
                  aria-label="התמונה הקודמת"
                >
                  <ChevronRight size={26} />
                </button>

                <button
                  type="button"
                  className="profile-preview-photo-button next"
                  onClick={showNextPhoto}
                  aria-label="התמונה הבאה"
                >
                  <ChevronLeft size={26} />
                </button>
              </>
            )}

            <div className="profile-preview-identity">
              <h2>
                {user.name}
                {user.age !== undefined ? `, ${user.age}` : ""}
              </h2>
              {meaningful(user.location) && (
                <p>
                  <MapPin size={18} />
                  {meaningful(user.location)}
                </p>
              )}
            </div>
          </section>

          {photos.length > 1 && (
            <div className="profile-preview-thumbnails" aria-label="בחירת תמונת פרופיל">
              {photos.map((photo, index) => (
                <button
                  type="button"
                  key={`${photo}-${index}`}
                  className={index === photoIndex ? "active" : ""}
                  onClick={() => setPhotoIndex(index)}
                  aria-label={`הצגת תמונה ${index + 1}`}
                  aria-current={index === photoIndex ? "true" : undefined}
                >
                  {failedPhotos.has(photo) ? (
                    <CircleUserRound size={24} />
                  ) : (
                    <img
                      src={photo}
                      alt=""
                      loading="lazy"
                      onError={() =>
                        setFailedPhotos((current) =>
                          new Set(current).add(photo),
                        )
                      }
                    />
                  )}
                </button>
              ))}
            </div>
          )}

          <div className="profile-preview-content">
            {travelDetails.length > 0 && (
              <section className="profile-preview-section">
                <h3>הטיול שלי</h3>
                <div className="profile-preview-details-grid">
                  {travelDetails.map(({ label, value, icon: Icon }) => (
                    <div className="profile-preview-detail" key={label}>
                      <Icon size={22} />
                      <div>
                        <span>{label}</span>
                        <strong>{value}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {meaningful(user.bio) && (
              <section className="profile-preview-section">
                <h3>אודותיי</h3>
                <p className="profile-preview-bio">{meaningful(user.bio)}</p>
              </section>
            )}

            {interests.length > 0 && (
              <section className="profile-preview-section">
                <h3>תחומי עניין</h3>
                <div className="profile-preview-tags">
                  {interests.map((interest) => (
                    <span key={interest}>{interest}</span>
                  ))}
                </div>
              </section>
            )}

            {questionnaireDetails.length > 0 && (
              <section className="profile-preview-section profile-preview-travel-style">
                <h3>איך אני מטייל/ת</h3>
                <div className="profile-preview-questionnaire">
                  {questionnaireDetails.map(({ label, value, icon: Icon }) => (
                    <div key={label}>
                      <Icon size={20} />
                      <span>{label}</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </article>

        {footerAction && (
          <div className="profile-preview-footer-action">{footerAction}</div>
        )}
      </main>
    </div>
  );
}

export default function MyProfilePreview() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, updateProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const draftObjectUrlsRef = useRef(new Set<string>());
  const [isEditingPhotos, setIsEditingPhotos] = useState(false);
  const [editablePhotos, setEditablePhotos] = useState<EditablePhoto[]>([]);
  const [photoError, setPhotoError] = useState("");
  const [isSavingPhotos, setIsSavingPhotos] = useState(false);
  const parentProfile = getSafeParentProfilePath(location.state) || "/profile";
  const parentState = getOuterProfileNavigationState(location.state);

  useEffect(() => {
    const draftObjectUrls = draftObjectUrlsRef.current;
    return () => {
      draftObjectUrls.forEach((url) => URL.revokeObjectURL(url));
      draftObjectUrls.clear();
    };
  }, []);

  if (!user) return null;

  const identity = getAuthenticatedIdentity(user);
  const authenticatedProfile = {
    ...user,
    name: identity.name,
    photo: "",
    photoURL: identity.photoURL,
    photos: getAuthenticatedProfilePhotos(user),
  };

  function releaseDraftObjectUrl(url: string) {
    if (!draftObjectUrlsRef.current.has(url)) return;
    URL.revokeObjectURL(url);
    draftObjectUrlsRef.current.delete(url);
  }

  function releaseAllDraftObjectUrls() {
    draftObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    draftObjectUrlsRef.current.clear();
  }

  function openPhotoEditor() {
    setEditablePhotos(
      getAuthenticatedProfilePhotos(user).map((url, index) => ({
        id: `existing-${index}-${url}`,
        url,
      })),
    );
    setPhotoError("");
    setIsEditingPhotos(true);
  }

  function closePhotoEditor() {
    if (isSavingPhotos) return;
    releaseAllDraftObjectUrls();
    setEditablePhotos([]);
    setPhotoError("");
    setIsEditingPhotos(false);
  }

  function handlePhotoSelection(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = "";
    if (selectedFiles.length === 0) return;

    if (
      selectedFiles.some(
        (file) => !SUPPORTED_PROFILE_PHOTO_TYPES.has(file.type),
      )
    ) {
      setPhotoError("אפשר להעלות תמונות מסוג JPG, PNG, WEBP או GIF בלבד.");
      return;
    }

    if (
      selectedFiles.some((file) => file.size > MAX_PROFILE_PHOTO_BYTES)
    ) {
      setPhotoError("גודל כל תמונה יכול להיות עד 5MB.");
      return;
    }

    if (editablePhotos.length + selectedFiles.length > MAX_PROFILE_PHOTOS) {
      setPhotoError("אפשר לשמור עד 6 תמונות בפרופיל.");
      return;
    }

    const additions = selectedFiles.map((file) => {
      const url = URL.createObjectURL(file);
      draftObjectUrlsRef.current.add(url);
      return {
        id: `new-${crypto.randomUUID()}`,
        url,
        file,
      };
    });
    setEditablePhotos((current) => [...current, ...additions]);
    setPhotoError("");
  }

  function requestPhotoSelection() {
    if (editablePhotos.length >= MAX_PROFILE_PHOTOS) {
      setPhotoError("אפשר לשמור עד 6 תמונות בפרופיל.");
      return;
    }

    fileInputRef.current?.click();
  }

  function removeEditablePhoto(id: string) {
    setEditablePhotos((current) => {
      const removed = current.find((photo) => photo.id === id);
      if (removed?.file) releaseDraftObjectUrl(removed.url);
      return current.filter((photo) => photo.id !== id);
    });
    setPhotoError("");
  }

  async function savePhotos() {
    setIsSavingPhotos(true);
    setPhotoError("");

    try {
      const photos = await Promise.all(
        editablePhotos.map((photo) =>
          photo.file ? uploadProfileImage(photo.file) : Promise.resolve(photo.url),
        ),
      );
      await updateProfile({ photos, photoURL: photos[0] || "", photo: "" });
      releaseAllDraftObjectUrls();
      setEditablePhotos([]);
      setIsEditingPhotos(false);
    } catch {
      setPhotoError("לא הצלחנו לשמור את התמונות. נסו שוב.");
    } finally {
      setIsSavingPhotos(false);
    }
  }

  return (
    <>
      <ProfilePreviewView
        profile={authenticatedProfile}
        backLabel="חזרה לפרופיל"
        onBack={() =>
          navigate(parentProfile, { replace: true, state: parentState })
        }
        contextText="כך הפרופיל שלך נראה למטיילים אחרים"
        galleryLabel="תמונות הפרופיל שלי"
        galleryAction={
          <button type="button" onClick={openPhotoEditor}>
            <ImagePlus size={19} />
            עריכת תמונות
          </button>
        }
      />

      {isEditingPhotos && (
        <div
          className="profile-photo-editor-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closePhotoEditor();
          }}
        >
          <section
            className="profile-photo-editor"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-photo-editor-title"
            dir="rtl"
          >
            <header>
              <div>
                <h2 id="profile-photo-editor-title">עריכת תמונות</h2>
                <p>
                  {editablePhotos.length} מתוך {MAX_PROFILE_PHOTOS} תמונות
                </p>
              </div>
              <button
                type="button"
                className="profile-photo-editor-close"
                onClick={closePhotoEditor}
                disabled={isSavingPhotos}
                aria-label="סגירת עריכת התמונות"
              >
                <X size={22} />
              </button>
            </header>

            <div className="profile-photo-editor-grid">
              {editablePhotos.map((photo, index) => (
                <figure key={photo.id}>
                  <SafeImage
                    src={photo.url}
                    alt={`תמונת פרופיל ${index + 1}`}
                    loading="lazy"
                  />
                  {index === 0 && <span>תמונה ראשית</span>}
                  <button
                    type="button"
                    onClick={() => removeEditablePhoto(photo.id)}
                    disabled={isSavingPhotos}
                    aria-label={`מחיקת תמונה ${index + 1}`}
                  >
                    <Trash2 size={18} />
                  </button>
                </figure>
              ))}

              <button
                type="button"
                className="profile-photo-editor-add"
                onClick={requestPhotoSelection}
                disabled={isSavingPhotos}
              >
                <ImagePlus size={30} />
                {editablePhotos.length >= MAX_PROFILE_PHOTOS
                  ? "הגעת למגבלה"
                  : "הוספת תמונה"}
              </button>
            </div>

            <input
              ref={fileInputRef}
              className="profile-photo-editor-input"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              onChange={handlePhotoSelection}
            />

            {photoError && (
              <p className="profile-photo-editor-error" role="alert">
                {photoError}
              </p>
            )}

            <footer>
              <button
                type="button"
                className="profile-photo-editor-cancel"
                onClick={closePhotoEditor}
                disabled={isSavingPhotos}
              >
                ביטול
              </button>
              <button
                type="button"
                className="profile-photo-editor-save"
                onClick={savePhotos}
                disabled={isSavingPhotos}
              >
                {isSavingPhotos ? (
                  <LoaderCircle
                    className="profile-photo-editor-spinner"
                    size={19}
                  />
                ) : (
                  <Save size={19} />
                )}
                {isSavingPhotos ? "שומר..." : "שמירה"}
              </button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
