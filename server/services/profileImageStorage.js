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

function parseProfileImageId(fileId) {
  if (typeof fileId !== "string" || !/^[a-f\d]{24}$/i.test(fileId)) {
    return null;
  }

  return new mongoose.Types.ObjectId(fileId);
}

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

async function findProfileImage(fileId) {
  return getProfileImageBucket().find({ _id: fileId }).next();
}

function openProfileImageDownloadStream(fileId) {
  return getProfileImageBucket().openDownloadStream(fileId);
}

async function deleteProfileImage(fileId) {
  await getProfileImageBucket().delete(fileId);
}

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
  deleteProfileImagesByOwner,
  findProfileImage,
  openProfileImageDownloadStream,
  parseProfileImageId,
  storeProfileImage,
};
