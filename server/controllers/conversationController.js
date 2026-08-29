const mongoose = require("mongoose");
const Conversation = require("../models/Conversation");
const Match = require("../models/Match");
const getBlockStatus = require("../utils/blockRelationship");
const { getBlockStatusMap } = require("../utils/blockRelationship");
const ensureConversation = require("../utils/ensureConversation");

const CONVERSATION_PROFILE_FIELDS =
  "name age preferredDestinations tripDates photo photoURL";

/**
 * Loads a conversation and verifies that the requesting user participates in it.
 * @returns {Promise<{conversation: import("mongoose").Document|null, statusCode: number}>} Authorization result.
 */
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

/** Returns the participant ID that does not belong to the current user. */
const getOtherParticipantId = (conversation, currentUserId) =>
  conversation.participants.find(
    (participantId) => String(participantId) !== String(currentUserId)
  );

/** Returns the user-local conversation clear timestamp, when present. */
const getClearedAt = (conversation, userId) =>
  conversation.clearedFor.find(
    (entry) => String(entry.user) === String(userId)
  )?.clearedAt;

/** Filters embedded messages according to the user's local clear timestamp. */
const getVisibleMessages = (conversation, userId) => {
  const clearedAt = getClearedAt(conversation, userId);

  if (!clearedAt) return conversation.messages;

  return conversation.messages.filter(
    (message) => message.createdAt > clearedAt
  );
};

/** Indicates whether a cleared conversation has since received a visible message. */
const hasIncomingMessageAfterClear = (conversation, userId) => {
  const clearedAt = getClearedAt(conversation, userId);

  if (!clearedAt) return true;

  return conversation.messages.some(
    (message) =>
      String(message.sender) !== String(userId) && message.createdAt > clearedAt
  );
};

/** Lists conversations visible to the authenticated user. */
const listConversations = async (req, res, next) => {
  try {
    const [matches, blockStatuses] = await Promise.all([
      Match.find({ users: req.user._id }),
      getBlockStatusMap(req.user._id),
    ]);
    await Promise.all(matches.map(ensureConversation));

    const conversations = await Conversation.find({
      participants: req.user._id,
    })
      .sort({ updatedAt: -1 })
      .populate("participants", CONVERSATION_PROFILE_FIELDS);

    const data = conversations
      .flatMap((conversation) => {
        const visibleMessages = getVisibleMessages(conversation, req.user._id);
        const lastMessage = visibleMessages.at(-1) || null;
        const otherUser = conversation.participants.find(
          (participant) => String(participant._id) !== String(req.user._id)
        );
        const blockStatus = blockStatuses.get(String(otherUser?._id)) || {
          blocked: false,
          blockedByMe: false,
        };

        // Clearing is an inbox hide for one participant. Only a later incoming
        // message restores the row; opening Chat or sending must not undo it.
        if (!hasIncomingMessageAfterClear(conversation, req.user._id)) return [];

        return [
          {
            _id: conversation._id,
            match: conversation.match,
            participants: conversation.participants,
            lastMessage,
            blockStatus,
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

/** Gets or establishes the authorized conversation with a matched user. */
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

/** Returns visible messages from an authorized conversation. */
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

/** Hides existing conversation history for the authenticated user only. */
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

/** Persists a message in an authorized, unblocked conversation. */
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
