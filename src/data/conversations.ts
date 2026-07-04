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

export function getConversationById(userId: string | undefined) {
  return conversations.find((conversation) => conversation.id === userId);
}
