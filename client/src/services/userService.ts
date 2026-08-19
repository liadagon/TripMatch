import api from "./api";
import type { PublicUser } from "./authService";

export type DiscoverUser = PublicUser & {
  compatibility: {
    percentage: number;
    matchedCriteria: number;
    comparedCriteria: number;
  };
};

type UsersResponse = {
  success: true;
  count: number;
  data: DiscoverUser[];
};

export const getUsers = async () => {
  const response = await api.get<UsersResponse>("/api/users");
  return response.data.data;
};
