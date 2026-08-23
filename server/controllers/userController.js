const User = require("../models/User");
const Swipe = require("../models/Swipe");
const Match = require("../models/Match");
const Conversation = require("../models/Conversation");
const PUBLIC_PROFILE_FIELDS = require("../utils/publicProfile");
const calculateProfileCompatibility = require("../utils/profileCompatibility");
const { hasBoostAccess } = require("../utils/subscriptionEntitlement");
const {
  markRegistrationCompleteIfEligible,
  normalizeAuthenticatedUser,
} = require("../utils/onboarding");
const {
  compareDiscoverCandidates,
  getDiscoverRankingScore,
} = require("../utils/discoverRanking");
const {
  RELEVANCE_RADIUS_KM,
  calculateDistanceKm,
  getGeographicDestinationLabel,
  hasValidCoordinates,
  isSameCityAndCountry,
} = require("../utils/matchesMap");

const DISCOVER_INTERNAL_FIELDS =
  "tripLocation.latitude tripLocation.longitude questionnaire subscriptionPlan subscriptionStatus paypalSubscriptionId paypalPlanId";

const PROFILE_FIELDS = [
  "name",
  "bio",
  "age",
  "location",
  "tripLocation",
  "interests",
  "preferredDestinations",
  "travelStyle",
  "budget",
  "tripDates",
  "questionnaire",
  "photo",
  "photoURL",
  "photos",
];

const getUsers = async (req, res, next) => {
  try {
    const filter = { _id: { $ne: req.user._id } };
    const { page, limit, search } = req.query;
    const skip = (page - 1) * limit;

    if (req.query.location) {
      filter.location = req.query.location;
    }

    if (req.query.travelStyle) {
      filter.travelStyle = req.query.travelStyle;
    }

    if (search) {
      filter.$text = { $search: search };
    }

    const usersQuery = User.find(filter).select(
      `${PUBLIC_PROFILE_FIELDS} ${DISCOVER_INTERNAL_FIELDS}`
    );

    if (search) {
      usersQuery.select({ score: { $meta: "textScore" } });
    } else {
      usersQuery.sort({ _id: 1 });
    }

    const [users, total] = await Promise.all([
      usersQuery,
      User.countDocuments(filter),
    ]);
    const rankedUsers = users
      .map((user) => {
        const compatibility = calculateProfileCompatibility(req.user, user);
        const profile = user.toObject();
        const textScore = Number(profile.score) || 0;

        return {
          id: user._id,
          user,
          compatibility,
          compatibilityPercentage: compatibility.percentage,
          rankingScore: getDiscoverRankingScore(
            compatibility.percentage,
            hasBoostAccess(user),
          ),
          textScore,
        };
      })
      .sort((left, right) =>
        compareDiscoverCandidates(left, right, Boolean(search)),
      )
      .slice(skip, skip + limit);

    const data = rankedUsers.map(({ user, compatibility }) => {
      const profile = user.toObject();
      const candidateLocation = user.tripLocation;
      const destinationLabel = getGeographicDestinationLabel(candidateLocation);
      const hasComparableDestinations =
        hasValidCoordinates(req.user.tripLocation) &&
        hasValidCoordinates(candidateLocation) &&
        Boolean(destinationLabel);
      const distanceKm = hasComparableDestinations
        ? calculateDistanceKm(req.user.tripLocation, candidateLocation)
        : null;

      delete profile.questionnaire;
      delete profile.score;
      delete profile.subscriptionPlan;
      delete profile.subscriptionStatus;
      delete profile.paypalSubscriptionId;
      delete profile.paypalPlanId;

      if (profile.tripLocation) {
        profile.tripLocation = {
          ...(profile.tripLocation.city
            ? { city: profile.tripLocation.city }
            : {}),
          ...(profile.tripLocation.state
            ? { state: profile.tripLocation.state }
            : {}),
          ...(profile.tripLocation.country
            ? { country: profile.tripLocation.country }
            : {}),
          ...(profile.tripLocation.countryCode
            ? { countryCode: profile.tripLocation.countryCode }
            : {}),
        };
      }

      return {
        ...profile,
        compatibility,
        ...(hasComparableDestinations
          ? {
              destinationInfo: {
                label: destinationLabel,
                distanceKm: Number(distanceKm.toFixed(1)),
                sameCity: isSameCityAndCountry(
                  req.user.tripLocation,
                  candidateLocation
                ),
                nearby: distanceKm <= RELEVANCE_RADIUS_KM,
              },
            }
          : {}),
      };
    });

    res.status(200).json({
      success: true,
      count: data.length,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select(
      PUBLIC_PROFILE_FIELDS
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    return next(error);
  }
};

const getCurrentUserStats = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const [likeStats, realMatches, realConversations] = await Promise.all([
      Swipe.aggregate([
        {
          $match: {
            action: "like",
            $or: [{ fromUser: userId }, { toUser: userId }],
          },
        },
        {
          $facet: {
            outgoingLikes: [
              { $match: { fromUser: userId } },
              { $count: "total" },
            ],
            receivedLikes: [
              { $match: { toUser: userId } },
              { $count: "total" },
            ],
          },
        },
      ]),
      Match.countDocuments({ users: userId }),
      Conversation.countDocuments({ participants: userId }),
    ]);

    const realOutgoingLikes = likeStats[0]?.outgoingLikes[0]?.total || 0;
    const likesReceived = likeStats[0]?.receivedLikes[0]?.total || 0;
    const matchRate =
      realOutgoingLikes === 0
        ? 0
        : Math.round(realMatches / realOutgoingLikes * 100);

    return res.status(200).json({
      success: true,
      data: {
        outgoingLikes: realOutgoingLikes,
        likesReceived,
        matches: realMatches,
        conversations: realConversations,
        matchRate,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const updateCurrentUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    PROFILE_FIELDS.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        user[field] = req.body[field];
      }
    });

    markRegistrationCompleteIfEligible(user);
    await user.save();
    const data = normalizeAuthenticatedUser(user);

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      data,
      registrationComplete: data.registrationComplete,
      registrationInProgress: data.registrationInProgress,
      nextRegistrationStep: data.nextRegistrationStep,
      onboardingComplete: data.onboardingComplete,
      nextOnboardingStep: data.nextOnboardingStep,
    });
  } catch (error) {
    return next(error);
  }
};

const deleteCurrentUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
      data: user,
    });
  } catch (error) {
    return next(error);
  }
};

const rejectLegacyMutation = (req, res) =>
  res.status(403).json({
    success: false,
    message: "You are not allowed to modify or delete another user",
  });

module.exports = {
  getUsers,
  getUserById,
  getCurrentUserStats,
  updateCurrentUser,
  deleteCurrentUser,
  rejectLegacyMutation,
};
