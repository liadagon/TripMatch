import api from "./api";

export const blockMatchedUser = async (userId: string) => {
  await api.post(`/api/blocks/${userId}`, {});
};

export const unblockMatchedUser = async (userId: string) => {
  await api.delete(`/api/blocks/${userId}`, { data: {} });
};
