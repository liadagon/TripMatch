import { FormEvent, useRef, useState } from "react";
import axios from "axios";
import { Backpack, CalendarDays, Hotel, Map, MapPin, Sparkles, TriangleAlert, Users, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { PROFILE_OPTIONS, filterCanonicalInterests } from "../data/profileOptions";
import type { ProfileUpdatePayload } from "../services/profileService";
import type { TripLocation } from "../types/tripLocation";
import { getAuthenticatedProfilePhotos } from "../utils/authenticatedIdentity";
import { getPreviousOnboardingPath, getProfileCompletionPath } from "../utils/authNavigation";
import {
  getGenderedHebrewCopy,
  getGenderedQuestionnaireOptionLabel,
  type ApplicationGender,
} from "../utils/genderedHebrew";
import TripLocationPicker from "./TripLocationPicker";
import "./Questionnaire.css";

const REQUIRED_FIELDS_MESSAGE = "לא כל השדות הנדרשים הושלמו. יש להשלים את השדות המסומנים.";

type QuestionnaireForm = {
  name: string;
  age: string;
  tripLocation: TripLocation | null;
  interests: string[];
  bio: string;
  preferredDestination: string;
  tripDates: string;
  tripDuration: string;
  budget: string;
  travelStyle: string;
  accommodationPreference: string;
  companionScope: string;
  companionPriority: string;
  dealBreaker: string;
};

type QuestionnaireField = keyof QuestionnaireForm | "photo";
type QuestionnaireErrors = Partial<Record<QuestionnaireField, string>>;

const STEP_FIELDS: readonly (readonly QuestionnaireField[])[] = [
  ["name", "age", "interests", "bio"],
  ["tripLocation", "preferredDestination", "tripDates", "tripDuration", "budget"],
  ["travelStyle", "accommodationPreference"],
  ["companionScope", "companionPriority", "dealBreaker"],
];

const STEPS = [
  { title: "קצת עליי", helper: "כמה פרטים שיעזרו לשותפים להכיר אתכם.", icon: Sparkles },
  { title: "הטיול שלי", helper: "היעד המדויק והמסגרת הכללית של הטיול.", icon: MapPin },
  { title: "סגנון הטיול שלי", helper: "העדפות שיעזרו לנו לדייק את ההתאמה.", icon: Backpack },
  { title: "ההתאמה הנכונה עבורי", helper: "עוד שלוש תשובות וסיימנו.", icon: Users },
] as const;

function canonicalValue(value: string | undefined, options: readonly string[]) {
  return value && options.includes(value) ? value : "";
}

function hasValidTripLocation(location: TripLocation | null) {
  return Boolean(
    location && location.placeId.trim() && location.name.trim() &&
    location.formattedAddress.trim() && Number.isFinite(location.latitude) &&
    Number.isFinite(location.longitude) && location.country.trim() &&
    location.countryCode.trim(),
  );
}

type SelectFieldProps = {
  label: string;
  field: keyof QuestionnaireForm;
  value: string;
  options: readonly string[];
  error?: string;
  icon: typeof CalendarDays;
  gender?: ApplicationGender;
  onChange: (field: keyof QuestionnaireForm, value: string) => void;
};

function SelectField({ label, field, value, options, error, icon: Icon, gender, onChange }: SelectFieldProps) {
  return (
    <label data-questionnaire-field={field} className={`questionnaire-form-field ${error ? "invalid" : ""}`}>
      <span><Icon size={18} /> {label} *</span>
      <select value={value} onChange={(event) => onChange(field, event.target.value)}>
        <option value="">בחירת תשובה</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {getGenderedQuestionnaireOptionLabel(option, gender)}
          </option>
        ))}
      </select>
      {error && <small>{error}</small>}
    </label>
  );
}

export default function Questionnaire() {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const formRef = useRef<HTMLFormElement>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [form, setForm] = useState<QuestionnaireForm>(() => ({
    name: user?.name || "",
    age: user?.age === undefined ? "" : String(user.age),
    tripLocation: user?.tripLocation || null,
    interests: filterCanonicalInterests(user?.interests),
    bio: user?.bio || "",
    preferredDestination: canonicalValue(user?.preferredDestinations?.[0], PROFILE_OPTIONS.destinations),
    tripDates: canonicalValue(user?.tripDates, PROFILE_OPTIONS.tripDates),
    tripDuration: canonicalValue(user?.tripDuration, PROFILE_OPTIONS.tripDurations),
    budget: canonicalValue(user?.budget, PROFILE_OPTIONS.budgets),
    travelStyle: canonicalValue(user?.travelStyle, PROFILE_OPTIONS.travelStyles),
    accommodationPreference: canonicalValue(user?.questionnaire?.accommodationPreference, PROFILE_OPTIONS.accommodationPreferences),
    companionScope: canonicalValue(user?.questionnaire?.companionScope, PROFILE_OPTIONS.companionScopes),
    companionPriority: canonicalValue(user?.questionnaire?.companionPriority, PROFILE_OPTIONS.companionPriorities),
    dealBreaker: canonicalValue(user?.questionnaire?.dealBreaker, PROFILE_OPTIONS.dealBreakers),
  }));
  const [errors, setErrors] = useState<QuestionnaireErrors>({});
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const hasRequiredPhoto = getAuthenticatedProfilePhotos(user).length > 0;
  const step = STEPS[currentStep];
  const stepTitle = currentStep === 2
    ? getGenderedHebrewCopy(user?.gender, {
        male: "איך אני אוהב לטייל",
        female: "איך אני אוהבת לטייל",
        neutral: "סגנון הטיול שלי",
      })
    : step.title;
  const StepIcon = step.icon;
  const isLastStep = currentStep === STEPS.length - 1;

  function clearError(field: QuestionnaireField) {
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
    setSaveError("");
  }

  function updateField(field: keyof QuestionnaireForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    clearError(field);
  }

  function toggleInterest(interest: string) {
    setForm((current) => ({
      ...current,
      interests: current.interests.includes(interest)
        ? current.interests.filter((value) => value !== interest)
        : current.interests.length < 10 ? [...current.interests, interest] : current.interests,
    }));
    clearError("interests");
  }

  function getValidationErrors() {
    const nextErrors: QuestionnaireErrors = {};
    const name = form.name.trim();
    const age = form.age.trim();
    const bio = form.bio.trim();
    if (name.length < 2 || name.length > 80) nextErrors.name = "יש להזין שם באורך של 2 עד 80 תווים.";
    if (!Number.isInteger(Number(age)) || Number(age) < 18 || Number(age) > 120) nextErrors.age = "יש להזין גיל תקין בין 18 ל-120.";
    if (form.interests.length === 0) nextErrors.interests = "יש לבחור לפחות תחום עניין אחד.";
    if (bio.length < 20) nextErrors.bio = "יש לכתוב לפחות 20 תווים.";
    else if (bio.length > 300) nextErrors.bio = "ניתן לכתוב עד 300 תווים.";
    if (!hasValidTripLocation(form.tripLocation)) nextErrors.tripLocation = "יש לבחור יעד מדויק לטיול.";

    const selections: Array<[keyof QuestionnaireForm, string, string]> = [
      ["preferredDestination", form.preferredDestination, "יש לבחור אזור מועדף לטיול."],
      ["tripDates", form.tripDates, "יש לבחור תאריכי טיול."],
      ["tripDuration", form.tripDuration, "יש לבחור משך טיול."],
      ["budget", form.budget, "יש לבחור תקציב."],
      ["travelStyle", form.travelStyle, "יש לבחור סגנון טיול."],
      ["accommodationPreference", form.accommodationPreference, "יש לבחור העדפת לינה."],
      ["companionScope", form.companionScope, "יש לבחור היקף שותפות לטיול."],
      ["companionPriority", form.companionPriority, "יש לבחור מה חשוב בהתאמה לטיול."],
      ["dealBreaker", form.dealBreaker, "יש לבחור מה מהווה מבחינתכם קו אדום."],
    ];
    selections.forEach(([field, value, message]) => { if (!value.trim()) nextErrors[field] = message; });
    if (!hasRequiredPhoto) nextErrors.photo = "יש להשלים העלאת תמונת פרופיל לפני סיום ההרשמה.";
    return nextErrors;
  }

  function focusFirstInvalid(nextErrors: QuestionnaireErrors, stepIndex = currentStep) {
    const firstField = STEP_FIELDS[stepIndex].find((field) => nextErrors[field]);
    if (!firstField) return;
    window.requestAnimationFrame(() => {
      const field = formRef.current?.querySelector<HTMLElement>(`[data-questionnaire-field="${firstField}"]`);
      field?.scrollIntoView({ behavior: "smooth", block: "center" });
      field?.querySelector<HTMLElement>("input, select, textarea, button")?.focus({ preventScroll: true });
    });
  }

  function validateCurrentStep() {
    const allErrors = getValidationErrors();
    const stepErrors = Object.fromEntries(
      Object.entries(allErrors).filter(([field]) => STEP_FIELDS[currentStep].includes(field as QuestionnaireField)),
    ) as QuestionnaireErrors;
    setErrors((current) => ({ ...current, ...stepErrors }));
    if (Object.keys(stepErrors).length === 0) return true;
    setSaveError(REQUIRED_FIELDS_MESSAGE);
    focusFirstInvalid(stepErrors);
    return false;
  }

  function goBack() {
    if (currentStep === 0) {
      navigate(getPreviousOnboardingPath("/questionnaire"), { replace: true });
      return;
    }
    setCurrentStep((current) => current - 1);
    setSaveError("");
  }

  function goNext() {
    if (!validateCurrentStep()) return;
    setCurrentStep((current) => current + 1);
    setSaveError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function getBackendErrors(error: unknown) {
    if (!axios.isAxiosError(error) || error.response?.status !== 400) return {};
    const fields = error.response.data?.fields;
    if (!fields || typeof fields !== "object") return {};
    const mapping: Record<string, QuestionnaireField> = {
      name: "name", age: "age", photo: "photo", tripLocation: "tripLocation",
      interests: "interests", bio: "bio", preferredDestinations: "preferredDestination",
      tripDates: "tripDates", tripDuration: "tripDuration", budget: "budget",
      travelStyle: "travelStyle",
      accommodationPreference: "accommodationPreference", companionScope: "companionScope",
      companionPriority: "companionPriority", dealBreaker: "dealBreaker",
    };
    return Object.fromEntries(
      Object.entries(fields)
        .filter(([field, message]) => mapping[field] && typeof message === "string")
        .map(([field, message]) => [mapping[field], message]),
    ) as QuestionnaireErrors;
  }

  async function completeQuestionnaire(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving || !isLastStep) return;
    const allErrors = getValidationErrors();
    if (allErrors.photo) {
      navigate("/photo-upload", { replace: true });
      return;
    }
    if (Object.keys(allErrors).length > 0) {
      const firstInvalidStep = STEP_FIELDS.findIndex((fields) => fields.some((field) => allErrors[field]));
      setErrors(allErrors);
      setSaveError(REQUIRED_FIELDS_MESSAGE);
      if (firstInvalidStep >= 0) {
        setCurrentStep(firstInvalidStep);
        focusFirstInvalid(allErrors, firstInvalidStep);
      }
      return;
    }

    setIsSaving(true);
    setErrors({});
    setSaveError("");
    try {
      const payload: ProfileUpdatePayload = {
        completeRegistration: true,
        name: form.name.trim(),
        age: Number(form.age.trim()),
        tripLocation: form.tripLocation!,
        interests: filterCanonicalInterests(form.interests),
        bio: form.bio.trim(),
        preferredDestinations: [form.preferredDestination],
        tripDates: form.tripDates,
        tripDuration: form.tripDuration,
        budget: form.budget,
        travelStyle: form.travelStyle,
        questionnaire: {
          accommodationPreference: form.accommodationPreference,
          companionScope: form.companionScope,
          companionPriority: form.companionPriority,
          dealBreaker: form.dealBreaker,
        },
      };
      const updatedUser = await updateProfile(payload);
      if (!updatedUser.registrationComplete) {
        setSaveError(REQUIRED_FIELDS_MESSAGE);
        return;
      }
      navigate(getProfileCompletionPath(updatedUser), { replace: true });
    } catch (error) {
      const nextErrors = getBackendErrors(error);
      if (nextErrors.photo) {
        navigate("/photo-upload", { replace: true });
        return;
      }
      if (Object.keys(nextErrors).length > 0) {
        const firstInvalidStep = STEP_FIELDS.findIndex((fields) => fields.some((field) => nextErrors[field]));
        setErrors(nextErrors);
        setSaveError(REQUIRED_FIELDS_MESSAGE);
        if (firstInvalidStep >= 0) setCurrentStep(firstInvalidStep);
      } else {
        setSaveError("לא הצלחנו לשמור את השאלון. נסו שוב.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="questionnaire-page" dir="rtl">
      <div className="questionnaire-shell">
        <header className="questionnaire-header">
          <div className="questionnaire-header-top">
            <div className="questionnaire-counter">שלב {currentStep + 1} מתוך {STEPS.length}</div>
            <div className="questionnaire-logo" dir="ltr">Trip<span>Match</span></div>
          </div>
          <div className="questionnaire-progress-track">
            <div className="questionnaire-progress-fill" style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }} />
          </div>
        </header>

        <main className="questionnaire-content">
          <form ref={formRef} className="questionnaire-step-form" onSubmit={completeQuestionnaire} noValidate>
            <section className="questionnaire-card questionnaire-section-card">
              <div className="questionnaire-icon"><StepIcon size={34} /></div>
              <p className="questionnaire-section-name">שלב {currentStep + 1}</p>
              <h1 className="questionnaire-question-text">{stepTitle}</h1>
              <p className="questionnaire-helper-text">{step.helper}</p>

              {currentStep === 0 && (
                <div className="questionnaire-step-fields questionnaire-personal-step">
                  <div className="questionnaire-two-column">
                    <label data-questionnaire-field="name" className={`questionnaire-form-field ${errors.name ? "invalid" : ""}`}>
                      <span>שם מלא *</span><input value={form.name} onChange={(event) => updateField("name", event.target.value)} />
                      {errors.name && <small>{errors.name}</small>}
                    </label>
                    <label data-questionnaire-field="age" className={`questionnaire-form-field ${errors.age ? "invalid" : ""}`}>
                      <span>גיל *</span><input type="number" min="18" max="120" value={form.age} onChange={(event) => updateField("age", event.target.value)} />
                      {errors.age && <small>{errors.age}</small>}
                    </label>
                  </div>
                  <fieldset data-questionnaire-field="interests" className={`questionnaire-interest-field ${errors.interests ? "invalid" : ""}`}>
                    <legend>תחומי עניין *</legend><p>בחרו לפחות תחום אחד ועד עשרה.</p>
                    <div>{PROFILE_OPTIONS.interests.map((interest) => (
                      <button key={interest} type="button" className={form.interests.includes(interest) ? "selected" : ""} aria-pressed={form.interests.includes(interest)} onClick={() => toggleInterest(interest)}>{interest}</button>
                    ))}</div>
                    {errors.interests && <small>{errors.interests}</small>}
                  </fieldset>
                  <label data-questionnaire-field="bio" className={`questionnaire-form-field questionnaire-bio-field ${errors.bio ? "invalid" : ""}`}>
                    <span>קצת עליי *</span>
                    <textarea rows={5} maxLength={300} value={form.bio} onChange={(event) => updateField("bio", event.target.value)} placeholder="כמה מילים עליי ועל מה שחשוב לי בטיול" />
                    <span className="questionnaire-character-counter">{form.bio.length} / 300</span>
                    {errors.bio && <small>{errors.bio}</small>}
                  </label>
                </div>
              )}

              {currentStep === 1 && (
                <div className="questionnaire-step-fields">
                  <div data-questionnaire-field="tripLocation" className={`questionnaire-location-field ${errors.tripLocation ? "invalid" : ""}`}>
                    <span><MapPin size={18} /> יעד מדויק לטיול *</span>
                    <TripLocationPicker
                      value={form.tripLocation}
                      onChange={(value) => {
                        setForm((current) => ({ ...current, tripLocation: value }));
                        clearError("tripLocation");
                      }}
                      hasError={Boolean(errors.tripLocation)}
                      disabled={isSaving}
                    />
                    {errors.tripLocation && <small>{errors.tripLocation}</small>}
                  </div>
                  <div className="questionnaire-two-column">
                    <SelectField label="אזור מועדף" field="preferredDestination" value={form.preferredDestination} options={PROFILE_OPTIONS.destinations} error={errors.preferredDestination} icon={Map} gender={user?.gender} onChange={updateField} />
                    <SelectField label="מועד יציאה" field="tripDates" value={form.tripDates} options={PROFILE_OPTIONS.tripDates} error={errors.tripDates} icon={CalendarDays} gender={user?.gender} onChange={updateField} />
                    <SelectField label="משך הטיול" field="tripDuration" value={form.tripDuration} options={PROFILE_OPTIONS.tripDurations} error={errors.tripDuration} icon={CalendarDays} gender={user?.gender} onChange={updateField} />
                    <SelectField label="תקציב" field="budget" value={form.budget} options={PROFILE_OPTIONS.budgets} error={errors.budget} icon={Wallet} gender={user?.gender} onChange={updateField} />
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="questionnaire-step-fields">
                  <SelectField label="סגנון טיול" field="travelStyle" value={form.travelStyle} options={PROFILE_OPTIONS.travelStyles} error={errors.travelStyle} icon={Backpack} gender={user?.gender} onChange={updateField} />
                  <SelectField label="לינה מועדפת" field="accommodationPreference" value={form.accommodationPreference} options={PROFILE_OPTIONS.accommodationPreferences} error={errors.accommodationPreference} icon={Hotel} gender={user?.gender} onChange={updateField} />
                </div>
              )}

              {currentStep === 3 && (
                <div className="questionnaire-step-fields">
                  <SelectField label="שותפות לטיול" field="companionScope" value={form.companionScope} options={PROFILE_OPTIONS.companionScopes} error={errors.companionScope} icon={Users} gender={user?.gender} onChange={updateField} />
                  <SelectField label="מה חשוב לי בהתאמה" field="companionPriority" value={form.companionPriority} options={PROFILE_OPTIONS.companionPriorities} error={errors.companionPriority} icon={Sparkles} gender={user?.gender} onChange={updateField} />
                  <SelectField label="קו אדום מבחינתי" field="dealBreaker" value={form.dealBreaker} options={PROFILE_OPTIONS.dealBreakers} error={errors.dealBreaker} icon={TriangleAlert} gender={user?.gender} onChange={updateField} />
                </div>
              )}
            </section>

            {saveError && <p className="questionnaire-save-error" role="alert">{saveError}</p>}
            <div className="questionnaire-nav-row">
              <button type="button" className="questionnaire-back-btn" onClick={goBack} disabled={isSaving}><span>אחורה</span><span className="btn-arrow">→</span></button>
              {isLastStep ? (
                <button type="submit" className="questionnaire-next-btn final active" disabled={isSaving}>{isSaving ? "שומרים את השאלון..." : "סיום ומציאת התאמות"}</button>
              ) : (
                <button type="button" className="questionnaire-next-btn active" onClick={goNext}><span>הבא</span><span className="btn-arrow">←</span></button>
              )}
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
