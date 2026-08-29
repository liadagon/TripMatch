import { useEffect, useRef, useState } from "react";
import { MapPin, Search, X } from "lucide-react";
import type { TripLocation } from "../types/tripLocation";
import "./TripLocationPicker.css";

type GeoapifyFeature = {
  properties?: {
    place_id?: string;
    name?: string;
    formatted?: string;
    lat?: number;
    lon?: number;
    city?: string;
    state?: string;
    country?: string;
    country_code?: string;
  };
};

type GeoapifyResponse = {
  features?: GeoapifyFeature[];
};

type TripLocationPickerProps = {
  value: TripLocation | null;
  onChange: (location: TripLocation | null) => void;
  hasError?: boolean;
  disabled?: boolean;
};

const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 350;

/** Maps a complete Geoapify feature to the application's location model. */
function locationFromFeature(feature: GeoapifyFeature): TripLocation | null {
  const properties = feature.properties;

  if (
    !properties?.place_id ||
    !properties.formatted ||
    !Number.isFinite(properties.lat) ||
    !Number.isFinite(properties.lon) ||
    !properties.country ||
    !properties.country_code
  ) {
    return null;
  }

  const name = properties.name || properties.city || properties.formatted;

  return {
    placeId: properties.place_id,
    name,
    formattedAddress: properties.formatted,
    latitude: properties.lat as number,
    longitude: properties.lon as number,
    ...(properties.city ? { city: properties.city } : {}),
    ...(properties.state ? { state: properties.state } : {}),
    country: properties.country,
    countryCode: properties.country_code.toLowerCase(),
  };
}

/** Builds the concise destination label shown by location inputs. */
export function getTripLocationLabel(location: TripLocation) {
  return Array.from(
    new Set([location.name, location.state, location.country].filter(Boolean)),
  ).join(", ");
}

/** Provides debounced Geoapify search and emits validated structured locations. */
export default function TripLocationPicker({
  value,
  onChange,
  hasError = false,
  disabled = false,
}: TripLocationPickerProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<TripLocation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const requestIdRef = useRef(0);
  const apiKey = import.meta.env.VITE_GEOAPIFY_API_KEY?.trim();

  useEffect(() => {
    const normalizedQuery = query.trim();
    const requestId = ++requestIdRef.current;

    if (value || normalizedQuery.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setIsLoading(false);
      setMessage("");
      return;
    }

    if (!apiKey) {
      setSuggestions([]);
      setIsLoading(false);
      setMessage("שירות חיפוש היעדים עדיין לא הוגדר. נסו שוב מאוחר יותר.");
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setIsLoading(true);
      setMessage("");

      try {
        const params = new URLSearchParams({
          text: normalizedQuery,
          apiKey,
          lang: "en",
          limit: "6",
        });
        const response = await fetch(
          `https://api.geoapify.com/v1/geocode/autocomplete?${params.toString()}`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error(`Geoapify request failed with ${response.status}`);
        }

        const data = (await response.json()) as GeoapifyResponse;

        if (requestId !== requestIdRef.current) return;

        const nextSuggestions = (data.features || [])
          .map(locationFromFeature)
          .filter((location): location is TripLocation => Boolean(location))
          .filter((location) => location.countryCode !== "il");

        setSuggestions(nextSuggestions);
        setMessage(
          nextSuggestions.length ? "" : "לא מצאנו יעדים מתאימים מחוץ לישראל.",
        );
      } catch {
        if (controller.signal.aborted || requestId !== requestIdRef.current) return;

        setSuggestions([]);
        setMessage("לא הצלחנו לחפש יעדים כרגע. בדקו את החיבור ונסו שוב.");
      } finally {
        if (requestId === requestIdRef.current) setIsLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [apiKey, query, value]);

  function clearSelection() {
    onChange(null);
    setQuery("");
    setSuggestions([]);
    setMessage("");
  }

  if (value) {
    return (
      <div className="trip-location-picker selected">
        <div className="trip-location-selected" role="status">
          <MapPin size={19} aria-hidden="true" />
          <span>{getTripLocationLabel(value)}</span>
          <button
            type="button"
            aria-label="שינוי יעד הטיול"
            onClick={clearSelection}
            disabled={disabled}
          >
            <X size={17} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`trip-location-picker${hasError ? " error" : ""}`}>
      <div className="trip-location-input-wrap">
        <Search size={18} aria-hidden="true" />
        <input
          type="search"
          autoComplete="off"
          placeholder="חפשו עיר, אזור או מקום..."
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            onChange(null);
          }}
          disabled={disabled}
          aria-autocomplete="list"
          aria-expanded={suggestions.length > 0}
        />
        {isLoading && <span className="trip-location-spinner" aria-label="חיפוש יעדים" />}
      </div>

      {suggestions.length > 0 && (
        <ul className="trip-location-suggestions" role="listbox">
          {suggestions.map((suggestion) => (
            <li key={suggestion.placeId}>
              <button
                type="button"
                role="option"
                aria-selected="false"
                onClick={() => {
                  onChange(suggestion);
                  setQuery("");
                  setSuggestions([]);
                  setMessage("");
                }}
              >
                <MapPin size={17} aria-hidden="true" />
                <span>
                  <strong>{getTripLocationLabel(suggestion)}</strong>
                  <small>{suggestion.formattedAddress}</small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {message && (
        <small className="trip-location-message" role="status">
          {message}
        </small>
      )}
    </div>
  );
}
