export type Conversation = {
  id: string;
  name: string;
  age: number;
  time?: string;
  destination: string;
  preview: string;
  match: number;
  images: string[];
  unread?: boolean;
  online?: boolean;
};

export type NewMatch = {
  id: string;
  name: string;
  images: string[];
};

export type DemoChatMessage = {
  id: string;
  from: "me" | "them";
  text: string;
  time: string;
};

export const demoProfileImages = {
  noa: [
    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=90",
    "/noa1.png",
    "/noa2.png",
  ],
  maya: ["/maya3.png", "/maya1.png", "/maya2.png"],
  traveler: [
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=1200&q=90",
    "/ido1.png",
    "/ido2.png",
  ],
  daniel: [
    "https://api.dicebear.com/8.x/lorelei/svg?seed=Daniel&backgroundColor=d1f4d1",
  ],
};

export const newMatches: NewMatch[] = [
  {
    id: "noa",
    name: "נועה",
    images: demoProfileImages.noa,
  },
  {
    id: "maya",
    name: "מאיה",
    images: demoProfileImages.maya,
  },
  {
    id: "ido",
    name: "עידו",
    images: demoProfileImages.traveler,
  },
  {
    id: "daniel",
    name: "דניאל",
    images: demoProfileImages.daniel,
  },
];

export const conversations: Conversation[] = [
  {
    id: "noa",
    name: "נועה",
    age: 23,
    time: "עכשיו",
    destination: "דרום אמריקה · ספטמבר עד דצמבר",
    preview: "היי! ראיתי שגם את מתכננת לטוס לפרו 🌎",
    match: 91,
    images: demoProfileImages.noa,
    unread: true,
  },
  {
    id: "maya",
    name: "מאיה",
    age: 22,
    time: "לפני 3 דק׳",
    destination: "הודו · אוקטובר עד ינואר",
    preview: "גם אני מתכננת להתחיל מגואה! 🙏",
    match: 88,
    images: demoProfileImages.maya,
    unread: true,
  },
  {
    id: "ido",
    name: "עידו",
    age: 24,
    time: "אתמול",
    destination: "תאילנד וויאטנם · יולי עד ספטמבר",
    preview: "נשמע מעולה, אבל עוד לא קניתי כרטיס...",
    match: 84,
    images: demoProfileImages.traveler,
    online: true,
  },
  {
    id: "daniel",
    name: "דניאל",
    age: 25,
    time: "שלשום",
    destination: "אוסטרליה · נובמבר עד פברואר",
    preview: "יש לי מכרים בסידני שיכולים לעזור 🦘",
    match: 79,
    images: demoProfileImages.daniel,
  },
];

export const demoChatMessages: DemoChatMessage[] = [
  {
    id: "demo-1",
    from: "them",
    text: "היי! ראיתי שגם את מתכננת לטוס לפרו בספטמבר 🌎",
    time: "14:22",
  },
  {
    id: "demo-2",
    from: "me",
    text: "כן! אני מחפשת שותפה לשלושה השבועות הראשונים 🎒",
    time: "14:24",
  },
  {
    id: "demo-3",
    from: "them",
    text: "נשמע מעולה, גם אני רוצה להתחיל בלימה ואז להמשיך לקוסקו",
    time: "14:25",
  },
  {
    id: "demo-4",
    from: "me",
    text: "זה בדיוק המסלול שלי! ראית את מאצ'ו פיצ'ו בתוכנית שלך?",
    time: "14:26",
  },
  {
    id: "demo-5",
    from: "them",
    text: "כן בטח! אבל שמעתי שצריך להזמין הרבה מראש, כבר התחלת?",
    time: "14:27",
  },
];

export const demoChatReplies = [
  "ממש מגניב! 🙌",
  "כן, בדיוק חשבתי על זה!",
  "נשמע לי טוב, בואי נתאם פרטים 📅",
  "אחלה! יש לי עוד כמה שאלות...",
  "מגניב, אשמח לשמוע עוד 😊",
];

export function getConversationById(userId: string | undefined) {
  return conversations.find((conversation) => conversation.id === userId);
}
