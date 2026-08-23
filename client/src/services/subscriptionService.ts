import axios from "axios";
import api from "./api";

export type SubscriptionStatus =
  | "none"
  | "approval_pending"
  | "approved"
  | "active"
  | "suspended"
  | "cancelled"
  | "expired"
  | "payment_failed";

export type SubscriptionState = {
  plan: "free" | "boost";
  status: SubscriptionStatus;
  active: boolean;
  paypalSubscriptionId: string | null;
  currentPeriodEnd: string | null;
  canManage: boolean;
};

export type CreatePayPalSubscriptionResult = {
  success: true;
  subscriptionId: string;
  approvalUrl: string | null;
  status: SubscriptionStatus;
  reused: boolean;
};

export async function createPayPalSubscription() {
  const response = await api.post<CreatePayPalSubscriptionResult>(
    "/api/subscriptions/paypal",
  );
  return response.data;
}

export async function getMySubscription() {
  const response = await api.get<{
    success: true;
    data: SubscriptionState;
  }>("/api/subscriptions/me");
  return response.data.data;
}

export async function cancelPayPalSubscription() {
  const response = await api.post<{
    success: true;
    message: string;
    data: SubscriptionState;
  }>("/api/subscriptions/paypal/cancel");
  return response.data.data;
}

export function getSubscriptionErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error) && error.response?.status === 401) {
    return "פג תוקף החיבור. התחברי מחדש כדי לנהל את המנוי.";
  }

  return fallback;
}
