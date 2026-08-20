import api from "./api";
import type { PublicUser } from "./authService";

export type DestinationInfo = {
  label: string;
  distanceKm: number;
  sameCity: boolean;
  nearby: boolean;
};

export type DiscoverUser = Omit<PublicUser, "tripLocation"> & {
  tripLocation?: {
    city?: string;
    state?: string;
    country?: string;
    countryCode?: string;
  };
  destinationInfo?: DestinationInfo;
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

export const getUsers = async (page = 1, limit = 10, search = "") => {
  const response = await api.get<UsersResponse>("/api/users", {
    params: { page, limit, ...(search.trim() ? { search: search.trim() } : {}) },
  });
  return response.data.data;
};
