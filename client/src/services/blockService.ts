import api from "./api";
import type { PublicUser } from "./authService";

export type BlockStatus = {
  blocked: boolean;
  blockedByMe: boolean;
};

export type BlockedUserRecord = {
  _id: string;
  blocked: PublicUser;
  createdAt: string;
};

/** Fetches the authenticated user's blocked-profile list. */
export const getBlockedUsers = async () => {
  const response = await api.get<{
    success: true;
    count: number;
    data: BlockedUserRecord[];
  }>("/api/blocks");
  return response.data.data;
};

/** Blocks an existing matched user and returns the resulting relationship state. */
export const blockMatchedUser = async (userId: string) => {
  const response = await api.post<{
    success: true;
    blockStatus: BlockStatus;
  }>(`/api/blocks/${userId}`, {});
  return response.data.blockStatus;
};

/** Removes the authenticated user's block for a matched user. */
export const unblockMatchedUser = async (userId: string) => {
  const response = await api.delete<{
    success: true;
    removed: boolean;
    blockStatus: BlockStatus;
  }>(`/api/blocks/${userId}`, { data: {} });
  return response.data;
};
