const EARTH_RADIUS_KM = 6371.0088;
const RELEVANCE_RADIUS_KM = 50;
const PRIVACY_GRID_DEGREES = 0.02;
const PRIVACY_OFFSET_DEGREES = 0.003;

const toRadians = (degrees) => degrees * Math.PI / 180;

const hasValidCoordinates = (tripLocation) =>
  Number.isFinite(tripLocation?.latitude) &&
  tripLocation.latitude >= -90 &&
  tripLocation.latitude <= 90 &&
  Number.isFinite(tripLocation?.longitude) &&
  tripLocation.longitude >= -180 &&
  tripLocation.longitude <= 180;

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

const getDestinationLabel = (tripLocation) =>
  Array.from(
    new Set(
      [tripLocation?.name, tripLocation?.state, tripLocation?.country]
        .map((part) => (typeof part === "string" ? part.trim() : ""))
        .filter(Boolean)
    )
  ).join(", ");

const getGeographicDestinationLabel = (tripLocation) =>
  Array.from(
    new Set(
      [tripLocation?.city, tripLocation?.state, tripLocation?.country]
        .map((part) => (typeof part === "string" ? part.trim() : ""))
        .filter(Boolean)
    )
  ).join(", ");

const hashIdentifier = (identifier) => {
  let hash = 2166136261;

  for (const character of String(identifier)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

const clamp = (value, minimum, maximum) =>
  Math.min(maximum, Math.max(minimum, value));

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
