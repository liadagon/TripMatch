const User = require("../models/User");

const PROFILE_FIELDS = [
  "name",
  "bio",
  "age",
  "location",
  "interests",
  "preferredDestinations",
  "travelStyle",
  "photo",
  "photoURL",
];

const getUsers = async (req, res, next) => {
  try {
    const filter = {};

    if (req.query.location) {
      filter.location = req.query.location;
    }

    if (req.query.travelStyle) {
      filter.travelStyle = req.query.travelStyle;
    }

    const users = await User.find(filter);

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

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

    await user.save();

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: user,
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
  res.status(401).json({
    success: false,
    message: "You are not authorized to perform this action",
  });

module.exports = {
  getUsers,
  getUserById,
  updateCurrentUser,
  deleteCurrentUser,
  rejectLegacyMutation,
};
