const express = require("express");
const {
  listConversations,
  getConversationWithUser,
  getMessages,
  sendMessage,
  clearConversationForCurrentUser,
} = require("../controllers/conversationController");
const protect = require("../middleware/auth");
const validate = require("../middleware/validate");
const validateParams = require("../middleware/validateParams");
const {
  sendMessageSchema,
  emptyConversationBodySchema,
} = require("../validation/conversationValidation");
const {
  userIdParamSchema,
  conversationIdParamSchema,
} = require("../validation/idValidation");

const router = express.Router();

router.use(protect);
router.get("/", listConversations);
router.get(
  "/with/:userId",
  validateParams(userIdParamSchema),
  getConversationWithUser
);
router.get(
  "/:conversationId/messages",
  validateParams(conversationIdParamSchema),
  getMessages
);
router.post(
  "/:conversationId/messages",
  validateParams(conversationIdParamSchema),
  validate(sendMessageSchema),
  sendMessage
);
router.delete(
  "/:conversationId",
  validateParams(conversationIdParamSchema),
  validate(emptyConversationBodySchema),
  clearConversationForCurrentUser
);

module.exports = router;
