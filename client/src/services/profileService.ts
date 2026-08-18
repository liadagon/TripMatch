import api from "./api";
import type { AuthUser } from "./authService";

type FileUploadResponse = {
  success: true;
  url: string;
};

export type ProfileUpdatePayload = Partial<
  Pick<
    AuthUser,
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
  >
>;

type ProfileUpdateResponse = {
  success: true;
  data: AuthUser;
};

export const uploadProfileImage = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  const uploadResponse = await api.post<FileUploadResponse>("/api/file", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return uploadResponse.data.url;
};

export const updateCurrentProfile = async (payload: ProfileUpdatePayload) => {
  const response = await api.put<ProfileUpdateResponse>("/api/users/me", payload);
  return response.data.data;
};
