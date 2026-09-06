import admin from "firebase-admin";

let firebaseAdminActive = false;

/* Initialize Firebase Admin with server credentials */
try {
  const serviceAccountJson =
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GCP_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT;

  if (serviceAccountJson) {
    const serviceAccount = JSON.parse(serviceAccountJson);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: projectId || serviceAccount.project_id,
    });

    firebaseAdminActive = true;

    console.log(
      "[Firebase Admin] Initialized with Service Account JSON."
    );
  } else {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      ...(projectId ? { projectId } : {}),
    });

    firebaseAdminActive = true;

    console.log(
      "[Firebase Admin] Initialized with Application Default Credentials."
    );
  }
} catch (error) {
  firebaseAdminActive = false;

  console.error(
    "[Firebase Admin] Initialization failed:",
    error.message
  );
}

export {
  admin,
  firebaseAdminActive,
};