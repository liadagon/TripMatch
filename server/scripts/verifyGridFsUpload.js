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

async function run() {
  assert(process.env.DATABASE_URL, "DATABASE_URL is not configured");
  assert(process.env.JWT_SECRET, "JWT_SECRET is not configured");

  const verificationId = crypto.randomUUID();
  const verificationEmail = `gridfs-${verificationId}@example.com`;
  const legacyFilename = `gridfs-legacy-${verificationId}.png`;
  const legacyPath = path.join(publicDirectory, legacyFilename);
  const storedFileIds = [];
  let temporaryUser;
  let server;

  try {
    await mongoose.connect(process.env.DATABASE_URL);
    temporaryUser = await User.create({
      name: "GridFS Verification User",
      email: verificationEmail,
      authProvider: "email",
      emailVerified: true,
    });
    const token = jwt.sign(
      { userId: temporaryUser._id },
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

    const profileResponse = await fetch(`${baseUrl}/api/users/me`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ photoURL: uploadBody.url, photos: [uploadBody.url] }),
    });
    assert.equal(profileResponse.status, 200);
    const persistedUser = await User.findById(temporaryUser._id).lean();
    assert.equal(persistedUser.photoURL, uploadBody.url);
    assert.deepEqual(persistedUser.photos, [uploadBody.url]);

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

    await close(server).catch(() => {});
    await mongoose.disconnect().catch(() => {});
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
