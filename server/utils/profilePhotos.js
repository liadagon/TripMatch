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

module.exports = {
  getAppOwnedPhotoUrls,
  isAppOwnedPhotoUrl,
};
