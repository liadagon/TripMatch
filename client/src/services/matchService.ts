import api from "./api";
import type { ProfilePreviewUser, PublicUser } from "./authService";

export type MatchRecord = {
  _id: string;
  users: PublicUser[];
  createdAt: string;
  updatedAt: string;
};

export const getMatches = async () => {
  const response = await api.get<{
    success: true;
    count: number;
    data: MatchRecord[];
  }>("/api/matches");
  return response.data.data;
};

export type MatchedProfileData = {
  profile: ProfilePreviewUser;
  compatibility: {
    percentage: number;
    matchedCriteria: number;
    comparedCriteria: number;
  };
  conversationId: string;
};

export const getMatchedProfile = async (userId: string) => {
  const response = await api.get<{
    success: true;
    data: MatchedProfileData;
  }>(`/api/matches/with/${userId}/profile`);
  return response.data.data;
};
