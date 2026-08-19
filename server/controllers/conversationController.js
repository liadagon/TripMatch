const mongoose = require("mongoose");
const Conversation = require("../models/Conversation");
const Match = require("../models/Match");
const getBlockStatus = require("../utils/blockRelationship");
const { getBlockedUserIds } = require("../utils/blockRelationship");

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

const getClearedAt = (conversation, userId) =>
  conversation.clearedFor.find(
    (entry) => String(entry.user) === String(userId)
  )?.clearedAt;

const getVisibleMessages = (conversation, userId) => {
  const clearedAt = getClearedAt(conversation, userId);

  if (!clearedAt) return conversation.messages;

  return conversation.messages.filter(
    (message) => message.createdAt > clearedAt
  );
};

const hasIncomingMessageAfterClear = (conversation, userId) => {
  const clearedAt = getClearedAt(conversation, userId);

  if (!clearedAt) return true;

  return conversation.messages.some(
    (message) =>
      String(message.sender) !== String(userId) && message.createdAt > clearedAt
  );
};

const listConversations = async (req, res, next) => {
  try {
    const blockedUserIds = await getBlockedUserIds(req.user._id);
    const matches = await Match.find({
      $and: [
        { users: req.user._id },
        ...(blockedUserIds.length ? [{ users: { $nin: blockedUserIds } }] : []),
      ],
    });
    await Promise.all(matches.map(ensureConversation));

    const conversations = await Conversation.find({
      $and: [
        { participants: req.user._id },
        ...(blockedUserIds.length
          ? [{ participants: { $nin: blockedUserIds } }]
          : []),
      ],
    })
      .sort({ updatedAt: -1 })
      .populate("participants", CONVERSATION_PROFILE_FIELDS);

    const data = conversations
      .flatMap((conversation) => {
        const visibleMessages = getVisibleMessages(conversation, req.user._id);
        const lastMessage = visibleMessages.at(-1) || null;

        // Clearing is an inbox hide for one participant. Only a later incoming
        // message restores the row; opening Chat or sending must not undo it.
        if (!hasIncomingMessageAfterClear(conversation, req.user._id)) return [];

        return [
          {
            _id: conversation._id,
            match: conversation.match,
            participants: conversation.participants,
            lastMessage,
            createdAt: conversation.createdAt,
            updatedAt: lastMessage?.createdAt || conversation.createdAt,
          },
        ];
      })
      .sort((first, second) => second.updatedAt - first.updatedAt);

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

    const blockStatus = await getBlockStatus(req.user._id, userId);

    if (blockStatus.blocked) {
      return res.status(403).json({
        success: false,
        message: "This matched conversation is unavailable",
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
    const visibleMessages = getVisibleMessages(
      result.conversation,
      req.user._id
    );
    const conversationData = result.conversation.toObject();
    delete conversationData.clearedFor;

    return res.status(200).json({
      success: true,
      data: {
        ...conversationData,
        messages: visibleMessages,
        blockStatus,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const clearConversationForCurrentUser = async (req, res, next) => {
  try {
    const result = await findAuthorizedConversation(
      req.params.conversationId,
      req.user._id
    );

    if (!result.conversation) {
      return res.status(result.statusCode).json({
        success: false,
        message:
          result.statusCode === 403
            ? "You are not allowed to clear this conversation"
            : "Conversation not found",
      });
    }

    const clearedAt = new Date();
    const existingEntry = result.conversation.clearedFor.find(
      (entry) => String(entry.user) === String(req.user._id)
    );

    if (existingEntry) {
      existingEntry.clearedAt = clearedAt;
    } else {
      result.conversation.clearedFor.push({
        user: req.user._id,
        clearedAt,
      });
    }

    await result.conversation.save();

    return res.status(200).json({
      success: true,
      message: "Conversation cleared for the current user",
      clearedAt,
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
  clearConversationForCurrentUser,
};
