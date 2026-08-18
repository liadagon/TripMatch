import { useRef, useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapPin,
  Plane,
  Sparkles,
  Heart,
  ThumbsDown,
  MessageCircle,
  CalendarDays,
} from "lucide-react";
import "./Discover.css";

const initialProfiles = [
  {
    id: 1,
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
  },
  {
    id: 2,
    userId: "maya",
    name: "מאיה",
    age: 22,
    city: "חיפה",
    dates: "אוקטובר עד ינואר",
    destination: "הודו",
    match: 88,
    images: ["/maya3.png", "/maya1.png", "/maya2.png"],
    tags: ["הוסטלים", "יוגה", "תרבות", "טיול גמיש"],
  },
  {
    id: 3,
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
  },
];

export default function Discover() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState(initialProfiles);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const startXRef = useRef(0);
  const dragXRef = useRef(0);
  const didSwipeRef = useRef(false);
  const isPointerDownRef = useRef(false);
  const isAnimatingRef = useRef(false);

  const profile = profiles[0];

  if (!profile) {
    return (
      <div className="discover-page" dir="rtl">
        <main className="discover-layout">
          <header className="discover-header">
            <h1 className="discover-logo">
              Trip<span>Match</span>
            </h1>
          </header>

          <section className="discover-empty">
            <Sparkles size={44} />
            <h2>אין עוד התאמות כרגע</h2>
            <p>נסי לחזור מאוחר יותר כדי לראות התאמות חדשות.</p>

            <button onClick={() => setProfiles(initialProfiles)}>
              התחילי מחדש
            </button>
          </section>
        </main>
      </div>
    );
  }

  const currentImage = profile.images[photoIndex] || profile.images[0];

  function moveToNextProfile(type: "like" | "skip") {
    if (isAnimatingRef.current) return;

    isAnimatingRef.current = true;
    setFeedback(type);

    window.setTimeout(() => {
      setProfiles((prevProfiles) => prevProfiles.slice(1));
      setPhotoIndex(0);
      setDragX(0);
      dragXRef.current = 0;
      didSwipeRef.current = false;
      isPointerDownRef.current = false;
      setFeedback("");
      setIsDragging(false);
      isAnimatingRef.current = false;
    }, 280);
  }

  function nextPhoto() {
    if (isAnimatingRef.current || profile.images.length <= 1) return;
    setPhotoIndex((prev) => (prev + 1) % profile.images.length);
  }

  function handlePointerDown(event: PointerEvent<HTMLElement>) {
    if (isAnimatingRef.current) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    startXRef.current = event.clientX;
    dragXRef.current = 0;
    didSwipeRef.current = false;
    isPointerDownRef.current = true;
    setIsDragging(true);
    setFeedback("");
  }

  function handlePointerMove(event: PointerEvent<HTMLElement>) {
    if (!isPointerDownRef.current || isAnimatingRef.current) return;

    const diff = event.clientX - startXRef.current;
    dragXRef.current = diff;
    setDragX(diff);

    if (Math.abs(diff) > 8) {
      didSwipeRef.current = true;
    }
  }

  function handlePointerUp(event: PointerEvent<HTMLElement>) {
    if (!isPointerDownRef.current || isAnimatingRef.current) return;

    event.currentTarget.releasePointerCapture(event.pointerId);
    isPointerDownRef.current = false;
    setIsDragging(false);

    const finalDragX = dragXRef.current;

    if (finalDragX > 120) {
      moveToNextProfile("like");
      return;
    }

    if (finalDragX < -120) {
      moveToNextProfile("skip");
      return;
    }

    dragXRef.current = 0;
    setDragX(0);

    if (!didSwipeRef.current) {
      nextPhoto();
    }
  }

  function handlePointerCancel(event: PointerEvent<HTMLElement>) {
    event.currentTarget.releasePointerCapture(event.pointerId);
    isPointerDownRef.current = false;
    didSwipeRef.current = false;
    dragXRef.current = 0;
    setDragX(0);
    setIsDragging(false);
  }

  const cardStyle = {
    transform: `translateX(${dragX}px) rotate(${dragX / 26}deg)`,
  } as CSSProperties;

  return (
    <div className="discover-page" dir="rtl">
      <main className="discover-layout">
        <header className="discover-header">
          <h1 className="discover-logo">
            Trip<span>Match</span>
          </h1>

          <div className="discover-categories">
            <button className="discover-category" aria-label="יעדים">
              <MapPin size={23} />
            </button>


            <button className="discover-category active" aria-label="הכי מתאים">
              <Sparkles size={23} />
            </button>
          </div>
        </header>

        <section className="discover-main">
          <section
            key={profile.id}
            className={`discover-card ${feedback} ${
              isDragging ? "dragging" : ""
            }`}
            style={cardStyle}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
          >
            <div className="discover-image-wrap">
              <img src={currentImage} alt={profile.name} draggable="false" />

              <div className="discover-progress-bars">
                {profile.images.map((_, index) => (
                  <span
                    key={index}
                    className={index <= photoIndex ? "active" : ""}
                  ></span>
                ))}
              </div>

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
                  <MapPin size={16} />
                  {profile.city}
                  <span>·</span>
                  <CalendarDays size={16} />
                  {profile.dates}
                </p>

                <p className="discover-destination">
                  <Plane size={21} />
                  {profile.destination}
                </p>

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
              className="discover-skip-btn"
              onClick={() => moveToNextProfile("skip")}
              aria-label="דלגי"
            >
              <ThumbsDown size={21} />
            </button>

            <button
              className="discover-like-btn"
              onClick={() => moveToNextProfile("like")}
              aria-label="אהבתי"
            >
              <Heart size={20} fill="currentColor" />
            </button>

            <button
              className="discover-message-btn"
              onClick={() => navigate(`/chat/${profile.userId}`)}
            >
              <MessageCircle size={20} />
              שלחי הודעה
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
