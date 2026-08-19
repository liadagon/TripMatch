import api from "./api";
import type { PublicUser } from "./authService";

export type MessageRecord = {
  _id: string;
  sender: string;
  text: string;
  createdAt: string;
  updatedAt: string;
};

export type ConversationSummary = {
  _id: string;
  match: string;
  participants: PublicUser[];
  lastMessage: MessageRecord | null;
  createdAt: string;
  updatedAt: string;
};

export type ConversationDetails = {
  _id: string;
  match: string;
  participants: PublicUser[];
  messages: MessageRecord[];
  createdAt: string;
  updatedAt: string;
  blockStatus: {
    blocked: boolean;
    blockedByMe: boolean;
  };
};

export const getConversations = async () => {
  const response = await api.get<{
    success: true;
    count: number;
    data: ConversationSummary[];
  }>("/api/conversations");
  return response.data.data;
};

export const getConversationWithUser = async (userId: string) => {
  const response = await api.get<{
    success: true;
    data: { _id: string };
  }>(`/api/conversations/with/${userId}`);
  return response.data.data;
};

export const getMessages = async (conversationId: string) => {
  const response = await api.get<{
    success: true;
    data: ConversationDetails;
  }>(`/api/conversations/${conversationId}/messages`);
  return response.data.data;
};

export const sendMessage = async (conversationId: string, text: string) => {
  const response = await api.post<{
    success: true;
    data: MessageRecord;
  }>(`/api/conversations/${conversationId}/messages`, { text });
  return response.data.data;
};

export const clearConversation = async (conversationId: string) => {
  await api.delete(`/api/conversations/${conversationId}`, { data: {} });
};
