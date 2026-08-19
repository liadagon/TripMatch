const Block = require("../models/Block");
const Match = require("../models/Match");

const findMatch = (currentUserId, otherUserId) =>
  Match.exists({ users: { $all: [currentUserId, otherUserId] } });

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
    });
  } catch (error) {
    return next(error);
  }
};

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

    return res.status(200).json({
      success: true,
      message:
        result.deletedCount > 0
          ? "User unblocked successfully"
          : "User was not blocked by the current user",
      removed: result.deletedCount > 0,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  blockMatchedUser,
  unblockMatchedUser,
};
