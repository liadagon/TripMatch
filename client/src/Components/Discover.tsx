import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { createSwipe, getSwipes, type SwipeAction } from "../services/swipeService";
import { getUsers } from "../services/userService";
import type { DestinationInfo, DiscoverUser } from "../services/userService";
import { getConversationWithUser } from "../services/conversationService";
import { filterCanonicalInterests } from "../data/profileOptions";
import { getDemoDiscoverProfiles, type DemoProfile } from "../data/demoProfiles";
import {
  getEligibleDemoUserIds,
  recordDemoSwipe,
  setDemoUserBlocked,
} from "../services/demoConversationState";
import { calculateProfileCompatibility } from "../utils/profileCompatibility";
import SafeImage from "./SafeImage";
import {
  MapPin,
  Plane,
  Sparkles,
  Heart,
  ThumbsDown,
  MessageCircle,
  CalendarDays,
  Ban,
} from "lucide-react";
import "./Discover.css";

type DiscoverProfile = {
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
  isDemo: boolean;
  destinationInfo?: DestinationInfo;
  hasLikedCurrentUser?: boolean;
};

type UsableDiscoverUser = DiscoverUser & {
  age: number;
  preferredDestinations: string[];
  tripDates: string;
};

export function isUsableDiscoverProfile(
  user: DiscoverUser,
): user is UsableDiscoverUser {
  const hasProfileImage = Boolean(user.photoURL?.trim() || user.photo?.trim());
  const hasDestination = Boolean(
    user.tripLocation?.city?.trim() ||
      user.tripLocation?.state?.trim() ||
      user.tripLocation?.country?.trim() ||
      user.preferredDestinations?.some((destination) => destination.trim()),
  );

  return Boolean(
    user.name.trim() &&
      Number.isInteger(user.age) &&
      user.age !== undefined &&
      user.age >= 18 &&
      user.age <= 120 &&
      hasProfileImage &&
      hasDestination &&
      user.tripDates?.trim(),
  );
}

function mapUserToProfile(user: UsableDiscoverUser): DiscoverProfile {
  const tags = [
    ...filterCanonicalInterests(user.interests),
    user.travelStyle,
    user.budget,
  ].filter((tag): tag is string => Boolean(tag));

  return {
    id: user._id,
    userId: user._id,
    name: user.name,
    age: user.age,
    city:
      [user.tripLocation?.city, user.tripLocation?.country]
        .filter(Boolean)
        .join(", "),
    dates: user.tripDates,
    destination:
      [
        user.tripLocation?.city,
        user.tripLocation?.state,
        user.tripLocation?.country,
      ]
        .filter(Boolean)
        .join(", ") ||
      user.preferredDestinations[0],
    match: user.compatibility.percentage,
    images: [
      user.photoURL || user.photo || "",
    ],
    tags: tags.slice(0, 5),
    isDemo: false,
    destinationInfo: user.destinationInfo,
  };
}

function mapDemoToProfile(profile: DemoProfile, currentUser: Parameters<typeof calculateProfileCompatibility>[0]): DiscoverProfile {
  const compatibility = calculateProfileCompatibility(currentUser, profile);
  return {
    id: profile.id,
    userId: profile.userId,
    name: profile.name,
    age: profile.age,
    city: [profile.tripLocation.city, profile.tripLocation.country].filter(Boolean).join(", "),
    dates: profile.tripDates,
    destination: profile.tripLocation.formattedAddress,
    match: compatibility.percentage,
    images: [...profile.photos],
    tags: [...profile.interests, profile.travelStyle, profile.budget].slice(0, 5),
    isDemo: true,
    hasLikedCurrentUser: profile.hasLikedCurrentUser,
  };
}

function getDestinationTitle(destinationInfo: DestinationInfo) {
  if (destinationInfo.sameCity) {
    const city = destinationInfo.label.split(",")[0]?.trim();
    return city ? `גם ב${city}` : "גם ביעד שלך";
  }

  if (destinationInfo.nearby) return "באזור שלך";
  return destinationInfo.label;
}

function getFreshDemoProfiles(userId: string | undefined, currentUser: Parameters<typeof calculateProfileCompatibility>[0] = {}) {
  const allDemoProfiles = getDemoDiscoverProfiles();
  const eligibleDemoIds = new Set(
    getEligibleDemoUserIds(
      userId,
      allDemoProfiles.map((candidate) => candidate.userId),
    ),
  );
  return allDemoProfiles
    .filter((candidate) => eligibleDemoIds.has(candidate.userId))
    .map((candidate) => mapDemoToProfile(candidate, currentUser));
}

export default function Discover() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<DiscoverProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [swipeError, setSwipeError] = useState("");
  const [photoIndex, setPhotoIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const startXRef = useRef(0);
  const dragXRef = useRef(0);
  const didSwipeRef = useRef(false);
  const isPointerDownRef = useRef(false);
  const isAnimatingRef = useRef(false);

  async function loadProfiles() {
    setIsLoading(true);
    setSwipeError("");

    try {
      const [users, swipes] = await Promise.all([getUsers(), getSwipes()]);
      const swipedUserIds = new Set(swipes.map((swipe) => swipe.toUser));
      const realProfiles = users
        .filter(
          (candidate) =>
            candidate._id !== user?._id &&
            !swipedUserIds.has(candidate._id),
        )
        .filter(isUsableDiscoverProfile)
        .map(mapUserToProfile);
      const demoProfiles = getFreshDemoProfiles(user?._id, user || {});

      setProfiles([...realProfiles, ...demoProfiles]);
    } catch (error) {
      console.warn("[Discover] Backend profiles unavailable.", error);
      setProfiles(getFreshDemoProfiles(user?._id, user || {}));
      setSwipeError("לא הצלחנו לטעון התאמות מהשרת. נסי שוב בעוד רגע");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadProfiles();
  }, [user?._id, user?.tripLocation?.placeId]);

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
            <h2>{isLoading ? "טוענים התאמות..." : "אין עוד התאמות כרגע"}</h2>
            <p>{swipeError || "נסי לחזור מאוחר יותר כדי לראות התאמות חדשות"}</p>

            <button onClick={() => void loadProfiles()} disabled={isLoading}>
              נסי שוב
            </button>
          </section>
        </main>
      </div>
    );
  }

  const currentImage = profile.images[photoIndex] || profile.images[0];
  const dragPower = Math.min(Math.abs(dragX) / 130, 1);
  const dragMode = dragX > 35 ? "drag-like" : dragX < -35 ? "drag-skip" : "";

  async function moveToNextProfile(type: SwipeAction) {
    if (isAnimatingRef.current) return;

    isAnimatingRef.current = true;
    setFeedback(type);
    setSwipeError("");

    try {
      if (profile.isDemo) {
        if (!user?._id) throw new Error("Missing authenticated user scope");
        recordDemoSwipe(
          user._id,
          profile.userId,
          type,
          profile.hasLikedCurrentUser === true,
        );
        await new Promise((resolve) => window.setTimeout(resolve, 280));
      } else {
        await Promise.all([
          createSwipe(profile.userId, type),
          new Promise((resolve) => window.setTimeout(resolve, 280)),
        ]);
      }
      setProfiles((prevProfiles) => prevProfiles.slice(1));
      setPhotoIndex(0);
      setDragX(0);
      dragXRef.current = 0;
      didSwipeRef.current = false;
      isPointerDownRef.current = false;
      setFeedback("");
      setIsDragging(false);
      isAnimatingRef.current = false;
    } catch (error) {
      console.error("[Discover] Failed to persist real-user swipe.", {
        targetUserId: profile.userId,
        action: type,
        message: error instanceof Error ? error.message : "Unknown error",
      });
      setFeedback("");
      setDragX(0);
      dragXRef.current = 0;
      setIsDragging(false);
      isAnimatingRef.current = false;
      setSwipeError("לא הצלחנו לשמור את הבחירה נסי שוב");
    }
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

  async function handleMessage() {
    setSwipeError("");

    if (profile.isDemo) {
      setSwipeError("אפשר לשלוח הודעה רק אחרי שנוצרה התאמה הדדית");
      return;
    }

    try {
      const conversation = await getConversationWithUser(profile.userId);
      navigate(`/chat/${conversation._id}`);
    } catch {
      setSwipeError("אפשר לשלוח הודעה רק אחרי שנוצרה התאמה הדדית");
    }
  }

  function blockDemoProfile() {
    if (!profile.isDemo || !user?._id) return;
    setDemoUserBlocked(user._id, profile.userId, true);
    setProfiles((current) => current.slice(1));
    setPhotoIndex(0);
  }

  const cardStyle = {
    transform: `translateX(${dragX}px) rotate(${dragX / 26}deg)`,
    "--drag-power": dragPower,
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
            className={`discover-card ${feedback} ${dragMode} ${
              isDragging ? "dragging" : ""
            }`}
            style={cardStyle}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
          >
            <div className="discover-image-wrap">
              <SafeImage
                src={currentImage}
                alt={profile.name}
                draggable="false"
              />

              <div className="discover-progress-bars">
                {profile.images.map((_, index) => (
                  <span
                    key={index}
                    className={index <= photoIndex ? "active" : ""}
                  ></span>
                ))}
              </div>

              <div className="discover-swipe-overlay like-overlay">
                <Heart size={48} fill="currentColor" />
              </div>

              <div className="discover-swipe-overlay skip-overlay">
                <ThumbsDown size={48} />
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

                {profile.destinationInfo ? (
                  <div
                    className={`discover-proximity ${
                      profile.destinationInfo.sameCity
                        ? "same-city"
                        : profile.destinationInfo.nearby
                          ? "nearby"
                          : "far"
                    }`}
                  >
                    <p>
                      <MapPin size={18} />
                      {getDestinationTitle(profile.destinationInfo)}
                    </p>
                    {(profile.destinationInfo.sameCity ||
                      profile.destinationInfo.nearby) && (
                      <small>
                        {profile.destinationInfo.distanceKm.toLocaleString(
                          "he-IL",
                          {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1,
                          },
                        )}{" "}
                        ק״מ מהיעד שלך
                      </small>
                    )}
                  </div>
                ) : (
                  <p className="discover-destination">
                    <Plane size={21} />
                    {profile.destination}
                  </p>
                )}

                <div className="discover-tags">
                  {profile.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {swipeError && (
            <p className="discover-api-error" role="alert">
              {swipeError}
            </p>
          )}

          <div className="discover-actions">
            {profile.isDemo && (
              <button
                className="discover-skip-btn"
                onClick={blockDemoProfile}
                aria-label="חסימת משתמש הדגמה"
              >
                <Ban size={20} />
              </button>
            )}
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
              onClick={handleMessage}
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
