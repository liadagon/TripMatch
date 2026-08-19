import { getConversations } from "./conversationService";
import { getMatches } from "./matchService";
import { getReceivedLikes, getSwipes } from "./swipeService";

export type ProfileStatistics = {
  matchRate: number;
  likesReceived: number;
  conversations: number;
};

export function calculateMatchRate(matches: number, likesSent: number) {
  if (likesSent === 0) return 0;

  return Math.round((matches / likesSent) * 100);
}

export async function getProfileStatistics(): Promise<ProfileStatistics> {
  const [swipes, receivedLikes, matches, conversations] = await Promise.all([
    getSwipes(),
    getReceivedLikes(),
    getMatches(),
    getConversations(),
  ]);
  const likesSent = swipes.filter((swipe) => swipe.action === "like").length;

  return {
    matchRate: calculateMatchRate(matches.length, likesSent),
    likesReceived: receivedLikes.length,
    conversations: conversations.length,
  };
}
