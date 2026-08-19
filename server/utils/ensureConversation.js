const Conversation = require("../models/Conversation");

const ensureConversation = (match) =>
  Conversation.findOneAndUpdate(
    { match: match._id },
    { $setOnInsert: { match: match._id, participants: match.users } },
    { new: true, upsert: true, runValidators: true }
  );

module.exports = ensureConversation;
