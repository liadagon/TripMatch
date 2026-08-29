const Block = require("../models/Block");

/** Returns the bidirectional block relationship between two users. */
const getBlockStatus = async (currentUserId, otherUserId) => {
  const blocks = await Block.find({
    $or: [
      { blocker: currentUserId, blocked: otherUserId },
      { blocker: otherUserId, blocked: currentUserId },
    ],
  }).select("blocker blocked");

  return {
    blocked: blocks.length > 0,
    blockedByMe: blocks.some(
      (block) => String(block.blocker) === String(currentUserId)
    ),
  };
};

/** Returns every user ID blocked by or blocking the current user. */
const getBlockedUserIds = async (currentUserId) => {
  const blocks = await Block.find({
    $or: [{ blocker: currentUserId }, { blocked: currentUserId }],
  })
    .select("blocker blocked")
    .lean();

  return blocks.map((block) =>
    String(block.blocker) === String(currentUserId)
      ? block.blocked
      : block.blocker
  );
};

/** Builds constant-time block lookups for all relationships involving one user. */
const getBlockStatusMap = async (currentUserId) => {
  const blocks = await Block.find({
    $or: [{ blocker: currentUserId }, { blocked: currentUserId }],
  })
    .select("blocker blocked")
    .lean();
  const statuses = new Map();

  blocks.forEach((block) => {
    const blockedByMe = String(block.blocker) === String(currentUserId);
    const otherUserId = blockedByMe ? block.blocked : block.blocker;
    const key = String(otherUserId);
    const current = statuses.get(key) || {
      blocked: false,
      blockedByMe: false,
    };

    statuses.set(key, {
      blocked: true,
      blockedByMe: current.blockedByMe || blockedByMe,
    });
  });

  return statuses;
};

module.exports = getBlockStatus;
module.exports.getBlockedUserIds = getBlockedUserIds;
module.exports.getBlockStatusMap = getBlockStatusMap;
