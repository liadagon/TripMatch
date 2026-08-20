import api from "./api";

export type MatchesMapUser = {
  latitude: number;
  longitude: number;
  destinationLabel: string;
};

export type MatchesMapMarker = {
  userId: string;
  name: string;
  photoURL: string;
  destinationLabel: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
};

export type MatchesMapData = {
  me: MatchesMapUser | null;
  matches: MatchesMapMarker[];
  eligibleMatchCount: number;
  radiusKm: number;
};

export const getMatchesMap = async () => {
  const response = await api.get<{
    success: true;
    data: MatchesMapData;
  }>("/api/matches/map");

  return response.data.data;
};
