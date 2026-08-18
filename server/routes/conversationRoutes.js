const express = require("express");
const {
  listConversations,
  getConversationWithUser,
  getMessages,
  sendMessage,
} = require("../controllers/conversationController");
const protect = require("../middleware/auth");
const validate = require("../middleware/validate");
const {
  sendMessageSchema,
} = require("../validation/conversationValidation");

const router = express.Router();

router.use(protect);
router.get("/", listConversations);
router.get("/with/:userId", getConversationWithUser);
router.get("/:conversationId/messages", getMessages);
router.post(
  "/:conversationId/messages",
  validate(sendMessageSchema),
  sendMessage
);

module.exports = router;
