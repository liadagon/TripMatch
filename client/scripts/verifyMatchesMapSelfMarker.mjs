import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (relativePath) =>
  readFile(new URL(relativePath, import.meta.url), "utf8");

const [mapSource, mapCssSource, identitySource] = await Promise.all([
  read("../src/Components/MatchesMap.tsx"),
  read("../src/Components/MatchesMap.css"),
  read("../src/utils/authenticatedIdentity.ts"),
]);

assert.match(
  mapSource,
  /createCurrentUserMapMarker\(user\?\.tripLocation\)/,
  "The self marker must use the authenticated user's persisted tripLocation",
);
assert.match(mapSource, /Number\.isFinite\(tripLocation\.latitude\)/);
assert.match(mapSource, /Number\.isFinite\(tripLocation\.longitude\)/);
assert.match(mapSource, /tripLocation\.latitude < -90/);
assert.match(mapSource, /tripLocation\.longitude > 180/);
assert.match(mapSource, /if \(positions\.length === 1\)[\s\S]*map\.setView\(positions\[0\], 11/);
assert.match(mapSource, /map\.fitBounds\(L\.latLngBounds\(positions\)/);
assert.match(mapSource, /currentUserMarker \|\| displayMatches\[0\] \|\| null/);
assert.match(mapSource, /currentUser=\{currentUserMarker\}/);
assert.match(mapSource, /iconSize: isCurrentUser \? \[74, 96\] : \[56, 56\]/);
assert.match(mapSource, /zIndexOffset=\{2000\}/);
assert.match(mapSource, /aria-label", "המיקום שלי במפת ההתאמות"/);
assert.match(mapSource, /title="המיקום שלי במפת ההתאמות"/);
assert.match(mapSource, /alt="המיקום שלי במפת ההתאמות"/);
assert.match(mapSource, /const mapRef = useRef<L\.Map \| null>\(null\)/);
assert.match(mapSource, /ref=\{mapRef\}/);
assert.match(
  mapSource,
  /mapRef\.current\.flyTo\(\s*\[currentUserMarker\.latitude, currentUserMarker\.longitude\],\s*11,/,
);
assert.match(mapSource, /\{ animate: true, duration: 0\.75 \}/);
assert.match(mapSource, /\{currentUserMarker && \([\s\S]*className="matches-map-return-to-self"/);
assert.match(mapSource, /aria-label="חזרה למיקום שלי במפה"/);
assert.match(mapSource, /title="חזרה למיקום שלי במפה"/);
assert.match(mapSource, /<span>חזרה אליי<\/span>/);
assert.match(mapSource, /<strong>המיקום שלי<\/strong>/);
assert.match(mapSource, /currentUserMarker\.destinationLabel/);
assert.match(mapSource, /<strong>\{displayMatches\.length\} התאמות באזור<\/strong>/);
assert.match(mapSource, /createPhotoIcon\(identity\.photoURL, true\)/);
assert.match(mapSource, /badge\.textContent = "אני"/);
assert.match(mapSource, /profile\.tripLocation\.latitude/);
assert.match(mapSource, /profile\.tripLocation\.longitude/);
assert.match(mapSource, /data\?\.matches\.map/);
assert.doesNotMatch(mapSource, /navigator\.geolocation|Tel Aviv|תל אביב/);
assert.match(mapCssSource, /\.matches-map-photo-marker\.current-user[\s\S]*width: 74px/);
assert.match(mapCssSource, /\.matches-map-photo-marker\.current-user[\s\S]*border-width: 5px/);
assert.match(mapCssSource, /\.matches-map-photo-marker\.current-user[\s\S]*outline: 4px solid/);
assert.match(mapCssSource, /\.matches-map-photo-marker\.current-user::after[\s\S]*inset: -14px/);
assert.match(mapCssSource, /\.matches-map-photo-marker\.current-user::after[\s\S]*pointer-events: none/);
assert.match(mapCssSource, /\.matches-map-photo-marker\.current-user span/);
assert.match(mapCssSource, /\.matches-map-photo-marker\.current-user span[\s\S]*top: -28px/);
assert.match(mapCssSource, /\.matches-map-return-to-self[\s\S]*position: absolute/);
assert.match(mapCssSource, /\.matches-map-return-to-self:focus-visible/);
assert.match(mapCssSource, /@media \(max-width: 700px\)[\s\S]*\.matches-map-return-to-self span[\s\S]*display: none/);
assert.match(identitySource, /getAuthenticatedProfilePhotos\(user\)\[0\] \|\| ""/);
assert.match(identitySource, /isAppOwnedProfilePhoto/);

const selfMarkerStart = mapSource.indexOf("{currentUserMarker && (");
const selfMarkerEnd = mapSource.indexOf("</Marker>", selfMarkerStart);
assert.ok(selfMarkerStart >= 0 && selfMarkerEnd > selfMarkerStart);
assert.doesNotMatch(
  mapSource.slice(selfMarkerStart, selfMarkerEnd),
  /navigate\(|matched-profile/,
  "The self marker must not navigate to a matched profile",
);
assert.equal(
  (mapSource.match(/<Marker/g) || []).length,
  2,
  "The recenter control must not add another self marker",
);

console.log("Matches Map current-user marker verification: PASS");
