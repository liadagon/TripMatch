import api from "./api";

export type ProfileStatistics = {
  outgoingLikes: number;
  matchRate: number;
  likesReceived: number;
  matches: number;
  conversations: number;
};

export async function getProfileStatistics(): Promise<ProfileStatistics> {
  const response = await api.get<{
    success: true;
    data: ProfileStatistics;
  }>("/api/users/me/stats");

  return response.data.data;
}
