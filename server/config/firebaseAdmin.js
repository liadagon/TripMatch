const { cert, getApps, initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

const FIREBASE_ADMIN_APP_NAME = "tripmatch-admin";

const getFirebaseAdminAuth = () => {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    const error = new Error("Firebase Admin is not configured");
    error.statusCode = 500;
    throw error;
  }

  const existingApp = getApps().find(
    (app) => app.name === FIREBASE_ADMIN_APP_NAME
  );

  const app =
    existingApp ||
    initializeApp(
      {
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      },
      FIREBASE_ADMIN_APP_NAME
    );

  return getAuth(app);
};

module.exports = getFirebaseAdminAuth;
