const path = require("node:path");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const User = require("../models/User");

function isKnownGoogleProviderUrl(value) {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const hostname = new URL(value.trim()).hostname.toLowerCase();
    return hostname.endsWith("googleusercontent.com") || hostname.endsWith("ggpht.com");
  } catch {
    return false;
  }
}

async function run() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
  const applyChanges = process.argv.includes("--apply");
  await mongoose.connect(process.env.DATABASE_URL);
  try {
    const users = await User.collection
      .find(
        { authProvider: "google" },
        { projection: { photo: 1, photoURL: 1, photos: 1 } },
      )
      .toArray();
    let candidates = 0;
    let modified = 0;

    for (const user of users) {
      const originalPhotos = Array.isArray(user.photos) ? user.photos : [];
      const photos = originalPhotos.filter((url) => !isKnownGoogleProviderUrl(url));
      const imported =
        isKnownGoogleProviderUrl(user.photoURL) ||
        isKnownGoogleProviderUrl(user.photo) ||
        photos.length !== originalPhotos.length;
      if (!imported) continue;
      candidates += 1;
      if (!applyChanges) continue;

      const photo = isKnownGoogleProviderUrl(user.photo) ? "" : user.photo || "";
      const photoURL = isKnownGoogleProviderUrl(user.photoURL)
        ? photos[0] || photo || ""
        : user.photoURL || "";
      const result = await User.collection.updateOne(
        { _id: user._id, authProvider: "google" },
        { $set: { photo, photoURL, photos } },
      );
      modified += result.modifiedCount;
    }

    console.log("Imported Google avatar cleanup", {
      mode: applyChanges ? "apply" : "dry-run",
      googleUsersScanned: users.length,
      candidates,
      modified,
    });
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
