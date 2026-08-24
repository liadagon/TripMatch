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
assert.match(mapSource, /zIndexOffset=\{1000\}/);
assert.match(mapSource, /<strong>המיקום שלי<\/strong>/);
assert.match(mapSource, /currentUserMarker\.destinationLabel/);
assert.match(mapSource, /<strong>\{displayMatches\.length\} התאמות באזור<\/strong>/);
assert.match(mapSource, /createPhotoIcon\(identity\.photoURL, true\)/);
assert.match(mapSource, /badge\.textContent = "אני"/);
assert.match(mapSource, /profile\.tripLocation\.latitude/);
assert.match(mapSource, /profile\.tripLocation\.longitude/);
assert.match(mapSource, /data\?\.matches\.map/);
assert.doesNotMatch(mapSource, /navigator\.geolocation|Tel Aviv|תל אביב/);
assert.match(mapCssSource, /\.matches-map-photo-marker\.current-user[\s\S]*outline: 3px solid/);
assert.match(mapCssSource, /\.matches-map-photo-marker\.current-user span/);
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

console.log("Matches Map current-user marker verification: PASS");
