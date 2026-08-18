export type DemoDiscoverProfile = {
  id: string;
  userId: string;
  name: string;
  age: number;
  city: string;
  dates: string;
  destination: string;
  match: number;
  images: string[];
  tags: string[];
  isDemo: true;
};

export const demoDiscoverProfiles: DemoDiscoverProfile[] = [
  {
    id: "demo-noa",
    userId: "noa",
    name: "נועה",
    age: 23,
    city: "תל אביב",
    dates: "ספטמבר עד דצמבר",
    destination: "דרום אמריקה",
    match: 91,
    images: [
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=90",
      "/noa1.png",
      "/noa2.png",
    ],
    tags: ["טרקים", "תרמילאות", "תקציב בינוני", "אוהבת לתכנן"],
    isDemo: true,
  },
  {
    id: "demo-maya",
    userId: "maya",
    name: "מאיה",
    age: 22,
    city: "חיפה",
    dates: "אוקטובר עד ינואר",
    destination: "הודו",
    match: 88,
    images: ["/maya3.png", "/maya1.png", "/maya2.png"],
    tags: ["הוסטלים", "יוגה", "תרבות", "טיול גמיש"],
    isDemo: true,
  },
  {
    id: "demo-ido",
    userId: "ido",
    name: "עידו",
    age: 24,
    city: "רחובות",
    dates: "יולי עד ספטמבר",
    destination: "תאילנד וויאטנם",
    match: 84,
    images: [
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=1200&q=90",
      "/ido1.png",
      "/ido2.png",
    ],
    tags: ["חופים", "אוכל מקומי", "מסיבות", "זורם"],
    isDemo: true,
  },
];

export function getDemoDiscoverProfiles() {
  return demoDiscoverProfiles.map((profile) => ({
    ...profile,
    images: [...profile.images],
    tags: [...profile.tags],
  }));
}
