const Match = require("../models/Match");

const MATCH_PROFILE_FIELDS = "name photo photoURL";

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

module.exports = {
  getCurrentUserMatches,
};
