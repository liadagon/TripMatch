const mongoose = require("mongoose");
const Conversation = require("../models/Conversation");
const Match = require("../models/Match");

const PUBLIC_CONVERSATION_USER_FIELDS = [
  "name",
  "age",
  "location",
  "preferredDestinations",
  "tripDates",
  "photo",
  "photoURL",
].join(" ");

const ensureConversation = (match) =>
  Conversation.findOneAndUpdate(
    { match: match._id },
    { $setOnInsert: { match: match._id, participants: match.users } },
    { new: true, upsert: true, runValidators: true }
  );

const listConversations = async (req, res, next) => {
  try {
    const matches = await Match.find({ users: req.user._id });
    await Promise.all(matches.map(ensureConversation));

    const conversations = await Conversation.find({
      participants: req.user._id,
    })
      .sort({ updatedAt: -1 })
      .populate("participants", PUBLIC_CONVERSATION_USER_FIELDS);

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

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user._id,
    }).populate("participants", PUBLIC_CONVERSATION_USER_FIELDS);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: conversation,
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

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user._id,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    conversation.messages.push({
      sender: req.user._id,
      text: req.body.text,
    });
    await conversation.save();

    return res.status(201).json({
      success: true,
      data: conversation.messages.at(-1),
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
