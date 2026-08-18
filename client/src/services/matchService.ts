import api from "./api";
import type { AuthUser } from "./authService";

export type MatchRecord = {
  _id: string;
  users: AuthUser[];
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
