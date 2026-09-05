import { admin, firebaseAdminActive } from "../config/firebase.js";

async function authenticateFirebaseUser(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Unauthorized",
      message:
        "Authentication required. Please sign in with Google via Firebase.",
    });
  }

  const idToken = authHeader
    .split("Bearer ")[1]
    .trim();

  if (!idToken) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Empty authentication token provided.",
    });
  }

  // Production: cryptographically verify Firebase ID token
  if (firebaseAdminActive) {
    try {
      const decodedToken =
        await admin.auth().verifyIdToken(idToken);

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
        "[Auth Warning] Firebase token verification failed:",
        authError.message
      );

      return res.status(401).json({
        error: "Unauthorized",
        message:
          "Invalid or expired Firebase authentication token.",
      });
    }
  }

  // Local development fallback
  // Extract the Firebase UID from the JWT payload.
  try {
    const parts = idToken.split(".");

    if (parts.length === 3) {
      const payload = JSON.parse(
        Buffer.from(parts[1], "base64").toString("utf-8")
      );

      const uid = payload.user_id || payload.sub;

      if (uid && typeof uid === "string") {
        req.user = {
          uid,
          email: payload.email || "",
          name:
            payload.name ||
            payload.email?.split("@")[0] ||
            "User",
        };

        return next();
      }
    }
  } catch (error) {
    console.warn(
      "[Auth] Could not decode local Firebase token:",
      error.message
    );
  }

  return res.status(401).json({
    error: "Unauthorized",
    message:
      "Invalid token payload. Please sign in with Google.",
  });
}

export { authenticateFirebaseUser };