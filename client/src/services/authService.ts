import api from "./api";
import type { TripLocation } from "../types/tripLocation";

export type AuthUser = {
  _id: string;
  name: string;
  email: string;
  authProvider: "local" | "google";
  firebaseUid?: string;
  photo?: string;
  photoURL?: string;
  photos?: string[];
  bio?: string;
  age?: number;
  location?: string;
  tripLocation?: TripLocation;
  interests?: string[];
  preferredDestinations?: string[];
  travelStyle?: string;
  budget?: string;
  tripDates?: string;
  tripDuration?: string;
  questionnaire?: {
    planningStyle: string;
    accommodationPreference: string;
    companionScope: string;
    companionPriority: string;
    dealBreaker: string;
  };
};

export type PublicUser = Pick<
  AuthUser,
  | "_id"
  | "name"
  | "age"
  | "location"
  | "bio"
  | "interests"
  | "preferredDestinations"
  | "travelStyle"
  | "budget"
  | "tripDates"
  | "photo"
  | "photoURL"
> & {
  tripLocation?: Omit<
    TripLocation,
    "placeId" | "formattedAddress" | "latitude" | "longitude"
  >;
};

export type ProfilePreviewUser = Pick<
  AuthUser,
  | "_id"
  | "name"
  | "age"
  | "location"
  | "tripLocation"
  | "bio"
  | "interests"
  | "preferredDestinations"
  | "tripDates"
  | "tripDuration"
  | "budget"
  | "travelStyle"
  | "photoURL"
  | "photo"
  | "photos"
  | "questionnaire"
>;

export type GoogleLoginResponse = {
  success: true;
  message: string;
  token: string;
  data: AuthUser;
  isNewUser: boolean;
};

export type EmailLoginResponse = {
  success: true;
  message: string;
  token: string;
  data: AuthUser;
};

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
  bio?: string;
  age?: number;
  location?: string;
  tripLocation: TripLocation;
  preferredDestinations?: string[];
  travelStyle?: string;
  budget?: string;
  tripDates?: string;
  tripDuration?: string;
};

type CurrentUserResponse = {
  success: true;
  data: AuthUser;
};

export const googleLogin = (idToken: string) =>
  api.post<GoogleLoginResponse>("/api/auth/google", { idToken });

export const emailLogin = (email: string, password: string) =>
  api.post<EmailLoginResponse>("/api/auth/login", { email, password });

export const registerUser = (payload: RegisterPayload) =>
  api.post<EmailLoginResponse>("/api/auth/register", payload);

export const getCurrentUser = () =>
  api.get<CurrentUserResponse>("/api/auth/me");
