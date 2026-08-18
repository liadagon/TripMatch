const Match = require("../models/Match");
const PUBLIC_PROFILE_FIELDS = require("../utils/publicProfile");

const getCurrentUserMatches = async (req, res, next) => {
  try {
    const matches = await Match.find({ users: req.user._id })
      .sort({ createdAt: -1 })
      .populate("users", PUBLIC_PROFILE_FIELDS);

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
