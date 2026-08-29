const crypto = require("crypto");
const EmailOtp = require("../models/EmailOtp");
const { sendTransactionalEmail } = require("./emailService");

const OTP_LENGTH = 6;
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

class EmailOtpError extends Error {
  constructor(message, { code, statusCode, retryAfterSeconds } = {}) {
    super(message);
    this.name = "EmailOtpError";
    this.code = code;
    this.statusCode = statusCode;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function getOtpHashSecret() {
  const secret = process.env.JWT_SECRET?.trim();

  if (!secret) {
    throw new Error("Email OTP hashing is not configured");
  }

  return secret;
}

function generateOtp() {
  return crypto.randomInt(0, 1_000_000).toString().padStart(OTP_LENGTH, "0");
}

function hashOtp(email, code) {
  return crypto
    .createHmac("sha256", getOtpHashSecret())
    .update(`${email}:${code}`)
    .digest("hex");
}

function invalidOtpError() {
  return new EmailOtpError("Invalid or expired verification code", {
    code: "OTP_INVALID_OR_EXPIRED",
    statusCode: 400,
  });
}

function tooManyAttemptsError() {
  return new EmailOtpError("Too many verification attempts", {
    code: "OTP_TOO_MANY_ATTEMPTS",
    statusCode: 429,
  });
}

function cooldownError(lastSentAt = new Date()) {
  const elapsedMs = Date.now() - new Date(lastSentAt).getTime();
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((OTP_RESEND_COOLDOWN_MS - elapsedMs) / 1000),
  );

  return new EmailOtpError("Please wait before requesting another code", {
    code: "OTP_RESEND_COOLDOWN",
    statusCode: 429,
    retryAfterSeconds,
  });
}

function buildOtpEmail(code) {
  return {
    subject: "קוד האימות שלך ל-TripMatch",
    textContent: [
      `קוד האימות שלך הוא: ${code}`,
      "הקוד תקף ל-10 דקות.",
      "אם לא ביקשת את הקוד, אפשר להתעלם מהודעה זו.",
    ].join("\n\n"),
    htmlContent: `
      <div dir="rtl" style="font-family:Arial,sans-serif;background:#f1f5ff;padding:32px;color:#172554">
        <div style="max-width:520px;margin:auto;background:#ffffff;border-radius:24px;padding:32px;text-align:center;box-shadow:0 18px 50px rgba(37,99,235,.12)">
          <div dir="ltr" style="font-size:28px;font-weight:900;color:#2563eb">Trip<span style="color:#14b8a6">Match</span></div>
          <h1 style="font-size:24px;margin:24px 0 12px">קוד האימות שלך</h1>
          <p style="color:#475569;line-height:1.7">הזינו את הקוד הבא כדי להמשיך ל-TripMatch:</p>
          <div dir="ltr" style="margin:24px 0;padding:18px;border-radius:18px;background:linear-gradient(135deg,#2563eb,#7c3aed);color:#fff;font-size:38px;font-weight:900;letter-spacing:8px">${code}</div>
          <p style="color:#64748b;line-height:1.7">הקוד תקף ל-10 דקות והוא ניתן לשימוש פעם אחת בלבד.</p>
          <p style="color:#94a3b8;font-size:13px;line-height:1.6">אם לא ביקשתם את הקוד, אפשר להתעלם מהודעה זו.</p>
        </div>
      </div>
    `,
  };
}

/**
 * Replaces any eligible OTP, stores only its hash, and sends the new code by email.
 * @param {string} email Normalized recipient address used as the OTP identity.
 * @returns {Promise<{expiresInSeconds: number, cooldownSeconds: number, recordId: import("mongoose").Types.ObjectId}>} Public timing metadata and the stored record ID.
 * @throws {EmailOtpError} When the address is still inside the resend cooldown.
 */
async function requestEmailOtp(email) {
  const code = generateOtp();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + OTP_TTL_MS);
  const requestId = crypto.randomUUID();
  const codeHash = hashOtp(email, code);
  const cooldownCutoff = new Date(now.getTime() - OTP_RESEND_COOLDOWN_MS);
  let record;

  try {
    record = await EmailOtp.findOneAndUpdate(
      {
        email,
        $or: [
          { lastSentAt: { $lte: cooldownCutoff } },
          { lastSentAt: { $exists: false } },
        ],
      },
      {
        $set: {
          codeHash,
          requestId,
          expiresAt,
          attemptCount: 0,
          lastSentAt: now,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
  } catch (error) {
    if (error?.code === 11000) {
      const existingRecord = await EmailOtp.findOne({ email });
      throw cooldownError(existingRecord?.lastSentAt);
    }

    throw error;
  }

  try {
    await sendTransactionalEmail({
      to: email,
      ...buildOtpEmail(code),
    });
  } catch (error) {
    await EmailOtp.deleteOne({ email, requestId });
    throw error;
  }

  return {
    expiresInSeconds: OTP_TTL_MS / 1000,
    cooldownSeconds: OTP_RESEND_COOLDOWN_MS / 1000,
    recordId: record._id,
  };
}

/**
 * Compares an OTP in constant time and atomically removes the matching record.
 * @param {string} email Normalized address used when the code was requested.
 * @param {string} code Six-digit plaintext code supplied by the user.
 * @returns {Promise<void>} Resolves only after the code has been consumed.
 * @throws {EmailOtpError} When the code is missing, expired, reused, or exceeds the attempt limit.
 */
async function consumeEmailOtp(email, code) {
  const record = await EmailOtp.findOne({ email }).select("+codeHash");
  const now = new Date();

  if (!record) {
    throw invalidOtpError();
  }

  if (record.expiresAt <= now) {
    await EmailOtp.deleteOne({ _id: record._id });
    throw invalidOtpError();
  }

  if (record.attemptCount >= OTP_MAX_ATTEMPTS) {
    throw tooManyAttemptsError();
  }

  const submittedHash = hashOtp(email, code);
  const storedHashBuffer = Buffer.from(record.codeHash, "hex");
  const submittedHashBuffer = Buffer.from(submittedHash, "hex");
  const isMatch = crypto.timingSafeEqual(
    storedHashBuffer,
    submittedHashBuffer,
  );

  if (!isMatch) {
    const updatedRecord = await EmailOtp.findOneAndUpdate(
      { _id: record._id, attemptCount: { $lt: OTP_MAX_ATTEMPTS } },
      { $inc: { attemptCount: 1 } },
      { new: true },
    );

    if (updatedRecord?.attemptCount >= OTP_MAX_ATTEMPTS) {
      throw tooManyAttemptsError();
    }

    throw invalidOtpError();
  }

  const consumedRecord = await EmailOtp.findOneAndDelete({
    _id: record._id,
    codeHash: record.codeHash,
    expiresAt: { $gt: now },
    attemptCount: { $lt: OTP_MAX_ATTEMPTS },
  });

  if (!consumedRecord) {
    throw invalidOtpError();
  }
}

module.exports = {
  EmailOtpError,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_TTL_MS,
  consumeEmailOtp,
  requestEmailOtp,
};
