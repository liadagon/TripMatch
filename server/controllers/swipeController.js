const User = require("../models/User");
const Swipe = require("../models/Swipe");
const Match = require("../models/Match");
const Conversation = require("../models/Conversation");
const PUBLIC_PROFILE_FIELDS = require("../utils/publicProfile");
const getBlockStatus = require("../utils/blockRelationship");
const { getBlockedUserIds } = require("../utils/blockRelationship");
const { hasBoostAccess } = require("../utils/subscriptionEntitlement");

/** Records an authenticated swipe and creates a match when likes are mutual. */
const createSwipe = async (req, res, next) => {
  try {
    const fromUser = req.user._id;
    const { toUser, action } = req.body;

    if (fromUser.equals(toUser)) {
      return res.status(400).json({
        success: false,
        message: "You cannot swipe on your own profile",
      });
    }

    const targetUserExists = await User.exists({ _id: toUser });

    if (!targetUserExists) {
      return res.status(404).json({
        success: false,
        message: "Target user not found",
      });
    }

    const blockStatus = await getBlockStatus(fromUser, toUser);

    if (blockStatus.blocked) {
      return res.status(403).json({
        success: false,
        message: "This user interaction is unavailable",
      });
    }

    const swipe = await Swipe.findOneAndUpdate(
      { fromUser, toUser },
      { action },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    let match = null;

    if (action === "like") {
      const reciprocalLike = await Swipe.exists({
        fromUser: toUser,
        toUser: fromUser,
        action: "like",
      });

      if (reciprocalLike) {
        const userIds = [String(fromUser), String(toUser)].sort();
        const pairKey = userIds.join(":");
        match = await Match.findOneAndUpdate(
          { pairKey },
          { $setOnInsert: { users: userIds, pairKey } },
          { new: true, upsert: true, runValidators: true }
        );
        await Conversation.findOneAndUpdate(
          { match: match._id },
          { $setOnInsert: { match: match._id, participants: match.users } },
          { new: true, upsert: true, runValidators: true }
        );
      }
    }

    const matchResponse = match
      ? {
          _id: match._id,
          users: match.users,
          createdAt: match.createdAt,
          updatedAt: match.updatedAt,
        }
      : null;

    return res.status(200).json({
      success: true,
      message: "Swipe saved successfully",
      data: swipe,
      isMatch: Boolean(matchResponse),
      match: matchResponse,
    });
  } catch (error) {
    return next(error);
  }
};

/** Lists swipe decisions made by the authenticated user. */
const getCurrentUserSwipes = async (req, res, next) => {
  try {
    const swipes = await Swipe.find({ fromUser: req.user._id }).sort({
      updatedAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: swipes.length,
      data: swipes,
    });
  } catch (error) {
    return next(error);
  }
};

/** Returns received-like visibility and records for the authenticated user. */
const getReceivedLikes = async (req, res, next) => {
  try {
    const blockedUserIds = await getBlockedUserIds(req.user._id);
    const filter = {
      toUser: req.user._id,
      action: "like",
      ...(blockedUserIds.length ? { fromUser: { $nin: blockedUserIds } } : {}),
    };

    if (!hasBoostAccess(req.user)) {
      const likerIds = await Swipe.distinct("fromUser", filter);
      const count = await User.countDocuments({ _id: { $in: likerIds } });
      return res.status(200).json({
        success: true,
        locked: true,
        count,
      });
    }

    const likes = await Swipe.find(filter)
      .sort({ updatedAt: -1 })
      .populate("fromUser", PUBLIC_PROFILE_FIELDS);

    const data = likes
      .filter((like) => like.fromUser)
      .map((like) => ({
        _id: like._id,
        fromUser: like.fromUser,
        createdAt: like.createdAt,
        updatedAt: like.updatedAt,
      }));

    return res.status(200).json({
      success: true,
      locked: false,
      count: data.length,
      data,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createSwipe,
  getCurrentUserSwipes,
  getReceivedLikes,
};
