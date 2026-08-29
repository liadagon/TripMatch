const EARTH_RADIUS_KM = 6371.0088;
const RELEVANCE_RADIUS_KM = 50;
const PRIVACY_GRID_DEGREES = 0.02;
const PRIVACY_OFFSET_DEGREES = 0.003;

const toRadians = (degrees) => degrees * Math.PI / 180;

/** Indicates whether a trip location contains valid geographic coordinates. */
const hasValidCoordinates = (tripLocation) =>
  Number.isFinite(tripLocation?.latitude) &&
  tripLocation.latitude >= -90 &&
  tripLocation.latitude <= 90 &&
  Number.isFinite(tripLocation?.longitude) &&
  tripLocation.longitude >= -180 &&
  tripLocation.longitude <= 180;

/**
 * Calculates great-circle distance between two validated latitude/longitude pairs.
 * @param {{latitude: number, longitude: number}} firstLocation Origin coordinates.
 * @param {{latitude: number, longitude: number}} secondLocation Destination coordinates.
 * @returns {number} Distance in kilometers.
 */
const calculateDistanceKm = (firstLocation, secondLocation) => {
  const latitudeDelta = toRadians(
    secondLocation.latitude - firstLocation.latitude
  );
  const longitudeDelta = toRadians(
    secondLocation.longitude - firstLocation.longitude
  );
  const firstLatitude = toRadians(firstLocation.latitude);
  const secondLatitude = toRadians(secondLocation.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(haversine));
};

const normalizePlacePart = (value) =>
  typeof value === "string" ? value.trim().toLocaleLowerCase("en") : "";

/** Compares normalized city and country values for two destinations. */
const isSameCityAndCountry = (firstLocation, secondLocation) => {
  const firstCity = normalizePlacePart(firstLocation?.city);
  const secondCity = normalizePlacePart(secondLocation?.city);
  const firstCountry = normalizePlacePart(firstLocation?.countryCode);
  const secondCountry = normalizePlacePart(secondLocation?.countryCode);

  return Boolean(
    firstCity && secondCity && firstCountry && firstCountry === secondCountry &&
      firstCity === secondCity
  );
};

/** Returns the most specific display label available for a trip destination. */
const getDestinationLabel = (tripLocation) =>
  Array.from(
    new Set(
      [tripLocation?.name, tripLocation?.state, tripLocation?.country]
        .map((part) => (typeof part === "string" ? part.trim() : ""))
        .filter(Boolean)
    )
  ).join(", ");

/** Returns a city/country label suitable for geographic comparison. */
const getGeographicDestinationLabel = (tripLocation) =>
  Array.from(
    new Set(
      [tripLocation?.city, tripLocation?.state, tripLocation?.country]
        .map((part) => (typeof part === "string" ? part.trim() : ""))
        .filter(Boolean)
    )
  ).join(", ");

/** Derives a stable non-secret seed used for privacy offsets. */
const hashIdentifier = (identifier) => {
  let hash = 2166136261;

  for (const character of String(identifier)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

/** Restricts a numeric coordinate adjustment to a valid range. */
const clamp = (value, minimum, maximum) =>
  Math.min(maximum, Math.max(minimum, value));

/**
 * Produces a stable, privacy-reduced marker inside the destination's grid cell.
 * @param {{latitude: number, longitude: number}} tripLocation Exact stored destination.
 * @param {unknown} userId Stable identifier used only to derive the in-cell offset.
 * @returns {{latitude: number, longitude: number}} Approximate coordinates safe for map output.
 */
const approximateCoordinates = (tripLocation, userId) => {
  const hash = hashIdentifier(userId);
  const angle = hash % 360 * Math.PI / 180;
  const latitudeCellCenter =
    Math.floor(tripLocation.latitude / PRIVACY_GRID_DEGREES) *
      PRIVACY_GRID_DEGREES +
    PRIVACY_GRID_DEGREES / 2;
  const longitudeCellCenter =
    Math.floor(tripLocation.longitude / PRIVACY_GRID_DEGREES) *
      PRIVACY_GRID_DEGREES +
    PRIVACY_GRID_DEGREES / 2;

  return {
    latitude: Number(
      clamp(
        latitudeCellCenter + Math.sin(angle) * PRIVACY_OFFSET_DEGREES,
        -89.99999,
        89.99999
      ).toFixed(5)
    ),
    longitude: Number(
      clamp(
        longitudeCellCenter + Math.cos(angle) * PRIVACY_OFFSET_DEGREES,
        -179.99999,
        179.99999
      ).toFixed(5)
    ),
  };
};

module.exports = {
  RELEVANCE_RADIUS_KM,
  approximateCoordinates,
  calculateDistanceKm,
  getDestinationLabel,
  getGeographicDestinationLabel,
  hasValidCoordinates,
  isSameCityAndCountry,
};
