const Block = require("../models/Block");

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

module.exports = getBlockStatus;
module.exports.getBlockedUserIds = getBlockedUserIds;
