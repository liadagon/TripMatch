import api from "./api";
import type { PublicUser } from "./authService";

type UsersResponse = {
  success: true;
  count: number;
  data: PublicUser[];
};

export const getUsers = async () => {
  const response = await api.get<UsersResponse>("/api/users");
  return response.data.data;
};
