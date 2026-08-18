const User = require("../models/User");
const Swipe = require("../models/Swipe");

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

    const swipe = await Swipe.findOneAndUpdate(
      { fromUser, toUser },
      { action },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      success: true,
      data: swipe,
    });
  } catch (error) {
    return next(error);
  }
};

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

module.exports = {
  createSwipe,
  getCurrentUserSwipes,
};
