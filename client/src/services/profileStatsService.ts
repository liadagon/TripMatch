import api from "./api";

export type ProfileStatistics = {
  outgoingLikes: number;
  matchRate: number;
  likesReceived: number;
  matches: number;
  conversations: number;
};

/** Fetches private match, like and conversation totals for the current user. */
export async function getProfileStatistics(): Promise<ProfileStatistics> {
  const response = await api.get<{
    success: true;
    data: ProfileStatistics;
  }>("/api/users/me/stats");

  return response.data.data;
}
