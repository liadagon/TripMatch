const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const app = require("../app");
const User = require("../models/User");
const {
  PROFILE_IMAGE_BUCKET_NAME,
  PROFILE_IMAGE_PURPOSE,
  deleteProfileImage,
  findProfileImage,
  parseProfileImageId,
} = require("../services/profileImageStorage");

const publicDirectory = path.resolve(__dirname, "..", "public");
const pngBytes = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z1xkAAAAASUVORK5CYII=",
  "base64",
);

async function listen() {
  return new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
  });
}

async function close(server) {
  if (!server) return;

  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function uploadFile(baseUrl, token, bytes, contentType, filename) {
  const body = new FormData();
  body.append("file", new Blob([bytes], { type: contentType }), filename);

  return fetch(`${baseUrl}/api/file`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body,
  });
}

async function updatePhotos(baseUrl, token, photos) {
  return fetch(`${baseUrl}/api/users/me`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ photos }),
  });
}

async function run() {
  assert(process.env.DATABASE_URL, "DATABASE_URL is not configured");
  assert(process.env.JWT_SECRET, "JWT_SECRET is not configured");

  const verificationId = crypto.randomUUID();
  const verificationEmail = `gridfs-${verificationId}@example.com`;
  const legacyFilename = `gridfs-legacy-${verificationId}.png`;
  const legacyPath = path.join(publicDirectory, legacyFilename);
  const storedFileIds = [];
  let temporaryUser;
  let otherTemporaryUser;
  let server;

  try {
    await mongoose.connect(process.env.DATABASE_URL);
    temporaryUser = await User.create({
      name: "GridFS Verification User",
      email: verificationEmail,
      authProvider: "email",
      emailVerified: true,
      registrationCompletedAt: new Date(),
    });
    const token = jwt.sign(
      { userId: temporaryUser._id },
      process.env.JWT_SECRET,
      { expiresIn: "10m" },
    );
    otherTemporaryUser = await User.create({
      name: "GridFS Ownership Verification User",
      email: `gridfs-owner-${verificationId}@example.com`,
      authProvider: "email",
      emailVerified: true,
    });
    const otherToken = jwt.sign(
      { userId: otherTemporaryUser._id },
      process.env.JWT_SECRET,
      { expiresIn: "10m" },
    );
    const publicFilesBeforeUpload = (await fs.readdir(publicDirectory)).sort();

    server = await listen();
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const unauthenticatedResponse = await uploadFile(
      baseUrl,
      "",
      pngBytes,
      "image/png",
      "unauthenticated.png",
    );
    assert.equal(unauthenticatedResponse.status, 401);

    const uploadResponse = await uploadFile(
      baseUrl,
      token,
      pngBytes,
      "image/png",
      "untrusted-original-name.exe",
    );
    assert.equal(uploadResponse.status, 201);
    const uploadBody = await uploadResponse.json();
    const uploadedUrl = new URL(uploadBody.url);
    assert.equal(uploadedUrl.pathname.startsWith("/api/file/"), true);

    const fileId = parseProfileImageId(uploadedUrl.pathname.split("/").at(-1));
    assert(fileId);
    storedFileIds.push(fileId);

    const storedFile = await findProfileImage(fileId);
    assert(storedFile);
    assert.equal(storedFile.length, pngBytes.length);
    assert.equal(storedFile.metadata.contentType, "image/png");
    assert.equal(storedFile.metadata.purpose, PROFILE_IMAGE_PURPOSE);
    assert.equal(String(storedFile.metadata.ownerId), String(temporaryUser._id));
    assert.notEqual(storedFile.filename, "untrusted-original-name.exe");

    const secondUploadResponse = await uploadFile(
      baseUrl,
      token,
      pngBytes,
      "image/png",
      "second.png",
    );
    assert.equal(secondUploadResponse.status, 201);
    const secondUploadBody = await secondUploadResponse.json();
    const secondFileId = parseProfileImageId(
      new URL(secondUploadBody.url).pathname.split("/").at(-1),
    );
    assert(secondFileId);
    storedFileIds.push(secondFileId);

    const foreignUploadResponse = await uploadFile(
      baseUrl,
      otherToken,
      pngBytes,
      "image/png",
      "foreign.png",
    );
    assert.equal(foreignUploadResponse.status, 201);
    const foreignUploadBody = await foreignUploadResponse.json();
    const foreignFileId = parseProfileImageId(
      new URL(foreignUploadBody.url).pathname.split("/").at(-1),
    );
    assert(foreignFileId);
    storedFileIds.push(foreignFileId);
    const chunkCount = await mongoose.connection.db
      .collection(`${PROFILE_IMAGE_BUCKET_NAME}.chunks`)
      .countDocuments({ files_id: fileId });
    assert(chunkCount > 0);

    const publicFilesAfterUpload = (await fs.readdir(publicDirectory)).sort();
    assert.deepEqual(publicFilesAfterUpload, publicFilesBeforeUpload);

    const downloadResponse = await fetch(uploadBody.url);
    assert.equal(downloadResponse.status, 200);
    assert.equal(downloadResponse.headers.get("content-type"), "image/png");
    assert.equal(
      downloadResponse.headers.get("cross-origin-resource-policy"),
      "cross-origin",
    );
    const downloadedBytes = Buffer.from(await downloadResponse.arrayBuffer());
    assert.deepEqual(downloadedBytes, pngBytes);

    const profileResponse = await updatePhotos(baseUrl, token, [
      uploadBody.url,
      secondUploadBody.url,
    ]);
    assert.equal(profileResponse.status, 200);
    const persistedUser = await User.findById(temporaryUser._id).lean();
    assert.equal(persistedUser.photoURL, uploadBody.url);
    assert.deepEqual(persistedUser.photos, [
      uploadBody.url,
      secondUploadBody.url,
    ]);

    const foreignOwnershipResponse = await updatePhotos(baseUrl, token, [
      foreignUploadBody.url,
    ]);
    assert.equal(foreignOwnershipResponse.status, 403);
    const foreignOwnershipBody = await foreignOwnershipResponse.json();
    assert.equal(foreignOwnershipBody.code, "PROFILE_PHOTO_NOT_OWNED");
    const unchangedAfterForeignAttempt = await User.findById(
      temporaryUser._id,
    ).lean();
    assert.deepEqual(unchangedAfterForeignAttempt.photos, [
      uploadBody.url,
      secondUploadBody.url,
    ]);
    assert(await findProfileImage(foreignFileId));

    const removeFirstResponse = await updatePhotos(baseUrl, token, [
      secondUploadBody.url,
    ]);
    assert.equal(removeFirstResponse.status, 200);
    const afterFirstRemoval = await User.findById(temporaryUser._id).lean();
    assert.deepEqual(afterFirstRemoval.photos, [secondUploadBody.url]);
    assert.equal(afterFirstRemoval.photoURL, secondUploadBody.url);
    assert.equal(await findProfileImage(fileId), null);
    assert(await findProfileImage(secondFileId));

    const removeFinalResponse = await updatePhotos(baseUrl, token, []);
    assert.equal(removeFinalResponse.status, 200);
    const afterFinalRemoval = await User.findById(temporaryUser._id).lean();
    assert.deepEqual(afterFinalRemoval.photos, []);
    assert.equal(afterFinalRemoval.photoURL, "");
    assert(afterFinalRemoval.registrationCompletedAt);
    assert.equal(await findProfileImage(secondFileId), null);
    assert(await findProfileImage(foreignFileId));

    const externalPhotoResponse = await updatePhotos(baseUrl, token, [
      "https://example.com/provider-avatar.jpg",
    ]);
    assert.equal(externalPhotoResponse.status, 400);
    const externalPhotoBody = await externalPhotoResponse.json();
    assert.equal(externalPhotoBody.code, "INVALID_PROFILE_PHOTOS");

    const seventhPhotoResponse = await updatePhotos(
      baseUrl,
      token,
      Array.from({ length: 7 }, (_, index) =>
        `${baseUrl}/public/verification-${index}.png`,
      ),
    );
    assert.equal(seventhPhotoResponse.status, 400);

    const unsupportedResponse = await uploadFile(
      baseUrl,
      token,
      Buffer.from("not an image"),
      "text/plain",
      "unsupported.txt",
    );
    assert.equal(unsupportedResponse.status, 400);

    const oversizedResponse = await uploadFile(
      baseUrl,
      token,
      Buffer.alloc(5 * 1024 * 1024 + 1),
      "image/png",
      "oversized.png",
    );
    assert.equal(oversizedResponse.status, 400);

    const malformedResponse = await fetch(`${baseUrl}/api/file/not-an-id`);
    assert.equal(malformedResponse.status, 400);

    const unknownResponse = await fetch(
      `${baseUrl}/api/file/${new mongoose.Types.ObjectId()}`,
    );
    assert.equal(unknownResponse.status, 404);

    await fs.writeFile(legacyPath, pngBytes);
    const legacyResponse = await fetch(`${baseUrl}/public/${legacyFilename}`);
    assert.equal(legacyResponse.status, 200);
    assert.deepEqual(
      Buffer.from(await legacyResponse.arrayBuffer()),
      pngBytes,
    );

    console.log("GridFS profile upload verification passed", {
      authenticatedUpload: true,
      unauthenticatedUploadRejected: true,
      multerMemoryStorage: true,
      gridFsBucket: PROFILE_IMAGE_BUCKET_NAME,
      bytesStoredInMongoDb: true,
      metadataStored: true,
      gridFsDownloadMatchesUpload: true,
      profileUrlPersisted: true,
      orderedPhotoListPersisted: true,
      removedGridFsFilesDeleted: true,
      finalPhotoRemovalAllowedForCompletedUser: true,
      registrationCompletionPreserved: true,
      crossUserPhotoOwnershipRejected: true,
      externalProviderPhotoRejected: true,
      seventhPhotoRejected: true,
      noUploadWrittenToPublicDirectory: true,
      unsupportedMimeRejected: true,
      oversizedFileRejected: true,
      malformedIdRejected: true,
      unknownIdNotFound: true,
      legacyPublicImageServed: true,
    });
  } finally {
    await fs.unlink(legacyPath).catch(() => {});

    for (const fileId of storedFileIds) {
      await deleteProfileImage(fileId).catch(() => {});
    }

    if (temporaryUser?._id) {
      await User.deleteOne({ _id: temporaryUser._id }).catch(() => {});
    }
    if (otherTemporaryUser?._id) {
      await User.deleteOne({ _id: otherTemporaryUser._id }).catch(() => {});
    }

    await close(server).catch(() => {});
    await mongoose.disconnect().catch(() => {});
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
