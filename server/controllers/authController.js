const jwt = require("jsonwebtoken");
const User = require("../models/User");

const createToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

const register = async (req, res, next) => {
  try {
    const existingUser = await User.findOne({ email: req.body.email });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "A user with this email already exists",
      });
    }

    const user = await User.create(req.body);
    const token = createToken(user._id);

    return res.status(201).json({
      success: true,
      message: "Registration completed successfully",
      token,
      data: user,
    });
  } catch (error) {
    return next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email }).select(
      "+password"
    );

    if (
      !user ||
      user.authProvider === "google" ||
      !user.password ||
      !(await user.comparePassword(req.body.password))
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = createToken(user._id);

    return res.status(200).json({
      success: true,
      message: "Login completed successfully",
      token,
      data: user,
    });
  } catch (error) {
    return next(error);
  }
};

const getCurrentUser = (req, res) =>
  res.status(200).json({
    success: true,
    data: req.user,
  });

module.exports = {
  register,
  login,
  getCurrentUser,
};
