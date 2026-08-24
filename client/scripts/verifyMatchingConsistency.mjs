import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const read = (relativePath) => readFile(new URL(relativePath, import.meta.url), "utf8");
const loadTypeScriptModule = async (source) => {
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
};

const [profilesSource, optionsSource, compatibilitySource, discoverSource, mapSource, matchedProfileSource, likesSource, conversationsSource] = await Promise.all([
  read("../src/data/demoProfiles.ts"),
  read("../src/data/profileOptions.ts"),
  read("../src/utils/profileCompatibility.ts"),
  read("../src/Components/Discover.tsx"),
  read("../src/Components/MatchesMap.tsx"),
  read("../src/Components/MatchedProfile.tsx"),
  read("../src/Components/Likes.tsx"),
  read("../src/data/conversations.ts"),
]);

const [{ demoProfiles }, { PROFILE_OPTIONS }, { calculateProfileCompatibility }] = await Promise.all([
  loadTypeScriptModule(profilesSource),
  loadTypeScriptModule(optionsSource),
  loadTypeScriptModule(compatibilitySource),
]);

assert.equal(demoProfiles.length, 4);
assert.equal(demoProfiles.filter((profile) => profile.hasLikedCurrentUser).length, 2);
assert.equal(demoProfiles.filter((profile) => !profile.hasLikedCurrentUser).length, 2);

for (const profile of demoProfiles) {
  assert.ok(profile.name && profile.age >= 18 && profile.bio.length >= 20);
  assert.ok(profile.photos.length > 0 && profile.photos.every((photo) => photo.startsWith("/")));
  assert.ok(profile.tripLocation.placeId && profile.tripLocation.formattedAddress);
  assert.ok(Number.isFinite(profile.tripLocation.latitude));
  assert.ok(Number.isFinite(profile.tripLocation.longitude));
  assert.ok(PROFILE_OPTIONS.destinations.includes(profile.preferredDestinations[0]));
  assert.ok(PROFILE_OPTIONS.tripDates.includes(profile.tripDates));
  assert.ok(PROFILE_OPTIONS.tripDurations.includes(profile.tripDuration));
  assert.ok(PROFILE_OPTIONS.budgets.includes(profile.budget));
  assert.ok(PROFILE_OPTIONS.travelStyles.includes(profile.travelStyle));
  assert.ok(profile.interests.every((value) => PROFILE_OPTIONS.interests.includes(value)));
  assert.ok(PROFILE_OPTIONS.accommodationPreferences.includes(profile.questionnaire.accommodationPreference));
  assert.ok(PROFILE_OPTIONS.companionScopes.includes(profile.questionnaire.companionScope));
  assert.ok(PROFILE_OPTIONS.companionPriorities.includes(profile.questionnaire.companionPriority));
  assert.ok(PROFILE_OPTIONS.dealBreakers.includes(profile.questionnaire.dealBreaker));
  assert.equal("planningStyle" in profile.questionnaire, false);
  const result = calculateProfileCompatibility(profile, profile);
  assert.deepEqual(result, { percentage: 100, matchedCriteria: 9, comparedCriteria: 9 });
}

assert.doesNotMatch(profilesSource, /Tel Aviv|תל אביב|unsplash|dicebear|\bmatch\s*:/i);
assert.doesNotMatch(compatibilitySource, /planningStyle/);
assert.match(discoverSource, /setProfiles\(\[\.\.\.realProfiles, \.\.\.demoProfiles\]\)/);
assert.match(discoverSource, /calculateProfileCompatibility\(currentUser, profile\)/);
assert.doesNotMatch(discoverSource, /unsplash|"ישראל"|"גמיש"|עדיין לא נבחר יעד/);
assert.match(mapSource, /profile\.tripLocation\.latitude/);
assert.match(mapSource, /profile\.tripLocation\.longitude/);
assert.doesNotMatch(mapSource, /DEMO_DISTANCES_KM|DEMO_BEARINGS_DEGREES/);
assert.match(matchedProfileSource, /getDemoMatchedUserIds/);
assert.match(matchedProfileSource, /getDemoMatchedProfile\(demoProfile/);
assert.match(likesSource, /profile\.hasLikedCurrentUser/);
assert.match(likesSource, /isBoostActive[\s\S]*demoReceivedLikes/);
assert.doesNotMatch(conversationsSource, /demoChatMessages|preview:|match:/);

console.log("Real/demo matching consistency verification: PASS");
