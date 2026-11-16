import { readFileSync } from "node:fs";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const projectId = process.env.FIREBASE_PROJECT_ID;
const credentialsJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!projectId) {
  throw new Error(
    "FIREBASE_PROJECT_ID is not set. Copy backend/.env.example to backend/.env and fill it in.",
  );
}

// cert() loads a service account from an environment variable string or a JSON file.
// When neither is set, the Admin SDK falls back to Application Default Credentials.
let credential;
if (credentialsJson) {
  credential = cert(JSON.parse(credentialsJson));
} else if (credentialsPath) {
  credential = cert(JSON.parse(readFileSync(credentialsPath, "utf8")));
}

// getApps() stops the app from being created twice when the module is reloaded by --watch.
const app = getApps().length
  ? getApps()[0]
  : initializeApp({ projectId, ...(credential ? { credential } : {}) });

export const db = getFirestore(app);
export const adminAuth = getAuth(app);
