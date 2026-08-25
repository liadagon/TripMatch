import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Camera,
  CircleUserRound,
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
import {
  uploadProfileImage,
  type ProfileUpdatePayload,
} from "../services/profileService";
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
import {
  getAuthenticatedIdentity,
} from "../utils/authenticatedIdentity";
import {
  PROFILE_OPTIONS,
  filterCanonicalInterests,
} from "../data/profileOptions";
import { getGenderedQuestionnaireOptionLabel } from "../utils/genderedHebrew";

type ProfileData = {
  name: string;
  age: string;
  city: string;
  tripLocation: TripLocation | null;
  dates: string;
  duration: string;
  preferredDestination: string;
  budget: string;
  travelStyle: string;
  interests: string[];
  accommodationPreference: string;
  companionScope: string;
  companionPriority: string;
  dealBreaker: string;
  aboutMe: string;
  imageUrl: string;
};

type ProfileField =
  | "name"
  | "age"
  | "photo"
  | "tripLocation"
  | "dates"
  | "duration"
  | "preferredDestination"
  | "budget"
  | "travelStyle"
  | "accommodationPreference"
  | "companionScope"
  | "companionPriority"
  | "dealBreaker"
  | "interests"
  | "aboutMe";

type ProfileFieldErrors = Partial<Record<ProfileField, string>>;

const REQUIRED_FIELDS_MESSAGE =
  "לא כל השדות הנדרשים הושלמו. יש להשלים את השדות המסומנים.";

const MAX_PROFILE_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_PROFILE_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const emptyProfile: ProfileData = {
  name: "",
  age: "",
  city: "",
  tripLocation: null,
  dates: "",
  duration: "",
  preferredDestination: "",
  budget: "",
  travelStyle: "",
  interests: [],
  accommodationPreference: "",
  companionScope: "",
  companionPriority: "",
  dealBreaker: "",
  aboutMe: "",
  imageUrl: "",
};

function profileFromUser(user: AuthUser | null): ProfileData {
  const identity = getAuthenticatedIdentity(user);

  return {
    ...emptyProfile,
    name: identity.name,
    age: user?.age === undefined ? "" : String(user.age),
    city: user?.tripLocation
      ? getTripLocationLabel(user.tripLocation)
      : user?.location || "",
    tripLocation: user?.tripLocation || null,
    dates: user?.tripDates || "",
    duration: user?.tripDuration || "",
    preferredDestination: user?.preferredDestinations?.[0] || "",
    budget: user?.budget || "",
    travelStyle: user?.travelStyle || "",
    interests: filterCanonicalInterests(user?.interests),
    accommodationPreference:
      user?.questionnaire?.accommodationPreference || "",
    companionScope: user?.questionnaire?.companionScope || "",
    companionPriority: user?.questionnaire?.companionPriority || "",
    dealBreaker: user?.questionnaire?.dealBreaker || "",
    aboutMe: user?.bio || "",
    imageUrl: identity.photoURL,
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
      return "לא הצלחנו להתחבר לשרת. יש לבדוק את החיבור ולנסות שוב";
    }

    if (error.response.status === 400) {
      return "השרת דחה את קובץ התמונה. יש לבחור תמונה תקינה עד 5MB";
    }
  }

  return "לא הצלחנו להעלות ולשמור את התמונה. יש לנסות שוב";
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

function getBackendProfileFieldErrors(error: unknown): ProfileFieldErrors {
  if (!axios.isAxiosError(error) || error.response?.status !== 400) return {};
  const backendFields = error.response.data?.fields;
  if (backendFields && typeof backendFields === "object") {
    const fieldNames: Record<string, ProfileField> = {
      photo: "photo",
      age: "age",
      tripLocation: "tripLocation",
      preferredDestinations: "preferredDestination",
      tripDates: "dates",
      tripDuration: "duration",
      budget: "budget",
      travelStyle: "travelStyle",
      accommodationPreference: "accommodationPreference",
      companionScope: "companionScope",
      companionPriority: "companionPriority",
      dealBreaker: "dealBreaker",
      interests: "interests",
      bio: "aboutMe",
    };
    return Object.fromEntries(
      Object.entries(backendFields)
        .filter(([field, fieldMessage]) => fieldNames[field] && typeof fieldMessage === "string")
        .map(([field, fieldMessage]) => [fieldNames[field], fieldMessage]),
    );
  }
  const message = String(error.response.data?.message || "");
  const mappings: Array<[string, ProfileField, string]> = [
    ["name", "name", "יש להזין שם באורך של לפחות 2 תווים."],
    ["age", "age", "יש להזין גיל תקין בין 18 ל-120."],
    ["tripLocation", "tripLocation", "יש לבחור יעד לטיול."],
    ["preferredDestinations", "preferredDestination", "יש לבחור יעד מועדף לטיול."],
    ["tripDates", "dates", "יש לבחור תאריכי טיול."],
    ["tripDuration", "duration", "יש לבחור משך טיול."],
    ["budget", "budget", "יש לבחור תקציב."],
    ["travelStyle", "travelStyle", "יש לבחור סגנון טיול."],
    ["accommodationPreference", "accommodationPreference", "יש לבחור העדפת לינה."],
    ["companionScope", "companionScope", "יש לבחור עם מי תרצו לטייל."],
    ["companionPriority", "companionPriority", "יש לבחור מה חשוב בהתאמה לטיול."],
    ["dealBreaker", "dealBreaker", "יש לבחור מה מהווה מבחינתכם Deal Breaker."],
    ["interests", "interests", "יש לבחור לפחות תחום עניין אחד."],
    ["bio", "aboutMe", "יש לכתוב בין 20 ל-300 תווים."],
  ];

  return Object.fromEntries(
    mappings
      .filter(([backendField]) => message.includes(backendField))
      .map(([, field, fieldMessage]) => [field, fieldMessage]),
  );
}

function optionsWithCurrent(
  options: readonly string[],
  currentValue: string,
) {
  return currentValue && !options.some((option) => option === currentValue)
    ? [currentValue, ...options]
    : options;
}

function hasValidTripLocation(location: TripLocation | null) {
  return Boolean(
    location &&
      location.placeId.trim() &&
      location.name.trim() &&
      location.formattedAddress.trim() &&
      Number.isFinite(location.latitude) &&
      Number.isFinite(location.longitude) &&
      location.country.trim() &&
      location.countryCode.trim(),
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, deleteAccount, updateProfile: persistProfile } = useAuth();
  const directPhotoInputRef = useRef<HTMLInputElement>(null);
  const modalPhotoInputRef = useRef<HTMLInputElement>(null);
  const editFormRef = useRef<HTMLFormElement>(null);
  const [profile, setProfile] = useState<ProfileData>(() => profileFromUser(user));
  const [draftProfile, setDraftProfile] = useState<ProfileData>(profile);
  const [pendingProfileImage, setPendingProfileImage] = useState<File | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [tripLocationError, setTripLocationError] = useState("");
  const [profileSaveError, setProfileSaveError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<ProfileFieldErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [statistics, setStatistics] = useState<ProfileStatistics | null>(null);
  const [hasPrivateBoostBadge, setHasPrivateBoostBadge] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState("");

  useEffect(() => {
    const nextProfile = profileFromUser(user);
    setProfile(nextProfile);
    setDraftProfile(nextProfile);
    setPendingProfileImage(null);
    setIsEditing(false);
    setStatistics(null);
    setHasPrivateBoostBadge(false);
  }, [user]);

  useEffect(() => {
    if (!user?.registrationComplete) {
      setStatistics(null);
      return;
    }

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
  }, [user?._id, user?.registrationComplete]);

  useEffect(() => {
    if (!user?.registrationComplete) {
      setHasPrivateBoostBadge(false);
      return;
    }

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
  }, [user?._id, user?.registrationComplete]);

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
    setProfileSaveError("");
    setFieldErrors({});
  }

  function closeEditModal() {
    setDraftProfile(profile);
    setPendingProfileImage(null);
    setIsEditing(false);
    setPhotoError("");
    setTripLocationError("");
    setProfileSaveError("");
    setFieldErrors({});
  }

  function clearFieldError(field: ProfileField) {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function focusFirstInvalidField(errors: ProfileFieldErrors) {
    const firstField = Object.keys(errors)[0] as ProfileField | undefined;
    if (!firstField) return;

    window.requestAnimationFrame(() => {
      const field = editFormRef.current?.querySelector<HTMLElement>(
        `[data-profile-field="${firstField}"]`,
      );
      field?.scrollIntoView({ behavior: "smooth", block: "center" });
      field
        ?.querySelector<HTMLElement>("input, select, textarea, button")
        ?.focus({ preventScroll: true });
    });
  }

  function showValidationErrors(errors: ProfileFieldErrors) {
    setFieldErrors(errors);
    setProfileSaveError(REQUIRED_FIELDS_MESSAGE);
    focusFirstInvalidField(errors);
  }

  function validateProfileDraft() {
    const errors: ProfileFieldErrors = {};
    const requireExistingValue = (currentValue: string, nextValue: string) =>
      Boolean(currentValue.trim()) || Boolean(nextValue.trim());

    if (draftProfile.name.trim().length < 2) {
      errors.name = "יש להזין שם באורך של לפחות 2 תווים.";
    }

    const normalizedAge = draftProfile.age.trim();
    if (
      (Boolean(profile.age.trim()) || Boolean(normalizedAge)) &&
      (!Number.isInteger(Number(normalizedAge)) ||
        Number(normalizedAge) < 18 ||
        Number(normalizedAge) > 120)
    ) {
      errors.age = "יש להזין גיל תקין בין 18 ל-120.";
    }

    if (
      (Boolean(profile.tripLocation) || Boolean(draftProfile.tripLocation)) &&
      !hasValidTripLocation(draftProfile.tripLocation)
    ) {
      errors.tripLocation = "יש לבחור יעד לטיול.";
    }

    const requiredTextFields: Array<[
      ProfileField,
      string,
      string,
      string,
    ]> = [
      ["preferredDestination", profile.preferredDestination, draftProfile.preferredDestination, "יש לבחור יעד מועדף לטיול."],
      ["dates", profile.dates, draftProfile.dates, "יש לבחור תאריכי טיול."],
      ["duration", profile.duration, draftProfile.duration, "יש לבחור משך טיול."],
      ["budget", profile.budget, draftProfile.budget, "יש לבחור תקציב."],
      ["travelStyle", profile.travelStyle, draftProfile.travelStyle, "יש לבחור סגנון טיול."],
      ["accommodationPreference", profile.accommodationPreference, draftProfile.accommodationPreference, "יש לבחור העדפת לינה."],
      ["companionScope", profile.companionScope, draftProfile.companionScope, "יש לבחור עם מי תרצו לטייל."],
      ["companionPriority", profile.companionPriority, draftProfile.companionPriority, "יש לבחור מה חשוב בהתאמה לטיול."],
      ["dealBreaker", profile.dealBreaker, draftProfile.dealBreaker, "יש לבחור מה מהווה מבחינתכם Deal Breaker."],
    ];
    requiredTextFields.forEach(([field, currentValue, nextValue, message]) => {
      if (requireExistingValue(currentValue, nextValue) && !nextValue.trim()) {
        errors[field] = message;
      }
    });

    const hasCurrentInterests = profile.interests.some(
      (interest) => interest.trim().length > 0,
    );
    const hasDraftInterests = draftProfile.interests.some(
      (interest) => interest.trim().length > 0,
    );
    if (hasCurrentInterests && !hasDraftInterests) {
      errors.interests = "יש לבחור לפחות תחום עניין אחד.";
    }

    const normalizedBio = draftProfile.aboutMe.trim();
    if (normalizedBio.length < 20) {
      errors.aboutMe = "יש לכתוב לפחות 20 תווים.";
    } else if (normalizedBio.length > 300) {
      errors.aboutMe = "ניתן לכתוב עד 300 תווים.";
    }

    return errors;
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
    clearFieldError(field as ProfileField);
  }

  function toggleInterest(interest: string) {
    if (
      !draftProfile.interests.includes(interest) &&
      draftProfile.interests.length >= 10
    ) {
      setProfileSaveError("ניתן לבחור עד 10 תחומי עניין.");
      return;
    }

    setDraftProfile((current) => ({
      ...current,
      interests: current.interests.includes(interest)
        ? current.interests.filter((item) => item !== interest)
        : [...current.interests, interest],
    }));
    clearFieldError("interests");
    setProfileSaveError("");
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
        clearFieldError("photo");
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
    const normalizedAge = draftProfile.age.trim();
    const validationErrors = validateProfileDraft();
    if (Object.keys(validationErrors).length > 0) {
      showValidationErrors(validationErrors);
      return;
    }

    setIsSaving(true);
    setPhotoError("");
    setTripLocationError("");
    setProfileSaveError("");
    setFieldErrors({});

    let pendingImageUploaded = false;
    try {
      const imageUrl = pendingProfileImage
        ? await uploadProfileImage(pendingProfileImage)
        : draftProfile.imageUrl;
      pendingImageUploaded = Boolean(pendingProfileImage);
      const payload: ProfileUpdatePayload = {};
      const normalizedName = draftProfile.name.trim();
      const normalizedBio = draftProfile.aboutMe.trim();
      const normalizedDates = draftProfile.dates.trim();
      const normalizedDuration = draftProfile.duration.trim();
      const normalizedBudget = draftProfile.budget.trim();
      const normalizedTravelStyle = draftProfile.travelStyle.trim();
      const normalizedPreferredDestination =
        draftProfile.preferredDestination.trim();
      const normalizedInterests = filterCanonicalInterests(
        draftProfile.interests,
      );

      if (normalizedName !== profile.name.trim()) payload.name = normalizedName;
      if (normalizedAge && normalizedAge !== profile.age.trim()) {
        payload.age = Number(normalizedAge);
      }
      if (
        JSON.stringify(draftProfile.tripLocation) !==
        JSON.stringify(profile.tripLocation)
      ) {
        if (draftProfile.tripLocation) {
          payload.tripLocation = draftProfile.tripLocation;
        }
      }
      if (normalizedDates !== profile.dates.trim()) payload.tripDates = normalizedDates;
      if (normalizedDuration !== profile.duration.trim()) {
        payload.tripDuration = normalizedDuration;
      }
      if (normalizedBudget !== profile.budget.trim()) payload.budget = normalizedBudget;
      if (normalizedTravelStyle !== profile.travelStyle.trim()) {
        payload.travelStyle = normalizedTravelStyle;
      }
      if (normalizedPreferredDestination !== profile.preferredDestination.trim()) {
        payload.preferredDestinations = normalizedPreferredDestination
          ? [normalizedPreferredDestination]
          : [];
      }
      payload.interests = normalizedInterests;
      if (normalizedBio !== profile.aboutMe.trim()) payload.bio = normalizedBio;

      const questionnaireChanges: NonNullable<ProfileUpdatePayload["questionnaire"]> = {};
      const questionnaireFields = [
        "accommodationPreference",
        "companionScope",
        "companionPriority",
        "dealBreaker",
      ] as const;
      questionnaireFields.forEach((field) => {
        const nextValue = draftProfile[field].trim();
        if (nextValue !== profile[field].trim()) questionnaireChanges[field] = nextValue;
      });
      if (Object.keys(questionnaireChanges).length > 0) {
        payload.questionnaire = questionnaireChanges;
      }
      if (pendingProfileImage) {
        payload.photoURL = imageUrl;
        payload.photos = replacePrimaryPhoto(user?.photos, imageUrl);
      }

      if (Object.keys(payload).length === 0) {
        setIsEditing(false);
        return;
      }

      const updatedUser = await persistProfile(payload);
      setProfile(profileFromUser(updatedUser));
      setPendingProfileImage(null);
      setIsEditing(false);
      setShowSuccess(true);
    } catch (error) {
      const backendErrors = getBackendProfileFieldErrors(error);
      if (Object.keys(backendErrors).length > 0) {
        showValidationErrors(backendErrors);
      } else if (pendingProfileImage && !pendingImageUploaded) {
        setPhotoError(getProfilePhotoError(error));
        showValidationErrors({ photo: getProfilePhotoError(error) });
      } else {
        setProfileSaveError("לא הצלחנו לשמור את השינויים. נסו שוב.");
      }
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
          "לא הצלחנו למחוק את החשבון בבטחה. החשבון נשמר ולא נמחק. יש לנסות שוב.",
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
          <button type="button" className="profile-back-btn" onClick={handleBack}>
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
            {profile.imageUrl ? (
              <img
                className="profile-avatar"
                src={profile.imageUrl}
                alt={`תמונת הפרופיל של ${profile.name}`}
              />
            ) : (
              <div className="profile-avatar profile-avatar-empty" aria-hidden="true">
                <CircleUserRound size={82} />
              </div>
            )}
          </div>

          <div className="profile-content">
            <div className="profile-title-row">
              <div>
                <h2>
                  {profile.name || "הפרופיל שלי"}
                  {profile.age ? `, ${profile.age}` : ""}
                </h2>
                {profile.city && (
                  <p>
                    <MapPin size={16} />
                    {profile.city}
                  </p>
                )}
                {hasPrivateBoostBadge && (
                  <div className="profile-private-boost-badge" role="status">
                    <Zap size={16} fill="currentColor" />
                    TripMatch Boost פעיל
                    <small>מוצג רק לך</small>
                  </div>
                )}
              </div>

              <div className="profile-title-actions">
                {user?.registrationComplete && (
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
                )}

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

                {profile.duration && (
                  <div className="profile-info-item">
                    <CalendarDays size={22} />
                    <div>
                      <span>משך</span>
                      <strong>{profile.duration}</strong>
                    </div>
                  </div>
                )}

                {profile.preferredDestination && (
                  <div className="profile-info-item">
                    <MapPin size={22} />
                    <div>
                      <span>אזור מועדף</span>
                      <strong>{profile.preferredDestination}</strong>
                    </div>
                  </div>
                )}

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
              <h3>העדפות הטיול שלי</h3>

              <div className="profile-preferences-grid">
                {[
                  ["לינה מועדפת", profile.accommodationPreference],
                  ["שותפות לטיול", profile.companionScope],
                  ["מה חשוב לי בהתאמה", profile.companionPriority],
                  ["קו אדום מבחינתי", profile.dealBreaker],
                ].map(([label, value]) =>
                  value ? (
                    <div key={label}>
                      <span>{label}</span>
                      <strong>
                        {getGenderedQuestionnaireOptionLabel(value, user?.gender)}
                      </strong>
                    </div>
                  ) : null,
                )}
              </div>
              {[
                profile.duration,
                profile.preferredDestination,
                profile.accommodationPreference,
                profile.companionScope,
                profile.companionPriority,
                profile.dealBreaker,
              ].some((value) => !value) && (
                <button
                  type="button"
                  className="profile-complete-preferences"
                  onClick={openEditModal}
                >
                  השלמת העדפות חסרות תעזור לדייק את ההתאמות
                </button>
              )}
            </section>

            <section className="profile-safe-box">
              <ShieldCheck size={24} />
              <div>
                <strong>הפרופיל שלך מוגן</strong>
                <p>המידע מוצג רק למשתמשים רלוונטיים בתוך TripMatch</p>
              </div>
            </section>

            {user?.registrationComplete && (
              <button
                type="button"
                className="profile-blocked-users-btn"
                onClick={() =>
                  navigate("/blocked-users", { state: location.state })
                }
              >
                <Ban size={18} />
                משתמשים חסומים
              </button>
            )}

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

            <form ref={editFormRef} className="profile-edit-form" onSubmit={saveProfile} noValidate>
              {profileSaveError && (
                <div className="profile-error-message profile-general-validation profile-form-wide" role="alert">
                  {profileSaveError}
                </div>
              )}
              <label
                data-profile-field="name"
                className={fieldErrors.name ? "profile-field-invalid" : ""}
              >
                <span>שם</span>
                <input
                  value={draftProfile.name}
                  aria-invalid={Boolean(fieldErrors.name)}
                  onChange={(event) => updateDraft("name", event.target.value)}
                />
                {fieldErrors.name && <small className="profile-field-error">{fieldErrors.name}</small>}
              </label>

              <label
                data-profile-field="age"
                className={fieldErrors.age ? "profile-field-invalid" : ""}
              >
                <span>גיל</span>
                <input
                  type="number"
                  min="18"
                  max="120"
                  value={draftProfile.age}
                  aria-invalid={Boolean(fieldErrors.age)}
                  onChange={(event) => updateDraft("age", event.target.value)}
                />
                {fieldErrors.age && <small className="profile-field-error">{fieldErrors.age}</small>}
              </label>

              <div
                data-profile-field="tripLocation"
                className={`profile-trip-location profile-form-wide ${fieldErrors.tripLocation ? "profile-field-invalid" : ""}`}
              >
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
                    clearFieldError("tripLocation");
                    setTripLocationError("");
                  }}
                  hasError={Boolean(fieldErrors.tripLocation || tripLocationError)}
                  disabled={isSaving}
                />
                {(fieldErrors.tripLocation || tripLocationError) && (
                  <small className="profile-field-error">{fieldErrors.tripLocation || tripLocationError}</small>
                )}
              </div>

              <label data-profile-field="dates" className={fieldErrors.dates ? "profile-field-invalid" : ""}>
                <span>תאריכי טיול *</span>
                <select
                  value={draftProfile.dates}
                  aria-invalid={Boolean(fieldErrors.dates)}
                  onChange={(event) => updateDraft("dates", event.target.value)}
                >
                  <option value="">בחירת מועד</option>
                  {optionsWithCurrent(PROFILE_OPTIONS.tripDates, draftProfile.dates).map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                {fieldErrors.dates && <small className="profile-field-error">{fieldErrors.dates}</small>}
              </label>

              <label data-profile-field="duration" className={fieldErrors.duration ? "profile-field-invalid" : ""}>
                <span>משך הטיול</span>
                <select
                  value={draftProfile.duration}
                  aria-invalid={Boolean(fieldErrors.duration)}
                  onChange={(event) => updateDraft("duration", event.target.value)}
                >
                  <option value="">בחירת משך</option>
                  {optionsWithCurrent(PROFILE_OPTIONS.tripDurations, draftProfile.duration).map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                {fieldErrors.duration && <small className="profile-field-error">{fieldErrors.duration}</small>}
              </label>

              <label data-profile-field="preferredDestination" className={fieldErrors.preferredDestination ? "profile-field-invalid" : ""}>
                <span>אזור מועדף לטיול *</span>
                <select
                  value={draftProfile.preferredDestination}
                  aria-invalid={Boolean(fieldErrors.preferredDestination)}
                  onChange={(event) => updateDraft("preferredDestination", event.target.value)}
                >
                  <option value="">בחירת אזור</option>
                  {optionsWithCurrent(PROFILE_OPTIONS.destinations, draftProfile.preferredDestination).map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                {fieldErrors.preferredDestination && <small className="profile-field-error">{fieldErrors.preferredDestination}</small>}
              </label>

              <label data-profile-field="budget" className={fieldErrors.budget ? "profile-field-invalid" : ""}>
                <span>תקציב *</span>
                <select
                  value={draftProfile.budget}
                  aria-invalid={Boolean(fieldErrors.budget)}
                  onChange={(event) => updateDraft("budget", event.target.value)}
                >
                  <option value="">בחירת תקציב</option>
                  {optionsWithCurrent(PROFILE_OPTIONS.budgets, draftProfile.budget).map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                {fieldErrors.budget && <small className="profile-field-error">{fieldErrors.budget}</small>}
              </label>

              <label data-profile-field="travelStyle" className={fieldErrors.travelStyle ? "profile-field-invalid" : ""}>
                <span>סגנון טיול *</span>
                <select
                  value={draftProfile.travelStyle}
                  aria-invalid={Boolean(fieldErrors.travelStyle)}
                  onChange={(event) => updateDraft("travelStyle", event.target.value)}
                >
                  <option value="">בחירת סגנון</option>
                  {optionsWithCurrent(PROFILE_OPTIONS.travelStyles, draftProfile.travelStyle).map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                {fieldErrors.travelStyle && <small className="profile-field-error">{fieldErrors.travelStyle}</small>}
              </label>

              {([
                ["לינה מועדפת", "accommodationPreference", PROFILE_OPTIONS.accommodationPreferences],
                ["שותפות לטיול", "companionScope", PROFILE_OPTIONS.companionScopes],
                ["מה חשוב לי בהתאמה", "companionPriority", PROFILE_OPTIONS.companionPriorities],
                ["קו אדום מבחינתי", "dealBreaker", PROFILE_OPTIONS.dealBreakers],
              ] as Array<[string, ProfileField, readonly string[]]>).map(([label, field, options]) => {
                const key = field as Exclude<keyof ProfileData, "tripLocation">;
                const value = draftProfile[key] as string;
                return (
                  <label
                    key={field}
                    data-profile-field={field}
                    className={fieldErrors[key as ProfileField] ? "profile-field-invalid" : ""}
                  >
                    <span>{label}</span>
                    <select
                      value={value}
                      aria-invalid={Boolean(fieldErrors[key as ProfileField])}
                      onChange={(event) => updateDraft(key, event.target.value)}
                    >
                      <option value="">לא נבחר</option>
                      {optionsWithCurrent(options as readonly string[], value).map((option) => (
                        <option key={option} value={option}>
                          {getGenderedQuestionnaireOptionLabel(option, user?.gender)}
                        </option>
                      ))}
                    </select>
                    {fieldErrors[key as ProfileField] && (
                      <small className="profile-field-error">{fieldErrors[key as ProfileField]}</small>
                    )}
                  </label>
                );
              })}

              <div
                data-profile-field="photo"
                className={`profile-photo-picker profile-form-wide ${fieldErrors.photo ? "profile-field-invalid" : ""}`}
              >
                <span>תמונת פרופיל</span>
                <div className="profile-photo-picker-content">
                  <img
                    src={draftProfile.imageUrl}
                    alt="תצוגה מקדימה של תמונת הפרופיל"
                    loading="lazy"
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
                {(fieldErrors.photo || photoError) && (
                  <small className="profile-field-error">{fieldErrors.photo || photoError}</small>
                )}
              </div>

              <fieldset
                data-profile-field="interests"
                className={`profile-interest-picker profile-form-wide ${fieldErrors.interests ? "profile-field-invalid" : ""}`}
              >
                <legend>תחומי עניין</legend>
                <div>
                  {PROFILE_OPTIONS.interests.map((interest) => (
                    <button
                      key={interest}
                      type="button"
                      className={draftProfile.interests.includes(interest) ? "selected" : ""}
                      aria-pressed={draftProfile.interests.includes(interest)}
                      onClick={() => toggleInterest(interest)}
                    >
                      {interest}
                    </button>
                  ))}
                </div>
                {fieldErrors.interests && <small className="profile-field-error">{fieldErrors.interests}</small>}
              </fieldset>

              <label
                data-profile-field="aboutMe"
                className={`profile-form-wide ${fieldErrors.aboutMe ? "profile-field-invalid" : ""}`}
              >
                <span>קצת עליי</span>
                <small className="profile-field-help">ספרו בקצרה על עצמכם – לפחות 20 ועד 300 תווים.</small>
                <textarea
                  rows={5}
                  maxLength={300}
                  value={draftProfile.aboutMe}
                  aria-invalid={Boolean(fieldErrors.aboutMe)}
                  onChange={(event) => updateDraft("aboutMe", event.target.value)}
                />
                <small className="profile-character-counter">{draftProfile.aboutMe.length} / 300</small>
                {fieldErrors.aboutMe && <small className="profile-field-error">{fieldErrors.aboutMe}</small>}
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
                  {isSaving ? "שומרים..." : "שמירה"}
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
                {isDeletingAccount ? "מוחקים..." : "מחיקת החשבון לצמיתות"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
