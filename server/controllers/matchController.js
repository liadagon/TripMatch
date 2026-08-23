const Match = require("../models/Match");
const User = require("../models/User");
const getBlockStatus = require("../utils/blockRelationship");
const { getBlockedUserIds } = require("../utils/blockRelationship");
const calculateProfileCompatibility = require("../utils/profileCompatibility");
const ensureConversation = require("../utils/ensureConversation");
const { getAppOwnedPhotoUrls } = require("../utils/profilePhotos");
const {
  RELEVANCE_RADIUS_KM,
  approximateCoordinates,
  calculateDistanceKm,
  getDestinationLabel,
  hasValidCoordinates,
  isSameCityAndCountry,
} = require("../utils/matchesMap");

const MATCH_PROFILE_FIELDS = "name photo photoURL";
const EXPANDED_MATCH_PROFILE_FIELDS = [
  "name",
  "age",
  "location",
  "bio",
  "interests",
  "preferredDestinations",
  "tripDates",
  "tripDuration",
  "budget",
  "travelStyle",
  "photoURL",
  "photo",
  "photos",
  "questionnaire",
].join(" ");
const MAP_PROFILE_FIELDS = "name photo photoURL tripLocation";

const getCurrentUserMatches = async (req, res, next) => {
  try {
    const blockedUserIds = await getBlockedUserIds(req.user._id);
    const matches = await Match.find({
      $and: [
        { users: req.user._id },
        ...(blockedUserIds.length ? [{ users: { $nin: blockedUserIds } }] : []),
      ],
    })
      .sort({ createdAt: -1 })
      .populate("users", MATCH_PROFILE_FIELDS);

    return res.status(200).json({
      success: true,
      count: matches.length,
      data: matches,
    });
  } catch (error) {
    return next(error);
  }
};

const getMatchesMap = async (req, res, next) => {
  try {
    const currentLocation = req.user.tripLocation;

    if (!hasValidCoordinates(currentLocation)) {
      return res.status(200).json({
        success: true,
        data: {
          me: null,
          matches: [],
          eligibleMatchCount: 0,
          radiusKm: RELEVANCE_RADIUS_KM,
        },
      });
    }

    const blockedUserIds = await getBlockedUserIds(req.user._id);
    const matches = await Match.find({
      $and: [
        { users: req.user._id },
        ...(blockedUserIds.length ? [{ users: { $nin: blockedUserIds } }] : []),
      ],
    })
      .select("users")
      .lean();
    const matchedUserIds = matches.flatMap((match) =>
      match.users.filter((userId) => String(userId) !== String(req.user._id))
    );
    const matchedUsers = matchedUserIds.length
      ? await User.find({ _id: { $in: matchedUserIds } })
          .select(MAP_PROFILE_FIELDS)
          .lean()
      : [];
    const mapMatches = matchedUsers.flatMap((matchedUser) => {
      if (!hasValidCoordinates(matchedUser.tripLocation)) return [];

      const distanceKm = calculateDistanceKm(
        currentLocation,
        matchedUser.tripLocation
      );
      const isRelevant =
        isSameCityAndCountry(currentLocation, matchedUser.tripLocation) ||
        distanceKm <= RELEVANCE_RADIUS_KM;

      if (!isRelevant) return [];

      const approximatePosition = approximateCoordinates(
        matchedUser.tripLocation,
        matchedUser._id
      );
      const [photoURL = ""] = getAppOwnedPhotoUrls(matchedUser);

      return [
        {
          userId: matchedUser._id,
          name: matchedUser.name,
          photoURL,
          destinationLabel: getDestinationLabel(matchedUser.tripLocation),
          latitude: approximatePosition.latitude,
          longitude: approximatePosition.longitude,
          distanceKm: Number(distanceKm.toFixed(1)),
        },
      ];
    });

    mapMatches.sort(
      (first, second) =>
        first.distanceKm - second.distanceKm ||
        first.name.localeCompare(second.name)
    );

    return res.status(200).json({
      success: true,
      data: {
        me: {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          destinationLabel: getDestinationLabel(currentLocation),
        },
        matches: mapMatches,
        eligibleMatchCount: matchedUsers.length,
        radiusKm: RELEVANCE_RADIUS_KM,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const getMatchedUserProfile = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;
    const targetUserId = req.params.userId;

    if (currentUserId.equals(targetUserId)) {
      return res.status(403).json({
        success: false,
        message: "Matched profile access requires another matched user",
      });
    }

    const match = await Match.findOne({
      users: { $all: [currentUserId, targetUserId] },
    });

    if (!match) {
      return res.status(403).json({
        success: false,
        message: "A current Match is required to view this profile",
      });
    }

    const blockStatus = await getBlockStatus(currentUserId, targetUserId);

    if (blockStatus.blocked) {
      return res.status(403).json({
        success: false,
        message: "This matched profile is unavailable",
      });
    }

    const [targetUser, conversation] = await Promise.all([
      User.findById(targetUserId).select(EXPANDED_MATCH_PROFILE_FIELDS),
      ensureConversation(match),
    ]);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "Matched user not found",
      });
    }

    const compatibility = calculateProfileCompatibility(req.user, targetUser);

    return res.status(200).json({
      success: true,
      data: {
        profile: targetUser,
        compatibility,
        conversationId: conversation._id,
      },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getCurrentUserMatches,
  getMatchesMap,
  getMatchedUserProfile,
};
