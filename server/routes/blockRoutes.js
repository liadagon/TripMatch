const express = require("express");
const {
  blockMatchedUser,
  unblockMatchedUser,
} = require("../controllers/blockController");
const protect = require("../middleware/auth");
const validate = require("../middleware/validate");
const validateParams = require("../middleware/validateParams");
const { emptyBlockBodySchema } = require("../validation/blockValidation");
const { userIdParamSchema } = require("../validation/idValidation");

const router = express.Router();

router.use(protect);
router.post(
  "/:userId",
  validateParams(userIdParamSchema),
  validate(emptyBlockBodySchema),
  blockMatchedUser
);
router.delete(
  "/:userId",
  validateParams(userIdParamSchema),
  validate(emptyBlockBodySchema),
  unblockMatchedUser
);

module.exports = router;
