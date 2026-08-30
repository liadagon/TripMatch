import type { ProfilePreviewUser } from "../services/authService";
import type { TripLocation } from "../types/tripLocation";

export type DemoProfile = ProfilePreviewUser & {
  id: string;
  userId: string;
  age: number;
  isDemo: true;
  tripLocation: TripLocation;
  preferredDestinations: string[];
  tripDates: string;
  tripDuration: string;
  budget: string;
  travelStyle: string;
  interests: string[];
  bio: string;
  photos: string[];
  questionnaire: NonNullable<ProfilePreviewUser["questionnaire"]>;
  hasLikedCurrentUser: boolean;
};

export const demoProfiles: readonly DemoProfile[] = [
  {
    _id: "demo-noa", id: "demo-noa", userId: "noa", name: "נועה", gender: "female", age: 23,
    photos: ["/noa1.png", "/noa2.png"], photoURL: "/noa1.png",
    tripLocation: { placeId: "51f0d7c7f0e3c74059c9b1b86f826640", name: "Bangkok, Thailand", formattedAddress: "Bangkok, Thailand", latitude: 13.7563, longitude: 100.5018, city: "Bangkok", country: "Thailand", countryCode: "th" },
    preferredDestinations: ["תאילנד וויאטנם"], tripDates: "בתחילת הקיץ", tripDuration: "יותר מחודש", budget: "חסכוני", travelStyle: "תרמילאות ואורח חיים מקומי",
    interests: ["אוכל מקומי", "טבע", "טרקים"], bio: "מחפשת שותפות לטיול ארוך בתאילנד, עם אוכל רחוב, טבע וקצב נינוח.",
    questionnaire: { accommodationPreference: "הוסטל", companionScope: "לכל הטיול", companionPriority: "גמישות ורוח טובה", dealBreaker: "חוסר כבוד לגבולות" },
    hasLikedCurrentUser: true, isDemo: true,
  },
  {
    _id: "demo-maya", id: "demo-maya", userId: "maya", name: "מאיה", gender: "female", age: 22,
    photos: ["/maya3.png", "/maya1.png", "/maya2.png"], photoURL: "/maya3.png",
    tripLocation: { placeId: "51111e0ec6b67a40598cb3aaadf07140", name: "Rome, Italy", formattedAddress: "Rome, Lazio, Italy", latitude: 41.9028, longitude: 12.4964, city: "Rome", state: "Lazio", country: "Italy", countryCode: "it" },
    preferredDestinations: ["אירופה"], tripDates: "בעוד חצי שנה", tripDuration: "שבוע עד שבועיים", budget: "בינוני", travelStyle: "סיורים תרבותיים וערים",
    interests: ["תרבות", "אוכל מקומי", "צילום"], bio: "מתכננת חופשה ברומא שמשלבת אמנות, שכונות מקומיות והרבה אוכל איטלקי.",
    questionnaire: { accommodationPreference: "בית מלון סביר", companionScope: "רק לחלק מהמסלול", companionPriority: "אמינות ואחריות", dealBreaker: "לוח זמנים לא מסונכרן" },
    hasLikedCurrentUser: false, isDemo: true,
  },
  {
    _id: "demo-ido", id: "demo-ido", userId: "ido", name: "עידו", gender: "male", age: 24,
    photos: ["/ido1.png", "/ido2.png"], photoURL: "/ido1.png",
    tripLocation: { placeId: "515184e70a1438c05936cd07b4760550", name: "Lima, Peru", formattedAddress: "Lima, Peru", latitude: -12.0464, longitude: -77.0428, city: "Lima", country: "Peru", countryCode: "pe" },
    preferredDestinations: ["דרום אמריקה"], tripDates: "סוף הקיץ", tripDuration: "יותר מחודש", budget: "גמיש, תלוי בחוויה", travelStyle: "טרקים והרפתקאות טבע",
    interests: ["טרקים", "טבע", "חיי לילה"], bio: "יוצא למסע ארוך בפרו ומחפש שותפות לטרקים, טבע וגם ערבים חברתיים.",
    questionnaire: { accommodationPreference: "תלוי ביעד ובתקציב", companionScope: "גמישה, נראה איך זה מסתדר", companionPriority: "תאימות לסגנון נסיעה", dealBreaker: "בזבזנות או קמצנות קיצונית" },
    hasLikedCurrentUser: true, isDemo: true,
  },
  {
    _id: "demo-daniel", id: "demo-daniel", userId: "daniel", name: "דניאל", gender: "unknown", age: 25,
    photos: ["/pic3.png", "/pic4.png"], photoURL: "/pic3.png",
    tripLocation: { placeId: "51c8644c7e14ca4059f068585f982440", name: "Sydney, Australia", formattedAddress: "Sydney, New South Wales, Australia", latitude: -33.8688, longitude: 151.2093, city: "Sydney", state: "New South Wales", country: "Australia", countryCode: "au" },
    preferredDestinations: ["אוסטרליה"], tripDates: "חורף", tripDuration: "שבועיים עד חודש", budget: "נוח", travelStyle: "שילוב של הכול",
    interests: ["חופים", "ספורט", "מוזיקה"], bio: "מתכננ/ת חודש בסידני והסביבה, עם חופים, הופעות וטיולי יום מחוץ לעיר.",
    questionnaire: { accommodationPreference: "Airbnb או דירה משותפת", companionScope: "גמישה, נראה איך זה מסתדר", companionPriority: "כימיה אישית טובה", dealBreaker: "מריבות על החלטות קטנות" },
    hasLikedCurrentUser: false, isDemo: true,
  },
] as const;

export const demoDiscoverProfiles = demoProfiles;

/** Finds one immutable demo profile by its public demo-user identifier. */
export function getDemoProfile(userId: string | undefined) {
  return demoProfiles.find((profile) => profile.userId === userId);
}

/** Returns isolated copies of demo profiles suitable for discovery state. */
export function getDemoDiscoverProfiles() {
  return demoProfiles.map((profile) => ({ ...profile, photos: [...profile.photos], interests: [...profile.interests], preferredDestinations: [...profile.preferredDestinations], questionnaire: { ...profile.questionnaire }, tripLocation: { ...profile.tripLocation } }));
}
