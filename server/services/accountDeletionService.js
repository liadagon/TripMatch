const mongoose = require("mongoose");
const Block = require("../models/Block");
const Conversation = require("../models/Conversation");
const EmailOtp = require("../models/EmailOtp");
const Match = require("../models/Match");
const ProcessedPayPalWebhookEvent = require("../models/ProcessedPayPalWebhookEvent");
const Swipe = require("../models/Swipe");
const User = require("../models/User");
const { deleteProfileImagesByOwner } = require("./profileImageStorage");
const { cancelForAccountDeletion } = require("./subscriptionService");

class AccountDeletionError extends Error {
  constructor(code, message, statusCode) {
    super(message);
    this.name = "AccountDeletionError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

let transactionSupportPromise;

/** Determines whether the connected MongoDB deployment supports transactions. */
function supportsMongoTransactions() {
  if (!transactionSupportPromise) {
    transactionSupportPromise = mongoose.connection.db
      .admin()
      .command({ hello: 1 })
      .then((hello) => Boolean(hello.setName || hello.msg === "isdbgrid"));
  }
  return transactionSupportPromise;
}

/**
 * Creates an account-deletion service with injectable persistence dependencies.
 * @param {object} dependencies Optional test or runtime dependency overrides.
 * @returns {{deleteUserAccount: Function}} Account deletion operations.
 */
function createAccountDeletionService(dependencies = {}) {
  const deps = {
    mongooseInstance: mongoose,
    UserModel: User,
    SwipeModel: Swipe,
    MatchModel: Match,
    ConversationModel: Conversation,
    BlockModel: Block,
    EmailOtpModel: EmailOtp,
    WebhookEventModel: ProcessedPayPalWebhookEvent,
    deleteOwnedProfileImages: deleteProfileImagesByOwner,
    cancelStoredSubscription: cancelForAccountDeletion,
    supportsTransactions: supportsMongoTransactions,
    ...dependencies,
  };

  /**
   * Cancels external subscription state before removing all account-owned records and images.
   * @param {object} authenticatedUser Authenticated user whose `_id` defines the deletion scope.
   * @returns {Promise<{success: true}>} Confirmation after every required deletion completes.
   * @throws {AccountDeletionError} When identity is missing or the user cannot be deleted consistently.
   */
  async function deleteUserAccount(authenticatedUser) {
    const authenticatedUserId = authenticatedUser?._id;
    if (!authenticatedUserId) {
      throw new AccountDeletionError(
        "AUTHENTICATED_USER_REQUIRED",
        "Authentication is required",
        401,
      );
    }

    const storedUser = await deps.UserModel.findById(authenticatedUserId);
    if (!storedUser) {
      throw new AccountDeletionError(
        "USER_NOT_FOUND",
        "User not found",
        404,
      );
    }

    await deps.cancelStoredSubscription(storedUser);

    const cleanup = async (session) => {
      const options = session ? { session } : {};
      const userId = storedUser._id;
      const normalizedEmail = storedUser.email?.trim().toLowerCase();
      const matchQuery = deps.MatchModel.distinct("_id", { users: userId });
      const matchIds = session
        ? await matchQuery.session(session)
        : await matchQuery;

      await deps.ConversationModel.deleteMany(
        {
          $or: [
            { participants: userId },
            { match: { $in: matchIds } },
            { "messages.sender": userId },
            { "clearedFor.user": userId },
          ],
        },
        options,
      );
      await deps.SwipeModel.deleteMany(
        { $or: [{ fromUser: userId }, { toUser: userId }] },
        options,
      );
      await deps.MatchModel.deleteMany({ users: userId }, options);
      await deps.BlockModel.deleteMany(
        { $or: [{ blocker: userId }, { blocked: userId }] },
        options,
      );

      if (storedUser.paypalSubscriptionId) {
        await deps.WebhookEventModel.deleteMany(
          { paypalSubscriptionId: storedUser.paypalSubscriptionId },
          options,
        );
      }
      if (normalizedEmail) {
        await deps.EmailOtpModel.deleteMany(
          { email: normalizedEmail },
          options,
        );
      }

      await deps.deleteOwnedProfileImages(userId, options);
      const deletion = await deps.UserModel.deleteOne(
        { _id: userId },
        options,
      );
      if (deletion.deletedCount !== 1) {
        throw new AccountDeletionError(
          "USER_DELETE_CONFLICT",
          "Account deletion could not be completed",
          409,
        );
      }
    };

    if (await deps.supportsTransactions()) {
      const session = await deps.mongooseInstance.startSession();
      try {
        await session.withTransaction(() => cleanup(session));
      } finally {
        await session.endSession();
      }
    } else {
      await cleanup(null);
    }

    return { success: true };
  }

  return { deleteUserAccount };
}

const defaultService = createAccountDeletionService();

module.exports = {
  AccountDeletionError,
  createAccountDeletionService,
  supportsMongoTransactions,
  ...defaultService,
};
