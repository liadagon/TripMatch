const Conversation = require("../models/Conversation");

/** Upserts the single conversation associated with a match. */
const ensureConversation = (match) =>
  Conversation.findOneAndUpdate(
    { match: match._id },
    { $setOnInsert: { match: match._id, participants: match.users } },
    { new: true, upsert: true, runValidators: true }
  );

module.exports = ensureConversation;
