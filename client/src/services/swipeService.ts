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

export type ReceivedLikesResult =
  | {
      locked: true;
      count: number;
    }
  | {
      locked: false;
      count: number;
      data: ReceivedLike[];
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

/** Persists a like or skip and returns any reciprocal match created by it. */
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

/** Fetches swipe decisions made by the authenticated user. */
export const getSwipes = async () => {
  const response = await api.get<{
    success: true;
    count: number;
    data: SwipeRecord[];
  }>("/api/swipes");
  return response.data.data;
};

/** Fetches entitlement-aware received-like data from the backend. */
export const getReceivedLikes = async () => {
  const response = await api.get<
    ({ success: true } & ReceivedLikesResult)
  >("/api/swipes/received");
  return response.data;
};
