import type { AuthUser } from "../services/authService";

const APP_PROFILE_FILE_PATH = /^\/api\/file\/[a-f\d]{24}$/i;

export function isAppOwnedProfilePhoto(value: string | undefined) {
  if (!value?.trim()) return false;

  try {
    const pathname = new URL(value.trim(), "https://tripmatch.invalid").pathname;
    return APP_PROFILE_FILE_PATH.test(pathname) || pathname.startsWith("/public/");
  } catch {
    return false;
  }
}

export function getAuthenticatedProfilePhotos(user: AuthUser | null) {
  if (!user) return [];

  return [user.photoURL, user.photo, ...(user.photos || [])]
    .filter((photo): photo is string => isAppOwnedProfilePhoto(photo))
    .filter((photo, index, photos) => photos.indexOf(photo) === index);
}

export function getAuthenticatedIdentity(user: AuthUser | null) {
  return {
    name: user?.name?.trim() || "",
    photoURL: getAuthenticatedProfilePhotos(user)[0] || "",
  };
}
