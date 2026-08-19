const Match = require("../models/Match");
const Conversation = require("../models/Conversation");
const User = require("../models/User");
const getBlockStatus = require("../utils/blockRelationship");
const calculateProfileCompatibility = require("../utils/profileCompatibility");

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

const getCurrentUserMatches = async (req, res, next) => {
  try {
    const matches = await Match.find({ users: req.user._id })
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
      Conversation.findOne({ match: match._id }).select("_id"),
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
        conversationId: conversation?._id || null,
      },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getCurrentUserMatches,
  getMatchedUserProfile,
};
