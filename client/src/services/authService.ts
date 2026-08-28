import api from "./api";
import type { TripLocation } from "../types/tripLocation";
import type { ApplicationGender } from "../utils/genderedHebrew";

export type AuthUser = {
  _id: string;
  name: string;
  email: string;
  authProvider: "local" | "google" | "email";
  emailVerified?: boolean;
  gender?: ApplicationGender;
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
    accommodationPreference: string;
    companionScope: string;
    companionPriority: string;
    dealBreaker: string;
  };
  onboardingComplete: boolean;
  nextOnboardingStep: "photos" | "questionnaire" | "profile" | null;
  registrationComplete: boolean;
  registrationInProgress: boolean;
  nextRegistrationStep: "photos" | "questionnaire" | "profile" | null;
};

export type PublicUser = Pick<
  AuthUser,
  | "_id"
  | "name"
  | "gender"
  | "age"
  | "location"
  | "bio"
  | "interests"
  | "preferredDestinations"
  | "travelStyle"
  | "budget"
  | "tripDates"
  | "tripDuration"
  | "photo"
  | "photoURL"
  | "photos"
> & {
  questionnaire?: AuthUser["questionnaire"];
  tripLocation?: Omit<
    TripLocation,
    "placeId" | "formattedAddress" | "latitude" | "longitude"
  >;
};

export type ProfilePreviewUser = Pick<
  AuthUser,
  | "_id"
  | "name"
  | "gender"
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
  onboardingComplete: boolean;
  nextOnboardingStep: AuthUser["nextOnboardingStep"];
  authenticated: true;
  registrationComplete: boolean;
  registrationInProgress: boolean;
  nextRegistrationStep: AuthUser["nextRegistrationStep"];
  accountState: "new_registration" | "registration_in_progress" | "registered";
};

export type AuthenticationResult = {
  user: AuthUser;
  isNewUser: boolean;
};

export type GoogleAuthenticationResult = AuthenticationResult;

export type EmailOtpRequestResponse = {
  success: true;
  message: string;
  expiresInSeconds: number;
  cooldownSeconds: number;
};

export type EmailOtpVerifyResponse = GoogleLoginResponse;

export type EmailLoginResponse = {
  success: true;
  message: string;
  token: string;
  data: AuthUser;
  onboardingComplete: boolean;
  nextOnboardingStep: AuthUser["nextOnboardingStep"];
  authenticated: true;
  registrationComplete: boolean;
  registrationInProgress: boolean;
  nextRegistrationStep: AuthUser["nextRegistrationStep"];
  accountState: "new_registration" | "registration_in_progress" | "registered";
};

export type RegisterPayload = {
  name?: string;
  email: string;
  password: string;
  bio?: string;
  age?: number;
  location?: string;
  tripLocation?: TripLocation;
  preferredDestinations?: string[];
  travelStyle?: string;
  budget?: string;
  tripDates?: string;
  tripDuration?: string;
};

type CurrentUserResponse = {
  success: true;
  data: AuthUser;
  onboardingComplete: boolean;
  nextOnboardingStep: AuthUser["nextOnboardingStep"];
  authenticated: true;
  registrationComplete: boolean;
  registrationInProgress: boolean;
  nextRegistrationStep: AuthUser["nextRegistrationStep"];
  accountState: "registration_in_progress" | "registered";
};

export const googleLogin = (
  idToken: string,
  intent: "login" | "register",
) => api.post<GoogleLoginResponse>("/api/auth/google", { idToken, intent });

export const requestEmailOtp = (
  email: string,
  intent: "login" | "register",
) => api.post<EmailOtpRequestResponse>("/api/auth/email/request-code", {
  email,
  intent,
});

export const verifyEmailOtp = (
  email: string,
  code: string,
  intent: "login" | "register",
) =>
  api.post<EmailOtpVerifyResponse>("/api/auth/email/verify-code", {
    email,
    code,
    intent,
  });

export const emailLogin = (email: string, password: string) =>
  api.post<EmailLoginResponse>("/api/auth/login", { email, password });

export const registerUser = (payload: RegisterPayload) =>
  api.post<EmailLoginResponse>("/api/auth/register", payload);

export const getCurrentUser = (token?: string) =>
  api.get<CurrentUserResponse>("/api/auth/me", {
    ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
  });

export const deleteCurrentAccount = () =>
  api.delete<{ success: true }>("/api/users/me");
