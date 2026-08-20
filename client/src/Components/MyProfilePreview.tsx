import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
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
  MapPin,
  Plane,
  ShieldAlert,
  Sparkles,
  UsersRound,
  Wallet,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import type { ProfilePreviewUser } from "../services/authService";
import { getTripLocationLabel } from "./TripLocationPicker";
import "./MyProfilePreview.css";

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

  const destinations = Array.from(
    new Set(
      [
        ...(user.tripLocation ? [getTripLocationLabel(user.tripLocation)] : []),
        ...(user.preferredDestinations || []),
      ]
        .map((destination) => destination.trim())
        .filter(Boolean),
    ),
  );
  const interests = Array.from(
    new Set(
      (user.interests || [])
        .map((interest) => interest.trim())
        .filter(Boolean),
    ),
  );
  const travelDetails: DetailItem[] = [
    destinations.length
      ? { label: "יעד", value: destinations.join(" · "), icon: Plane }
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
    meaningful(user.questionnaire?.planningStyle)
      ? {
          label: "איך אני מתכננ/ת",
          value: meaningful(user.questionnaire?.planningStyle),
          icon: Sparkles,
        }
      : null,
    meaningful(user.questionnaire?.accommodationPreference)
      ? {
          label: "העדפת לינה",
          value: meaningful(user.questionnaire?.accommodationPreference),
          icon: BedDouble,
        }
      : null,
    meaningful(user.questionnaire?.companionScope)
      ? {
          label: "שותפות לטיול",
          value: meaningful(user.questionnaire?.companionScope),
          icon: UsersRound,
        }
      : null,
    meaningful(user.questionnaire?.companionPriority)
      ? {
          label: "מה חשוב לי בשותפ/ה",
          value: meaningful(user.questionnaire?.companionPriority),
          icon: Sparkles,
        }
      : null,
    meaningful(user.questionnaire?.dealBreaker)
      ? {
          label: "קו אדום מבחינתי",
          value: meaningful(user.questionnaire?.dealBreaker),
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
  const { user } = useAuth();

  if (!user) return null;

  return (
    <ProfilePreviewView
      profile={user}
      backLabel="חזרה לפרופיל"
      onBack={() => navigate("/profile")}
      contextText="כך הפרופיל שלך נראה למטיילים אחרים"
      galleryLabel="תמונות הפרופיל שלי"
    />
  );
}
