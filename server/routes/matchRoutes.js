const express = require("express");
const { getCurrentUserMatches } = require("../controllers/matchController");
const protect = require("../middleware/auth");

const router = express.Router();

router.use(protect);
router.get("/", getCurrentUserMatches);

module.exports = router;
