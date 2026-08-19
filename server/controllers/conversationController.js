const mongoose = require("mongoose");
const Conversation = require("../models/Conversation");
const Match = require("../models/Match");
const getBlockStatus = require("../utils/blockRelationship");

const CONVERSATION_PROFILE_FIELDS =
  "name age preferredDestinations tripDates photo photoURL";

const ensureConversation = (match) =>
  Conversation.findOneAndUpdate(
    { match: match._id },
    { $setOnInsert: { match: match._id, participants: match.users } },
    { new: true, upsert: true, runValidators: true }
  );

const findAuthorizedConversation = async (conversationId, userId) => {
  const conversation = await Conversation.findById(conversationId);

  if (!conversation) {
    return { conversation: null, statusCode: 404 };
  }

  const isParticipant = conversation.participants.some((participantId) =>
    participantId.equals(userId)
  );

  if (!isParticipant) {
    return { conversation: null, statusCode: 403 };
  }

  return { conversation, statusCode: 200 };
};

const getOtherParticipantId = (conversation, currentUserId) =>
  conversation.participants.find(
    (participantId) => String(participantId) !== String(currentUserId)
  );

const listConversations = async (req, res, next) => {
  try {
    const matches = await Match.find({ users: req.user._id });
    await Promise.all(matches.map(ensureConversation));

    const conversations = await Conversation.find({
      participants: req.user._id,
    })
      .sort({ updatedAt: -1 })
      .populate("participants", CONVERSATION_PROFILE_FIELDS);

    const data = conversations.map((conversation) => ({
      _id: conversation._id,
      match: conversation.match,
      participants: conversation.participants,
      lastMessage: conversation.messages.at(-1) || null,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    }));

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    return next(error);
  }
};

const getConversationWithUser = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user identifier",
      });
    }

    const match = await Match.findOne({
      users: { $all: [req.user._id, userId] },
    });

    if (!match) {
      return res.status(404).json({
        success: false,
        message: "A match is required before messaging this user",
      });
    }

    const conversation = await ensureConversation(match);
    return res.status(200).json({ success: true, data: conversation });
  } catch (error) {
    return next(error);
  }
};

const getMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;

    if (!mongoose.isValidObjectId(conversationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid conversation identifier",
      });
    }

    const result = await findAuthorizedConversation(
      conversationId,
      req.user._id
    );

    if (!result.conversation) {
      return res.status(result.statusCode).json({
        success: false,
        message:
          result.statusCode === 403
            ? "You are not allowed to access this conversation"
            : "Conversation not found",
      });
    }

    await result.conversation.populate(
      "participants",
      CONVERSATION_PROFILE_FIELDS
    );
    const otherUser = result.conversation.participants.find(
      (participant) => String(participant._id) !== String(req.user._id)
    );
    const blockStatus = otherUser
      ? await getBlockStatus(req.user._id, otherUser._id)
      : { blocked: false, blockedByMe: false };

    return res.status(200).json({
      success: true,
      data: {
        ...result.conversation.toObject(),
        blockStatus,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const sendMessage = async (req, res, next) => {
  try {
    const { conversationId } = req.params;

    if (!mongoose.isValidObjectId(conversationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid conversation identifier",
      });
    }

    const result = await findAuthorizedConversation(
      conversationId,
      req.user._id
    );

    if (!result.conversation) {
      return res.status(result.statusCode).json({
        success: false,
        message:
          result.statusCode === 403
            ? "You are not allowed to send messages to this conversation"
            : "Conversation not found",
      });
    }

    const otherParticipantId = getOtherParticipantId(
      result.conversation,
      req.user._id
    );
    const blockStatus = otherParticipantId
      ? await getBlockStatus(req.user._id, otherParticipantId)
      : { blocked: false, blockedByMe: false };

    if (blockStatus.blocked) {
      return res.status(403).json({
        success: false,
        message: "Messages are disabled for this blocked relationship",
      });
    }

    result.conversation.messages.push({
      sender: req.user._id,
      text: req.body.text,
    });
    await result.conversation.save();

    return res.status(201).json({
      success: true,
      data: result.conversation.messages.at(-1),
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listConversations,
  getConversationWithUser,
  getMessages,
  sendMessage,
};
