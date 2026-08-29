const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Verifies the Bearer JWT, loads its current MongoDB user, and assigns `req.user`.
 * @param {import("express").Request} req Incoming protected request.
 * @param {import("express").Response} res Express response.
 * @param {import("express").NextFunction} next Passes non-authentication errors onward.
 * @returns {Promise<import("express").Response|void>} A 401 response or the next middleware result.
 */
const protect = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is required",
      });
    }

    const token = authorization.slice(7).trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is required",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "The user for this token no longer exists",
      });
    }

    req.user = user;
    return next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired authentication token",
      });
    }

    return next(error);
  }
};

module.exports = protect;
