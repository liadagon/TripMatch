import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const clientDirectory = path.resolve(scriptDirectory, "..");
const previewSource = fs.readFileSync(
  path.join(clientDirectory, "src", "Components", "MyProfilePreview.tsx"),
  "utf8",
);
const matchedProfileSource = fs.readFileSync(
  path.join(clientDirectory, "src", "Components", "MatchedProfile.tsx"),
  "utf8",
);
const previewStyles = fs.readFileSync(
  path.join(clientDirectory, "src", "Components", "MyProfilePreview.css"),
  "utf8",
);

assert.match(previewSource, /galleryAction\?: ReactNode/);
assert.match(previewSource, /עריכת תמונות/);
assert.match(previewSource, /const MAX_PROFILE_PHOTOS = 6/);
assert.match(previewSource, /uploadProfileImage\(photo\.file\)/);
assert.match(
  previewSource,
  /updateProfile\(\{ photos, photoURL: photos\[0\] \|\| "", photo: "" \}\)/,
);
assert.match(previewSource, /releaseAllDraftObjectUrls\(\)/);
assert.match(previewSource, /setIsEditingPhotos\(false\)/);
assert.match(previewSource, /accept="image\/jpeg,image\/png,image\/webp,image\/gif"/);
assert.match(previewSource, /אפשר לשמור עד 6 תמונות בפרופיל/);
assert.doesNotMatch(previewSource, /\/photo-upload|\/questionnaire|\/profile\/setup/);

assert.doesNotMatch(matchedProfileSource, /galleryAction=/);
assert.doesNotMatch(matchedProfileSource, /עריכת תמונות|הוספת תמונה|מחיקת תמונה/);

assert.match(previewStyles, /\.profile-photo-editor-backdrop/);
assert.match(previewStyles, /@media \(max-width: 768px\)/);
assert.match(previewStyles, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);

console.log("Profile preview photo management verification passed", {
  ownPreviewControlOnly: true,
  galleryAndModalPresent: true,
  uploadInfrastructureReused: true,
  orderedPhotoSave: true,
  sixPhotoLimit: true,
  cancelStaysInPreview: true,
  onboardingRoutesAbsent: true,
  matchedProfileControlsAbsent: true,
  responsiveEditorLayout: true,
});
