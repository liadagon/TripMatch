const User = require("../models/User");
const Swipe = require("../models/Swipe");
const Match = require("../models/Match");
const Conversation = require("../models/Conversation");
const PUBLIC_PROFILE_FIELDS = require("../utils/publicProfile");
const calculateProfileCompatibility = require("../utils/profileCompatibility");
const { hasBoostAccess } = require("../utils/subscriptionEntitlement");
const {
  CURRENT_REGISTRATION_FLOW_VERSION,
  getRegistrationState,
  getCurrentRegistrationValidationErrors,
  markRegistrationCompleteIfEligible,
  normalizeAuthenticatedUser,
} = require("../utils/onboarding");
const { deleteUserAccount } = require("../services/accountDeletionService");
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
const {
  filterCanonicalInterests,
} = require("../constants/profileOptions");
const {
  getAppOwnedPhotoUrls,
  isAppOwnedPhotoUrl,
} = require("../utils/profilePhotos");
const {
  deleteOwnedProfileImagesByUrls,
  getOwnedProfileImageIds,
  getProfileImageIdFromUrl,
} = require("../services/profileImageStorage");
const getBlockStatus = require("../utils/blockRelationship");
const { getBlockedUserIds } = getBlockStatus;

const DISCOVER_INTERNAL_FIELDS =
  "tripLocation.latitude tripLocation.longitude registrationCompletedAt registrationFlowVersion subscriptionPlan subscriptionStatus paypalSubscriptionId paypalPlanId";

const PROFILE_FIELDS = [
  "name",
  "bio",
  "age",
  "tripLocation",
  "interests",
  "preferredDestinations",
  "travelStyle",
  "budget",
  "tripDates",
  "tripDuration",
  "questionnaire",
  "photo",
  "photoURL",
  "photos",
];

/** Returns eligible discovery profiles for the authenticated user. */
const getUsers = async (req, res, next) => {
  try {
    const [blockedUserIds, swipedUserIds] = await Promise.all([
      getBlockedUserIds(req.user._id),
      Swipe.distinct("toUser", { fromUser: req.user._id }),
    ]);
    const unavailableUserIds = [
      ...new Set(
        [...blockedUserIds, ...swipedUserIds].map((userId) => String(userId)),
      ),
    ];
    const filter = {
      _id: {
        $ne: req.user._id,
        ...(unavailableUserIds.length ? { $nin: unavailableUserIds } : {}),
      },
    };
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

    const users = await usersQuery;
    const eligibleUsers = users.filter(
      (user) => getRegistrationState(user).registrationComplete,
    );
    const total = eligibleUsers.length;
    const rankedUsers = eligibleUsers
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

      delete profile.registrationCompletedAt;
      delete profile.registrationFlowVersion;
      delete profile.score;
      delete profile.subscriptionPlan;
      delete profile.subscriptionStatus;
      delete profile.paypalSubscriptionId;
      delete profile.paypalPlanId;
      profile.interests = filterCanonicalInterests(profile.interests);

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

/** Returns a public user profile by identifier. */
const getUserById = async (req, res, next) => {
  try {
    const blockStatus = await getBlockStatus(req.user._id, req.params.id);

    if (blockStatus.blocked) {
      return res.status(403).json({
        success: false,
        message: "This user profile is unavailable",
      });
    }

    const user = await User.findById(req.params.id).select(
      PUBLIC_PROFILE_FIELDS
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const profile = user.toObject();
    profile.interests = filterCanonicalInterests(profile.interests);

    return res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    return next(error);
  }
};

/** Computes match, like, and conversation statistics for the current user. */
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

/** Validates and persists allowed profile updates for the current user. */
const updateCurrentUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    let removedProfilePhotos = [];
    if (Object.prototype.hasOwnProperty.call(req.body, "photos")) {
      const requestedPhotos = [...new Set(req.body.photos)];
      if (
        requestedPhotos.length !== req.body.photos.length ||
        requestedPhotos.some((photo) => !isAppOwnedPhotoUrl(photo))
      ) {
        return res.status(400).json({
          success: false,
          code: "INVALID_PROFILE_PHOTOS",
          message: "Profile photos must use app-owned image URLs",
        });
      }

      const requestedGridFsPhotos = requestedPhotos.filter((photo) =>
        getProfileImageIdFromUrl(photo),
      );
      const ownedIds = await getOwnedProfileImageIds(
        req.user._id,
        requestedGridFsPhotos,
      );
      if (ownedIds.length !== requestedGridFsPhotos.length) {
        return res.status(403).json({
          success: false,
          code: "PROFILE_PHOTO_NOT_OWNED",
          message: "A profile photo is not owned by the authenticated user",
        });
      }

      const requestedSet = new Set(requestedPhotos);
      removedProfilePhotos = getAppOwnedPhotoUrls(user).filter(
        (photo) => !requestedSet.has(photo),
      );
      req.body.photos = requestedPhotos;
      req.body.photoURL = requestedPhotos[0] || "";
      req.body.photo = "";
    }

    PROFILE_FIELDS.filter((field) => field !== "questionnaire").forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        user[field] = req.body[field];
      }
    });

    if (Object.prototype.hasOwnProperty.call(req.body, "questionnaire")) {
      Object.assign(user.questionnaire, req.body.questionnaire);
    }

    user.interests = filterCanonicalInterests(user.interests);

    if (req.body.completeRegistration === true) {
      const fields = getCurrentRegistrationValidationErrors(user);
      if (Object.keys(fields).length > 0) {
        return res.status(400).json({
          success: false,
          code: "REGISTRATION_VALIDATION_FAILED",
          message:
            "לא כל השדות הנדרשים הושלמו. יש להשלים את השדות המסומנים.",
          fields,
        });
      }

      markRegistrationCompleteIfEligible(user);
    }

    await user.save();
    if (removedProfilePhotos.length > 0) {
      await deleteOwnedProfileImagesByUrls(req.user._id, removedProfilePhotos);
    }
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

/** Permanently deletes the authenticated account and its owned data. */
const deleteCurrentUser = async (req, res, next) => {
  try {
    await deleteUserAccount(req.user);
    return res.status(200).json({ success: true });
  } catch (error) {
    return next(error);
  }
};

/** Rejects deprecated unauthenticated user mutation endpoints. */
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
