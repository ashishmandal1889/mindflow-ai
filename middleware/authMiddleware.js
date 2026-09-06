/* Authenticate a request using a Firebase ID token */
async function authenticateFirebaseUser(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Unauthorized",
      message:
        "Authentication required. Please sign in with Google via Firebase.",
    });
  }

  const idToken = authHeader.slice("Bearer ".length).trim();

  if (!idToken) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Empty authentication token provided.",
    });
  }

  /* Verify Firebase tokens through Firebase Admin */
  try {
    const { admin, firebaseAdminActive } = await import(
      "../config/firebase.js"
    );

    if (!firebaseAdminActive) {
      console.error("[Auth] Firebase Admin SDK is not active.");

      return res.status(503).json({
        error: "Authentication unavailable",
        message:
          "Server authentication is not configured correctly.",
      });
    }

    const decodedToken = await admin.auth().verifyIdToken(idToken);

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || "",
      name:
        decodedToken.name ||
        decodedToken.email?.split("@")[0] ||
        "User",
    };

    return next();
  } catch (authError) {
    console.warn(
      "[Auth] Firebase token verification failed:",
      authError.message
    );

    return res.status(401).json({
      error: "Unauthorized",
      message:
        "Invalid or expired Firebase authentication token.",
    });
  }
}

export { authenticateFirebaseUser };