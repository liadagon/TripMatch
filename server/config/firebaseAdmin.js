const { cert, getApps, initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

const FIREBASE_ADMIN_APP_NAME = "tripmatch-admin";

const getFirebaseAdminConfig = () => {
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const missingVariables = [];

  if (!projectId) missingVariables.push("FIREBASE_PROJECT_ID");
  if (!clientEmail) missingVariables.push("FIREBASE_CLIENT_EMAIL");
  if (!privateKey?.trim()) missingVariables.push("FIREBASE_PRIVATE_KEY");

  if (missingVariables.length > 0) {
    const error = new Error(
      `Firebase Admin configuration is missing: ${missingVariables.join(", ")}`
    );
    error.code = "FIREBASE_ADMIN_CONFIG_MISSING";
    error.statusCode = 500;
    throw error;
  }

  return { projectId, clientEmail, privateKey };
};

const getFirebaseAdminApp = () => {
  const existingApp = getApps().find(
    (app) => app.name === FIREBASE_ADMIN_APP_NAME
  );

  if (existingApp) return existingApp;

  const { projectId, clientEmail, privateKey } = getFirebaseAdminConfig();

  return initializeApp(
    {
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      projectId,
    },
    FIREBASE_ADMIN_APP_NAME
  );
};

const getFirebaseAdminAuth = () => {
  return getAuth(getFirebaseAdminApp());
};

module.exports = getFirebaseAdminAuth;
module.exports.getFirebaseAdminApp = getFirebaseAdminApp;
