import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { Map, MapPin, MessageCircle, RefreshCw, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getConversationWithUser } from "../services/conversationService";
import {
  getMatchesMap,
  type MatchesMapData,
  type MatchesMapMarker,
} from "../services/matchesMapService";
import "leaflet/dist/leaflet.css";
import "./MatchesMap.css";

const FALLBACK_PHOTO = "/pic2.png";

function createPhotoIcon(photoURL: string, isCurrentUser = false) {
  const marker = document.createElement("div");
  marker.className = isCurrentUser
    ? "matches-map-photo-marker current-user"
    : "matches-map-photo-marker";

  const image = document.createElement("img");
  image.src = photoURL || FALLBACK_PHOTO;
  image.alt = "";
  image.addEventListener("error", () => {
    if (!image.src.endsWith(FALLBACK_PHOTO)) image.src = FALLBACK_PHOTO;
  });
  marker.appendChild(image);

  if (isCurrentUser) {
    const badge = document.createElement("span");
    badge.textContent = "אני";
    marker.appendChild(badge);
  }

  return L.divIcon({
    html: marker,
    className: "matches-map-leaflet-icon",
    iconSize: isCurrentUser ? [62, 72] : [56, 56],
    iconAnchor: isCurrentUser ? [31, 66] : [28, 28],
    popupAnchor: [0, isCurrentUser ? -64 : -30],
  });
}

function MatchPhotoMarker({
  match,
  onMessage,
  isOpeningChat,
}: {
  match: MatchesMapMarker;
  onMessage: (match: MatchesMapMarker) => Promise<void>;
  isOpeningChat: boolean;
}) {
  const navigate = useNavigate();
  const icon = useMemo(() => createPhotoIcon(match.photoURL), [match.photoURL]);

  return (
    <Marker position={[match.latitude, match.longitude]} icon={icon}>
      <Popup className="matches-map-popup">
        <div className="matches-map-popup-card" dir="rtl">
          <img
            src={match.photoURL || FALLBACK_PHOTO}
            alt={`תמונת הפרופיל של ${match.name}`}
            onError={(event) => {
              event.currentTarget.src = FALLBACK_PHOTO;
            }}
          />
          <div>
            <h2>{match.name}</h2>
            <p>
              <MapPin size={14} />
              {match.destinationLabel}
            </p>
            <strong>כ-{match.distanceKm.toLocaleString("he-IL")} ק״מ ממך</strong>
          </div>
          <div className="matches-map-popup-actions">
            <button
              type="button"
              onClick={() => navigate(`/matched-profile/${match.userId}`)}
            >
              <UserRound size={16} />
              צפייה בפרופיל
            </button>
            <button
              type="button"
              className="primary"
              disabled={isOpeningChat}
              onClick={() => void onMessage(match)}
            >
              <MessageCircle size={16} />
              {isOpeningChat ? "פותחת..." : "שליחת הודעה"}
            </button>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

export default function MatchesMap() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState<MatchesMapData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [mapError, setMapError] = useState("");
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [mapKey, setMapKey] = useState(0);
  const [openingChatUserId, setOpeningChatUserId] = useState("");
  const apiKey = import.meta.env.VITE_GEOAPIFY_API_KEY?.trim();

  async function loadMapData() {
    setIsLoading(true);
    setLoadError("");

    try {
      setData(await getMatchesMap());
    } catch {
      setLoadError("לא הצלחנו לטעון את מפת ההתאמות. בדקו את החיבור ונסו שוב.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadMapData();
  }, []);

  const currentUserIcon = useMemo(
    () => createPhotoIcon(user?.photoURL || user?.photo || FALLBACK_PHOTO, true),
    [user?.photo, user?.photoURL],
  );

  async function openConversation(match: MatchesMapMarker) {
    setOpeningChatUserId(match.userId);
    setLoadError("");

    try {
      const conversation = await getConversationWithUser(match.userId);
      navigate(`/chat/${conversation._id}`);
    } catch {
      setLoadError("לא הצלחנו לפתוח את השיחה. נסו שוב.");
      setOpeningChatUserId("");
    }
  }

  function retryMapTiles() {
    setMapError("");
    setIsMapLoading(true);
    setMapKey((current) => current + 1);
  }

  return (
    <div className="matches-map-page" dir="rtl">
      <header className="matches-map-topbar">
        <div>
          <span className="matches-map-eyebrow">היעד שלך, האנשים שלך</span>
          <h1>מפת התאמות</h1>
          <p>התאמות שנוסעות לאותו אזור או נמצאות עד 50 ק״מ מהיעד שלך</p>
        </div>
        <div className="matches-map-brand" dir="ltr">
          Trip<span>Match</span>
        </div>
      </header>

      <main className="matches-map-shell">
        {isLoading ? (
          <section className="matches-map-state" role="status">
            <span className="matches-map-loader" />
            <h2>מכינים את המפה שלך...</h2>
          </section>
        ) : loadError && !data ? (
          <section className="matches-map-state error" role="alert">
            <Map size={38} />
            <h2>המפה לא נטענה</h2>
            <p>{loadError}</p>
            <button type="button" onClick={() => void loadMapData()}>
              <RefreshCw size={17} />
              ניסיון נוסף
            </button>
          </section>
        ) : !data?.me ? (
          <section className="matches-map-state">
            <MapPin size={42} />
            <h2>עוד לא בחרתם יעד מדויק</h2>
            <p>בחרו יעד בחו״ל בפרופיל כדי לראות התאמות רלוונטיות על המפה.</p>
            <button type="button" onClick={() => navigate("/profile")}>
              עדכון יעד הטיול
            </button>
          </section>
        ) : !apiKey ? (
          <section className="matches-map-state error" role="alert">
            <Map size={42} />
            <h2>שירות המפה עדיין לא הוגדר</h2>
            <p>חסר מפתח Geoapify מקומי. אפשר להמשיך להשתמש בשאר TripMatch.</p>
          </section>
        ) : data.eligibleMatchCount === 0 ? (
          <section className="matches-map-state">
            <UserRound size={42} />
            <h2>עדיין אין התאמות להצגה</h2>
            <p>כשיהיו לכם Matches אמיתיים, הם יופיעו כאן בהתאם ליעד.</p>
            <button type="button" onClick={() => navigate("/discover")}>
              חזרה ל-Discover
            </button>
          </section>
        ) : data.matches.length === 0 ? (
          <section className="matches-map-state">
            <MapPin size={42} />
            <h2>אין כרגע חפיפה ביעדים</h2>
            <p>
              יש לכם התאמות, אבל אף אחת מהן לא נוסעת לאותה עיר או לאזור של עד {data.radiusKm} ק״מ.
            </p>
            <button type="button" onClick={() => navigate("/matches")}>
              לכל ההתאמות
            </button>
          </section>
        ) : (
          <section className="matches-map-card">
            <div className="matches-map-summary">
              <div>
                <MapPin size={18} />
                <span>{data.me.destinationLabel}</span>
              </div>
              <strong>{data.matches.length} התאמות רלוונטיות</strong>
            </div>

            {loadError && <p className="matches-map-inline-error">{loadError}</p>}

            <div className="matches-map-canvas-wrap">
              <MapContainer
                key={mapKey}
                center={[data.me.latitude, data.me.longitude]}
                zoom={11}
                minZoom={3}
                scrollWheelZoom
                className="matches-map-canvas"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | <a href="https://www.geoapify.com/">Geoapify</a>'
                  url={`https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=${encodeURIComponent(apiKey)}`}
                  eventHandlers={{
                    loading: () => setIsMapLoading(true),
                    load: () => setIsMapLoading(false),
                    tileerror: () => {
                      setIsMapLoading(false);
                      setMapError("לא הצלחנו לטעון את אריחי המפה.");
                    },
                  }}
                />

                <Marker
                  position={[data.me.latitude, data.me.longitude]}
                  icon={currentUserIcon}
                >
                  <Popup>
                    <div className="matches-map-me-popup" dir="rtl">
                      <strong>היעד שלי</strong>
                      <span>{data.me.destinationLabel}</span>
                    </div>
                  </Popup>
                </Marker>

                {data.matches.map((match) => (
                  <MatchPhotoMarker
                    key={match.userId}
                    match={match}
                    onMessage={openConversation}
                    isOpeningChat={openingChatUserId === match.userId}
                  />
                ))}
              </MapContainer>

              {isMapLoading && !mapError && (
                <div className="matches-map-tile-status" role="status">
                  טוענים מפה...
                </div>
              )}

              {mapError && (
                <div className="matches-map-tile-status error" role="alert">
                  <span>{mapError}</span>
                  <button type="button" onClick={retryMapTiles}>
                    ניסיון נוסף
                  </button>
                </div>
              )}
            </div>

            <p className="matches-map-privacy-note">
              מיקומי ההתאמות מעוגלים ומוזזים מעט לשמירה על פרטיות. הם אינם כתובת מדויקת.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
