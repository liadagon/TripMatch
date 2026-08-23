const APP_PROFILE_FILE_PATH = /^\/api\/file\/[a-f\d]{24}$/i;

function getPhotoPath(value) {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    return new URL(value.trim(), "https://tripmatch.invalid").pathname;
  } catch {
    return "";
  }
}

function isAppOwnedPhotoUrl(value) {
  const pathname = getPhotoPath(value);
  return APP_PROFILE_FILE_PATH.test(pathname) || pathname.startsWith("/public/");
}

function getAppOwnedPhotoUrls(user) {
  const candidates = [
    user?.photoURL,
    user?.photo,
    ...(Array.isArray(user?.photos) ? user.photos : []),
  ];
  return [...new Set(candidates.filter(isAppOwnedPhotoUrl))];
}

function sanitizeUserPhotoFields(user) {
  if (!user || typeof user !== "object") return user;
  const appPhotos = getAppOwnedPhotoUrls(user);
  user.photoURL = isAppOwnedPhotoUrl(user.photoURL)
    ? user.photoURL
    : appPhotos[0] || "";
  user.photo = isAppOwnedPhotoUrl(user.photo) ? user.photo : "";
  user.photos = appPhotos;
  return user;
}

module.exports = {
  getAppOwnedPhotoUrls,
  isAppOwnedPhotoUrl,
  sanitizeUserPhotoFields,
};
