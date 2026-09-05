import admin from "firebase-admin";

let firebaseAdminActive = false;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const serviceAccount = JSON.parse(
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    );

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId:
        process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id,
    });

    firebaseAdminActive = true;

    console.log(
      "[Firebase Admin] Initialized with Service Account JSON."
    );
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp({
      projectId:
        process.env.FIREBASE_PROJECT_ID ||
        process.env.GCP_PROJECT_ID,
    });

    firebaseAdminActive = true;

    console.log(
      "[Firebase Admin] Initialized with Service Account file."
    );
  } else if (
    process.env.K_SERVICE &&
    (process.env.GCP_PROJECT_ID ||
      process.env.GOOGLE_CLOUD_PROJECT)
  ) {
    // Cloud Run production runtime
    admin.initializeApp({
      projectId:
        process.env.FIREBASE_PROJECT_ID ||
        process.env.GCP_PROJECT_ID ||
        process.env.GOOGLE_CLOUD_PROJECT,
    });

    firebaseAdminActive = true;

    console.log(
      "[Firebase Admin] Initialized in Cloud Run environment."
    );
  } else {
    console.log(
      "[Firebase Admin] Running in Local Development / Demo Mode."
    );
  }
} catch (err) {
  console.warn(
    `[Firebase Admin Warning]: ${err.message}`
  );
}

export { admin, firebaseAdminActive };