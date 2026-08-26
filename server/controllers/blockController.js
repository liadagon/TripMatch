const Block = require("../models/Block");
const Match = require("../models/Match");
const getBlockStatus = require("../utils/blockRelationship");
const { sanitizeUserPhotoFields } = require("../utils/profilePhotos");

const BLOCKED_USER_FIELDS = "name photo photoURL";

const findMatch = (currentUserId, otherUserId) =>
  Match.exists({ users: { $all: [currentUserId, otherUserId] } });

/** Lists profiles blocked by the authenticated user. */
const getBlockedUsers = async (req, res, next) => {
  try {
    const blocks = await Block.find({ blocker: req.user._id })
      .sort({ createdAt: -1 })
      .populate("blocked", BLOCKED_USER_FIELDS);
    const data = blocks
      .filter((block) => block.blocked)
      .map((block) => {
        const record = block.toObject();
        record.blocked = sanitizeUserPhotoFields(record.blocked);
        delete record.blocked.photos;
        return record;
      });

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    return next(error);
  }
};

/** Blocks interaction with a matched user without changing Match or Conversation. */
const blockMatchedUser = async (req, res, next) => {
  try {
    const blocker = req.user._id;
    const blocked = req.params.userId;

    if (blocker.equals(blocked)) {
      return res.status(400).json({
        success: false,
        message: "You cannot block your own account",
      });
    }

    if (!(await findMatch(blocker, blocked))) {
      return res.status(403).json({
        success: false,
        message: "Only matched users can be blocked from Chat",
      });
    }

    const block = await Block.findOneAndUpdate(
      { blocker, blocked },
      { $setOnInsert: { blocker, blocked } },
      { new: true, upsert: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: "User blocked successfully",
      data: block,
      blockStatus: { blocked: true, blockedByMe: true },
    });
  } catch (error) {
    return next(error);
  }
};

/** Removes the authenticated user's block for a previously matched user. */
const unblockMatchedUser = async (req, res, next) => {
  try {
    const blocker = req.user._id;
    const blocked = req.params.userId;

    if (blocker.equals(blocked)) {
      return res.status(400).json({
        success: false,
        message: "You cannot unblock your own account",
      });
    }

    if (!(await findMatch(blocker, blocked))) {
      return res.status(403).json({
        success: false,
        message: "Only matched users can be unblocked from Chat",
      });
    }

    const result = await Block.deleteOne({ blocker, blocked });
    const blockStatus = await getBlockStatus(blocker, blocked);

    return res.status(200).json({
      success: true,
      message:
        result.deletedCount > 0
          ? "User unblocked successfully"
          : "User was not blocked by the current user",
      removed: result.deletedCount > 0,
      blockStatus,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getBlockedUsers,
  blockMatchedUser,
  unblockMatchedUser,
};
