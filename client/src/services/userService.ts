import api from "./api";
import type { AuthUser } from "./authService";

type UsersResponse = {
  success: true;
  count: number;
  data: AuthUser[];
};

export const getUsers = async () => {
  const response = await api.get<UsersResponse>("/api/users");
  return response.data.data;
};
