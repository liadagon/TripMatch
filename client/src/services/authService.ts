import api from "./api";

export type AuthUser = {
  _id: string;
  name: string;
  email: string;
  authProvider: "local" | "google";
  firebaseUid?: string;
  photo?: string;
  photoURL?: string;
  bio?: string;
  age?: number;
  location?: string;
  interests?: string[];
  preferredDestinations?: string[];
  travelStyle?: string;
};

export type GoogleLoginResponse = {
  success: true;
  message: string;
  token: string;
  data: AuthUser;
  isNewUser: boolean;
};

type CurrentUserResponse = {
  success: true;
  data: AuthUser;
};

export const googleLogin = (idToken: string) =>
  api.post<GoogleLoginResponse>("/api/auth/google", { idToken });

export const getCurrentUser = () =>
  api.get<CurrentUserResponse>("/api/auth/me");
