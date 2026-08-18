import api from "./api";

export type SwipeAction = "like" | "skip";

export type SwipeRecord = {
  _id: string;
  fromUser: string;
  toUser: string;
  action: SwipeAction;
  createdAt: string;
  updatedAt: string;
};

export const createSwipe = (toUser: string, action: SwipeAction) =>
  api.post("/api/swipes", { toUser, action });

export const getSwipes = async () => {
  const response = await api.get<{
    success: true;
    count: number;
    data: SwipeRecord[];
  }>("/api/swipes");
  return response.data.data;
};
