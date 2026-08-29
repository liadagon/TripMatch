const crypto = require("crypto");
const mongoose = require("mongoose");

const PROFILE_IMAGE_BUCKET_NAME = "profileImages";
const PROFILE_IMAGE_PURPOSE = "profile-image";

const extensionByMimeType = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

/** Returns the configured GridFS bucket for profile images. */
function getProfileImageBucket() {
  if (!mongoose.connection.db) {
    const error = new Error("MongoDB file storage is unavailable");
    error.statusCode = 503;
    throw error;
  }

  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: PROFILE_IMAGE_BUCKET_NAME,
  });
}

/** Parses and validates a GridFS profile-image identifier. */
function parseProfileImageId(fileId) {
  if (typeof fileId !== "string" || !/^[a-f\d]{24}$/i.test(fileId)) {
    return null;
  }

  return new mongoose.Types.ObjectId(fileId);
}

/** Extracts a valid app-owned profile-image ID from a stored URL. */
function getProfileImageIdFromUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const pathname = new URL(value.trim(), "https://tripmatch.invalid").pathname;
    const match = pathname.match(/^\/api\/file\/([a-f\d]{24})$/i);
    return match ? parseProfileImageId(match[1]) : null;
  } catch {
    return null;
  }
}

/**
 * Streams a validated image buffer into GridFS with ownership metadata.
 * @param {{buffer: Buffer, contentType: string, ownerId: unknown}} input Upload content and authenticated owner.
 * @returns {Promise<{fileId: import("mongoose").Types.ObjectId, filename: string}>} Stored file identity.
 * @throws {TypeError} When content is empty or its MIME type is unsupported.
 */
async function storeProfileImage({ buffer, contentType, ownerId }) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new TypeError("Uploaded image content is required");
  }

  const extension = extensionByMimeType[contentType];

  if (!extension) {
    throw new TypeError("Unsupported profile image content type");
  }

  const normalizedOwnerId = new mongoose.Types.ObjectId(String(ownerId));
  const safeFilename = `${crypto.randomUUID()}${extension}`;
  const uploadStream = getProfileImageBucket().openUploadStream(safeFilename, {
    contentType,
    metadata: {
      contentType,
      ownerId: normalizedOwnerId,
      purpose: PROFILE_IMAGE_PURPOSE,
    },
  });

  await new Promise((resolve, reject) => {
    uploadStream.once("finish", resolve);
    uploadStream.once("error", reject);
    uploadStream.end(buffer);
  });

  return {
    fileId: uploadStream.id,
    filename: safeFilename,
  };
}

/** Finds profile-image metadata by validated GridFS identifier. */
async function findProfileImage(fileId) {
  return getProfileImageBucket().find({ _id: fileId }).next();
}

/** Opens a GridFS download stream for a validated profile-image identifier. */
function openProfileImageDownloadStream(fileId) {
  return getProfileImageBucket().openDownloadStream(fileId);
}

/** Deletes one GridFS profile image by identifier. */
async function deleteProfileImage(fileId) {
  await getProfileImageBucket().delete(fileId);
}

/**
 * Filters parsed photo URLs through GridFS ownership and purpose metadata.
 * @param {unknown} ownerId Authenticated owner identifier.
 * @param {string[]} photoUrls Candidate app-owned image URLs.
 * @returns {Promise<import("mongoose").Types.ObjectId[]>} IDs verified as owned profile images.
 */
async function getOwnedProfileImageIds(ownerId, photoUrls) {
  const requestedIds = photoUrls
    .map(getProfileImageIdFromUrl)
    .filter(Boolean);
  if (requestedIds.length === 0) return [];

  const normalizedOwnerId = new mongoose.Types.ObjectId(String(ownerId));
  const files = await getProfileImageBucket()
    .find({
      _id: { $in: requestedIds },
      "metadata.ownerId": normalizedOwnerId,
      "metadata.purpose": PROFILE_IMAGE_PURPOSE,
    })
    .toArray();
  return files.map(({ _id }) => _id);
}

/** Deletes the user's app-owned profile images referenced by URL. */
async function deleteOwnedProfileImagesByUrls(ownerId, photoUrls) {
  const ownedIds = await getOwnedProfileImageIds(ownerId, photoUrls);
  await Promise.all(ownedIds.map((fileId) => deleteProfileImage(fileId)));
  return ownedIds.length;
}

/**
 * Deletes both GridFS file metadata and chunks for every image owned by a user.
 * @param {unknown} ownerId Owner whose complete image set is removed.
 * @param {{session?: import("mongoose").ClientSession}} [options] Optional transaction session.
 * @returns {Promise<number>} Number of GridFS file records deleted.
 * @throws {Error} When MongoDB file storage is unavailable.
 */
async function deleteProfileImagesByOwner(ownerId, { session } = {}) {
  if (!mongoose.connection.db) {
    const error = new Error("MongoDB file storage is unavailable");
    error.statusCode = 503;
    throw error;
  }

  const normalizedOwnerId = new mongoose.Types.ObjectId(String(ownerId));
  const filesCollection = mongoose.connection.db.collection(
    `${PROFILE_IMAGE_BUCKET_NAME}.files`,
  );
  const chunksCollection = mongoose.connection.db.collection(
    `${PROFILE_IMAGE_BUCKET_NAME}.chunks`,
  );
  const ownedFiles = await filesCollection
    .find(
      { "metadata.ownerId": normalizedOwnerId },
      { projection: { _id: 1 }, session },
    )
    .toArray();
  const ownedFileIds = ownedFiles.map(({ _id }) => _id);

  if (ownedFileIds.length === 0) return 0;

  await chunksCollection.deleteMany(
    { files_id: { $in: ownedFileIds } },
    { session },
  );
  const result = await filesCollection.deleteMany(
    {
      _id: { $in: ownedFileIds },
      "metadata.ownerId": normalizedOwnerId,
    },
    { session },
  );

  return result.deletedCount;
}

module.exports = {
  PROFILE_IMAGE_BUCKET_NAME,
  PROFILE_IMAGE_PURPOSE,
  deleteProfileImage,
  deleteOwnedProfileImagesByUrls,
  deleteProfileImagesByOwner,
  findProfileImage,
  openProfileImageDownloadStream,
  parseProfileImageId,
  getProfileImageIdFromUrl,
  getOwnedProfileImageIds,
  storeProfileImage,
};
