import api from "./api";
import type { PublicUser } from "./authService";

export type SwipeAction = "like" | "skip";

export type SwipeRecord = {
  _id: string;
  fromUser: string;
  toUser: string;
  action: SwipeAction;
  createdAt: string;
  updatedAt: string;
};

export type ReceivedLike = {
  _id: string;
  fromUser: PublicUser;
  createdAt: string;
  updatedAt: string;
};

type SwipeMutationResponse = {
  success: true;
  message: string;
  data: SwipeRecord;
  isMatch: boolean;
  match: {
    _id: string;
    users: string[];
    createdAt: string;
    updatedAt: string;
  } | null;
};

export const createSwipe = async (
  targetUserId: string,
  action: SwipeAction,
) => {
  const response = await api.post<SwipeMutationResponse>("/api/swipes", {
    toUser: targetUserId,
    action,
  });

  return response.data;
};

export const getSwipes = async () => {
  const response = await api.get<{
    success: true;
    count: number;
    data: SwipeRecord[];
  }>("/api/swipes");
  return response.data.data;
};

export const getReceivedLikes = async () => {
  const response = await api.get<{
    success: true;
    count: number;
    data: ReceivedLike[];
  }>("/api/swipes/received");
  return response.data.data;
};
