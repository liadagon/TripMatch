import { memo, useCallback, useEffect, useMemo, useState } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { Map, MapPin, MessageCircle, RefreshCw, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getConversationWithUser } from "../services/conversationService";
import {
  getMatchesMap,
  type MatchesMapData,
  type MatchesMapMarker,
} from "../services/matchesMapService";
import { conversations as demoConversations } from "../data/conversations";
import { isDemoUserBlocked } from "../services/demoConversationState";
import { getAuthenticatedIdentity } from "../utils/authenticatedIdentity";
import "leaflet/dist/leaflet.css";
import "./MatchesMap.css";

const FALLBACK_PHOTO = "/pic2.png";
const DEMO_DISTANCES_KM = [2.4, 4.8, 7.1, 11.3];
const DEMO_BEARINGS_DEGREES = [28, 112, 205, 318];

type DisplayMapMarker = MatchesMapMarker & {
  isDemo: boolean;
};

function createDemoMarkers(
  me: NonNullable<MatchesMapData["me"]>,
  destinationLabel: string,
): DisplayMapMarker[] {
  const latitudeRadians = me.latitude * Math.PI / 180;
  const longitudeScale = Math.max(Math.cos(latitudeRadians), 0.2);

  return demoConversations
    .filter((conversation) => !isDemoUserBlocked(conversation.id))
    .slice(0, DEMO_DISTANCES_KM.length)
    .map((conversation, index) => {
      const distanceKm = DEMO_DISTANCES_KM[index];
      const bearing = DEMO_BEARINGS_DEGREES[index] * Math.PI / 180;
      const latitudeOffset = distanceKm * Math.cos(bearing) / 111.32;
      const longitudeOffset =
        distanceKm * Math.sin(bearing) / (111.32 * longitudeScale);

      return {
        userId: conversation.id,
        name: conversation.name,
        photoURL: conversation.images[0] || FALLBACK_PHOTO,
        destinationLabel,
        latitude: Number((me.latitude + latitudeOffset).toFixed(5)),
        longitude: Number((me.longitude + longitudeOffset).toFixed(5)),
        distanceKm,
        isDemo: true,
      };
    });
}

function getGeographicDestinationLabel(
  tripLocation: { city?: string; state?: string; country?: string } | undefined,
  fallbackLabel: string,
) {
  const geographicParts = [
    tripLocation?.city,
    tripLocation?.state,
    tripLocation?.country,
  ]
    .map((part) => part?.trim() || "")
    .filter(Boolean);

  if (geographicParts.length > 0) {
    return Array.from(new Set(geographicParts)).join(", ");
  }

  const fallbackParts = fallbackLabel
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  return fallbackParts.slice(-2).join(", ") || fallbackLabel;
}

function FitMapBounds({
  me,
  matches,
}: {
  me: NonNullable<MatchesMapData["me"]>;
  matches: DisplayMapMarker[];
}) {
  const map = useMap();

  useEffect(() => {
    const bounds = L.latLngBounds([
      [me.latitude, me.longitude],
      ...matches.map(
        (match) => [match.latitude, match.longitude] as [number, number],
      ),
    ]);

    map.fitBounds(bounds, {
      padding: [54, 54],
      maxZoom: 13,
      animate: false,
    });
  }, [map, matches, me.latitude, me.longitude]);

  return null;
}

function createPhotoIcon(photoURL: string, isCurrentUser = false) {
  const marker = document.createElement("div");
  marker.className = isCurrentUser
    ? "matches-map-photo-marker current-user"
    : "matches-map-photo-marker";

  if (photoURL) {
    const image = document.createElement("img");
    image.src = photoURL;
    image.alt = "";
    image.addEventListener("error", () => {
      image.remove();
      marker.classList.add("photo-unavailable");
    });
    marker.appendChild(image);
  } else {
    marker.classList.add("photo-unavailable");
  }

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

type MatchPhotoMarkerProps = {
  match: DisplayMapMarker;
  onMessage: (match: DisplayMapMarker) => Promise<void>;
  isOpeningChat: boolean;
};

const MatchPhotoMarker = memo(function MatchPhotoMarker({
  match,
  onMessage,
  isOpeningChat,
}: MatchPhotoMarkerProps) {
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
              onClick={() =>
                navigate(`/matched-profile/${match.userId}`, {
                  state: { from: "/matches-map" },
                })
              }
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
});

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
  const identity = getAuthenticatedIdentity(user);

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
    () => createPhotoIcon(identity.photoURL, true),
    [identity.photoURL],
  );

  const destinationLabel = useMemo(
    () =>
      data?.me
        ? getGeographicDestinationLabel(
            user?.tripLocation,
            data.me.destinationLabel,
          )
        : "",
    [data?.me, user?.tripLocation],
  );

  const demoMatches = useMemo(
    () =>
      data?.me ? createDemoMarkers(data.me, destinationLabel) : [],
    [data?.me, destinationLabel],
  );
  const isDemoMode = Boolean(
    data?.me && data.matches.length === 0 && demoMatches.length > 0,
  );
  const realMatches = useMemo<DisplayMapMarker[]>(
    () =>
      data?.matches.map((match) => ({ ...match, isDemo: false })) || [],
    [data?.matches],
  );
  const displayMatches = realMatches.length ? realMatches : demoMatches;

  const openConversation = useCallback(
    async (match: DisplayMapMarker) => {
      setOpeningChatUserId(match.userId);
      setLoadError("");

      if (match.isDemo) {
        navigate(`/chat/${match.userId}`);
        return;
      }

      try {
        const conversation = await getConversationWithUser(match.userId);
        navigate(`/chat/${conversation._id}`);
      } catch {
        setLoadError("לא הצלחנו לפתוח את השיחה. נסו שוב.");
        setOpeningChatUserId("");
      }
    },
    [navigate],
  );

  function retryMapTiles() {
    setMapError("");
    setIsMapLoading(true);
    setMapKey((current) => current + 1);
  }

  return (
    <div className="matches-map-page" dir="rtl">
      <header className="matches-map-topbar">
        <div className="matches-map-brand" dir="ltr">
          Trip<span>Match</span>
        </div>
      </header>

      <main className="matches-map-shell">
        <header className="matches-map-hero">
          <span className="matches-map-hero-icon">
            <Map size={27} />
          </span>
          <div>
            <span className="matches-map-eyebrow">היעד שלך, האנשים שלך</span>
            <h1>מפת ההתאמות</h1>
            <p>מי מההתאמות שלך מטייל באזור שבחרת?</p>
          </div>
        </header>

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
            <h2>עוד לא בחרת יעד לטיול</h2>
            <p>בחרו יעד מדויק כדי לראות מי מההתאמות שלכם נמצא באזור.</p>
            <button type="button" onClick={() => navigate("/profile")}>
              בחירת יעד
            </button>
          </section>
        ) : !apiKey ? (
          <section className="matches-map-state error" role="alert">
            <Map size={42} />
            <h2>שירות המפה עדיין לא הוגדר</h2>
            <p>חסר מפתח Geoapify מקומי. אפשר להמשיך להשתמש בשאר TripMatch.</p>
          </section>
        ) : displayMatches.length === 0 && data.eligibleMatchCount === 0 ? (
          <section className="matches-map-state">
            <UserRound size={42} />
            <h2>עדיין אין התאמות להצגה</h2>
            <p>כשיהיו לכם Matches אמיתיים, הם יופיעו כאן בהתאם ליעד.</p>
            <button type="button" onClick={() => navigate("/discover")}>
              חזרה ל-Discover
            </button>
          </section>
        ) : displayMatches.length === 0 ? (
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
              <div className="matches-map-summary-chip destination">
                <MapPin size={18} />
                <span>{destinationLabel}</span>
              </div>
              <div className="matches-map-summary-chip">
                <UserRound size={17} />
                <strong>{displayMatches.length} התאמות באזור</strong>
              </div>
              <div className="matches-map-summary-chip">
                עד {data.radiusKm} ק״מ מהיעד שלך
              </div>
              {isDemoMode && (
                <span className="matches-map-demo-badge">מצב הדגמה</span>
              )}
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
                <FitMapBounds me={data.me} matches={displayMatches} />
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
                      <span>{destinationLabel}</span>
                    </div>
                  </Popup>
                </Marker>

                {displayMatches.map((match) => (
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
              {isDemoMode
                ? "הסמנים במצב הדגמה הם מקומיים וסינתטיים ואינם נשמרים בשרת."
                : "מיקומי ההתאמות מעוגלים ומוזזים מעט לשמירה על פרטיות. הם אינם כתובת מדויקת."}
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
