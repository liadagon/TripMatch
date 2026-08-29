import {
  ChangeEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { AuthUser } from "../services/authService";
import { uploadProfileImage } from "../services/profileService";
import {
  getPreviousOnboardingPath,
  getProfileCompletionPath,
} from "../utils/authNavigation";

import "./PhotoUpload.css";
import SafeImage from "./SafeImage";

const MAX_PHOTOS = 6;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

type PhotoItem = {
  id: string;
  file?: File;
  previewUrl: string;
};

/** Normalizes persisted profile images into the fixed upload-slot model. */
function getPersistedPhotos(user: AuthUser | null) {
  const urls = [
    ...(user?.photos || []),
    user?.photoURL,
    user?.photo,
  ].filter((url, index, all): url is string =>
    Boolean(url?.trim()) && all.indexOf(url) === index,
  );

  const persistedPhotos: Array<PhotoItem | null> = Array(MAX_PHOTOS).fill(null);
  urls.slice(0, MAX_PHOTOS).forEach((previewUrl, index) => {
    persistedPhotos[index] = {
      id: `persisted-${index}-${previewUrl}`,
      previewUrl,
    };
  });
  return persistedPhotos;
}

const PhotoUpload = () => {
  const navigate = useNavigate();
  const { user, updateProfile, logout } = useAuth();

  const [photos, setPhotos] = useState<Array<PhotoItem | null>>(
    () => getPersistedPhotos(user),
  );

  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  /** Creates a revocable browser preview for a newly selected image. */
  const createPhotoItem = (file: File): PhotoItem => {
    return {
      id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
      file,
      previewUrl: URL.createObjectURL(file),
    };
  };

  /** Validates the selected image type and size before upload. */
  const validateFile = (file: File) => {
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return "אפשר להעלות קבצי תמונה בלבד.";
    }

    if (file.size > MAX_FILE_SIZE) {
      return "התמונה גדולה מדי. ניתן להעלות תמונה עד 5MB.";
    }

    return "";
  };

  const handlePhotoChange = (
    event: ChangeEvent<HTMLInputElement>,
    index: number
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const validationError = validateFile(file);

    if (validationError) {
      setError(validationError);
      event.target.value = "";
      return;
    }

    setError("");

    setPhotos((currentPhotos) => {
      const updatedPhotos = [...currentPhotos];

      const oldPhoto = updatedPhotos[index];

      if (oldPhoto) {
        URL.revokeObjectURL(oldPhoto.previewUrl);
      }

      updatedPhotos[index] = createPhotoItem(file);

      return updatedPhotos;
    });

    event.target.value = "";
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((currentPhotos) => {
      const updatedPhotos = [...currentPhotos];

      const photoToRemove = updatedPhotos[index];

      if (photoToRemove) {
        URL.revokeObjectURL(photoToRemove.previewUrl);
      }

      updatedPhotos[index] = null;

      return updatedPhotos;
    });

    setError("");
  };

  const openFilePicker = (index: number) => {
    fileInputRefs.current[index]?.click();
  };

  const handleSlotKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
    index: number
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openFilePicker(index);
    }
  };

  /** Uploads selected images, persists their order, and advances onboarding. */
  const handleContinue = async () => {
    if (isSaving) return;

    const selectedPhotos = photos.filter(
      (photo): photo is PhotoItem => photo !== null
    );

    if (selectedPhotos.length === 0) {
      setError("הוסיפו לפחות תמונה אחת כדי להמשיך.");
      return;
    }

    setError("");
    setIsSaving(true);

    try {
      const uploadedUrls = await Promise.all(
        selectedPhotos.map((photo) =>
          photo.file
            ? uploadProfileImage(photo.file)
            : Promise.resolve(photo.previewUrl),
        ),
      );

      const updatedUser = await updateProfile({
        photos: uploadedUrls,
        photoURL: uploadedUrls[0],
      });
      navigate(getProfileCompletionPath(updatedUser), { replace: true });
    } catch {
      setError("לא הצלחנו להעלות ולשמור את התמונות. הבחירות נשמרו, נסו שוב.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = async () => {
    await logout();
    navigate(getPreviousOnboardingPath("/photo-upload"), { replace: true });
  };

  useEffect(() => {
    return () => {
      photos.forEach((photo) => {
        if (photo?.file) {
          URL.revokeObjectURL(photo.previewUrl);
        }
      });
    };
  }, []);

  const selectedPhotoCount = photos.filter(Boolean).length;

  return (
    <div className="photo-upload-page">
      <header className="photo-upload-header">
        <div className="photo-upload-logo" aria-label="TripMatch">
          <span className="photo-upload-logo-trip">Trip</span>
          <span className="photo-upload-logo-match">Match</span>
        </div>

        <button
          type="button"
          className="photo-upload-back"
          onClick={() => void handleBack()}
        >
          חזרה
        </button>
      </header>

      <main className="photo-upload-main">
        <section className="photo-upload-card">
          <div className="photo-upload-icon" aria-hidden="true">
            <svg
              width="34"
              height="34"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="3"
                y="4"
                width="18"
                height="16"
                rx="3"
                stroke="currentColor"
                strokeWidth="1.8"
              />

              <circle
                cx="9"
                cy="9"
                r="1.5"
                fill="currentColor"
              />

              <path
                d="M4.5 17L9.5 12L13 15L15.5 12.5L19.5 17"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <h1>העלו את התמונות שלכם</h1>

          <p className="photo-upload-subtitle">
            הוסיפו עד 6 תמונות שיציגו אתכם בצורה הטובה ביותר
          </p>

          <div className="photo-upload-counter">
            {selectedPhotoCount} מתוך {MAX_PHOTOS} תמונות
          </div>

          <div className="photo-upload-grid">
            {photos.map((photo, index) => (
              <div
                key={index}
                className={`photo-upload-slot ${
                  photo ? "photo-upload-slot-filled" : ""
                }`}
                role="button"
                tabIndex={0}
                aria-label={
                  photo
                    ? `החלפת תמונה ${index + 1}`
                    : `הוספת תמונה ${index + 1}`
                }
                onClick={() => openFilePicker(index)}
                onKeyDown={(event) =>
                  handleSlotKeyDown(event, index)
                }
              >
                <input
                  ref={(element) => {
                    fileInputRefs.current[index] = element;
                  }}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="photo-upload-input"
                  onChange={(event) =>
                    handlePhotoChange(event, index)
                  }
                />

                {photo ? (
                  <>
                    <SafeImage
                      src={photo.previewUrl}
                      alt={`תמונה ${index + 1}`}
                      className="photo-upload-preview"
                      loading="lazy"
                      fallbackClassName="photo-upload-preview"
                    />

                    <div className="photo-upload-image-overlay">
                      <span>החלפה</span>
                    </div>

                    <button
                      type="button"
                      className="photo-upload-remove"
                      aria-label={`מחיקת תמונה ${index + 1}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleRemovePhoto(index);
                      }}
                    >
                      ×
                    </button>
                  </>
                ) : (
                  <div className="photo-upload-placeholder">
                    <span className="photo-upload-plus">+</span>
                    <span>הוספת תמונה</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {error && (
            <p className="photo-upload-error" role="alert">
              {error}
            </p>
          )}

          <button
            type="button"
            className="photo-upload-continue"
            onClick={() => void handleContinue()}
            disabled={isSaving}
          >
            {isSaving ? "מעלים ושומרים..." : "המשך"}
          </button>
        </section>
      </main>
    </div>
  );
};

export default PhotoUpload;
