import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Discover.css";

const profiles = [
  {
    name: "נועה",
    age: 23,
    city: "תל אביב",
    dates: "ספטמבר עד דצמבר",
    destination: "דרום אמריקה",
    match: 91,
    images: [
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=90",
      "https://images.unsplash.com/photo-1520813792240-56fc4a3765a7?auto=format&fit=crop&w=1200&q=90",
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=90",
    ],
    tags: ["טרקים", "תרמילאות", "תקציב בינוני", "זורמת אבל אוהבת לתכנן"],
  },
  {
    name: "מאיה",
    age: 22,
    city: "חיפה",
    dates: "אוקטובר עד ינואר",
    destination: "הודו",
    match: 88,
    images: [
      "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=1200&q=90",
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=1200&q=90",
      "https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?auto=format&fit=crop&w=1200&q=90",
    ],
    tags: ["הוסטלים", "יוגה", "תרבות", "טיול גמיש"],
  },
  {
    name: "עידו",
    age: 24,
    city: "רחובות",
    dates: "יולי עד ספטמבר",
    destination: "תאילנד וויאטנם",
    match: 84,
    images: [
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=1200&q=90",
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=1200&q=90",
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=1200&q=90",
    ],
    tags: ["חופים", "אוכל מקומי", "מסיבות", "זורם"],
  },
];

export default function Discover() {
  const navigate = useNavigate();

  const [profileIndex, setProfileIndex] = useState(0);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [feedback, setFeedback] = useState("");

  const startXRef = useRef(0);
  const draggingRef = useRef(false);
  const didSwipeRef = useRef(false);

  const profile = profiles[profileIndex];
  const currentImage = profile.images[photoIndex];

  function resetForNextProfile() {
    setPhotoIndex(0);
    setDragX(0);
  }

  function nextProfile(type) {
    setFeedback(type);

    setTimeout(() => {
      setProfileIndex((prev) => (prev + 1) % profiles.length);
      setFeedback("");
      resetForNextProfile();
    }, 260);
  }

  function likeProfile() {
    nextProfile("like");
  }

  function skipProfile() {
    nextProfile("skip");
  }

  function nextPhoto() {
    setPhotoIndex((prev) => (prev + 1) % profile.images.length);
  }

  function handlePointerDown(event) {
    draggingRef.current = true;
    didSwipeRef.current = false;
    startXRef.current = event.clientX;
  }

  function handlePointerMove(event) {
    if (!draggingRef.current) return;

    const diff = event.clientX - startXRef.current;
    setDragX(diff);

    if (Math.abs(diff) > 10) {
      didSwipeRef.current = true;
    }
  }

  function handlePointerUp() {
    if (!draggingRef.current) return;

    draggingRef.current = false;

    if (dragX > 90) {
      likeProfile();
      return;
    }

    if (dragX < -90) {
      skipProfile();
      return;
    }

    setDragX(0);
  }

  function handleImageClick() {
    if (didSwipeRef.current) return;
    nextPhoto();
  }

  const cardStyle = {
    transform: `translateX(${dragX}px) rotate(${dragX / 18}deg)`,
  };

  return (
    <div className="discover-page" dir="rtl">
      <main className="discover-phone">
        <header className="discover-header">
          <h1 className="discover-logo">
            Trip<span>Match</span>
          </h1>

          <div className="discover-categories">
            <button className="discover-category">📍</button>
            <button className="discover-category">⭐</button>
            <button className="discover-category">✈️</button>
            <button className="discover-category">💯</button>
            <button className="discover-category active">✨</button>
          </div>
        </header>

        <section
          className={`discover-card ${feedback}`}
          style={cardStyle}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <div className="discover-image-wrap" onClick={handleImageClick}>
            <img src={currentImage} alt={profile.name} draggable="false" />

            <div className="discover-progress-bars">
              {profile.images.map((_, index) => (
                <span
                  key={index}
                  className={index <= photoIndex ? "active" : ""}
                ></span>
              ))}
            </div>

            <div className="discover-like-stamp">אהבתי</div>
            <div className="discover-skip-stamp">דלגי</div>

            <div className="discover-match-badge">
              התאמה <strong>{profile.match}%</strong>
            </div>

            <div className="discover-photo-hint">
              לחצי על התמונה כדי לראות עוד
            </div>

            <div className="discover-profile-content">
              <h2>
                {profile.name}, {profile.age}
              </h2>

              <p className="discover-details">
                📍 {profile.city} · 📅 {profile.dates}
              </p>

              <p className="discover-destination">✈️ {profile.destination}</p>

              <div className="discover-tags">
                {profile.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="discover-actions">
          <button
            className="discover-message-btn"
            onClick={() => navigate("/chat")}
          >
            💬 שלחי הודעה
          </button>

          <button className="discover-like-btn" onClick={likeProfile}>
            ♥ אהבתי
          </button>

          <button className="discover-skip-btn" onClick={skipProfile}>
            × דלגי
          </button>
        </div>

        <nav className="discover-bottom-nav">
          <button onClick={() => navigate("/discover")} className="active">
            <span>🔍</span>
            גילוי
          </button>

          <button onClick={() => navigate("/likes")}>
            <span>♡</span>
            לייקים
          </button>

          <button onClick={() => navigate("/matches")}>
            <span>💬</span>
            הודעות
          </button>

          <button onClick={() => navigate("/preferences")}>
            <span>⚙️</span>
            העדפות
          </button>

          <button onClick={() => navigate("/profile")}>
            <span>👤</span>
            פרופיל
          </button>
        </nav>
      </main>
    </div>
  );
}