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
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
};

export const getUsers = async (page = 1, limit = 10) => {
  const response = await api.get<UsersResponse>("/api/users", {
    params: { page, limit },
  });
  return response.data.data;
};
