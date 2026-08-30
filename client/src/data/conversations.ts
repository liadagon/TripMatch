import { demoProfiles } from "./demoProfiles";

export type Conversation = {
  id: string; name: string; age: number; destination: string; images: string[]; time?: string;
};

export type NewMatch = { id: string; name: string; images: string[] };

export const conversations: Conversation[] = demoProfiles.map((profile) => ({
  id: profile.userId,
  name: profile.name,
  age: profile.age,
  destination: [profile.tripLocation.city, profile.tripLocation.country, profile.tripDates].filter(Boolean).join(" · "),
  images: [...profile.photos],
}));

export const newMatches: NewMatch[] = demoProfiles.map((profile) => ({
  id: profile.userId, name: profile.name, images: [...profile.photos],
}));

export const demoChatReplies = [
  "ממש מגניב! 🙌",
  "כן, בדיוק חשבתי על זה!",
  "נשמע לי טוב, בואו נתאם פרטים 📅",
  "אחלה! יש לי עוד כמה שאלות...",
  "מגניב, אשמח לשמוע עוד 😊",
];

/** Returns the demo conversation associated with a demo-user identifier. */
export function getConversationById(userId: string | undefined) {
  return conversations.find((conversation) => conversation.id === userId);
}
