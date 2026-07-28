const express = require("express");
const {
  register,
  login,
  getCurrentUser,
} = require("../controllers/authController");
const protect = require("../middleware/auth");
const validate = require("../middleware/validate");
const {
  registerSchema,
  loginSchema,
} = require("../validation/authValidation");

const router = express.Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.get("/me", protect, getCurrentUser);

module.exports = router;
