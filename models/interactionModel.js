// MindFlow AI — Interaction Model

import {
  admin,
  firebaseAdminActive,
} from "../config/firebase.js";

/* Get the Firestore database instance */
function getFirestore() {
  if (!firebaseAdminActive) {
    return null;
  }

  return admin.firestore();
}

/* Get the authenticated user's interactions collection */
function getUserInteractionsCollection(uid) {
  if (!uid || typeof uid !== "string") {
    throw new Error(
      "Firebase user ID is required."
    );
  }

  const db = getFirestore();

  if (!db) {
    return null;
  }

  return db
    .collection("users")
    .doc(uid)
    .collection("interactions");
}

/* Create or update a user interaction */
async function createInteraction(uid, data) {
  const collection =
    getUserInteractionsCollection(uid);

  if (!collection) {
    throw new Error(
      "Firestore is not available in the current environment."
    );
  }

  if (!data || typeof data !== "object") {
    throw new Error(
      "Interaction data is required."
    );
  }

  const interactionId =
    typeof data.id === "string" && data.id.trim()
      ? data.id.trim()
      : typeof data.sessionId === "string" &&
        data.sessionId.trim()
      ? data.sessionId.trim()
      : null;

  if (!interactionId) {
    throw new Error(
      "Interaction ID is required."
    );
  }

  if (interactionId.length > 1500) {
    throw new Error(
      "Interaction ID is too long."
    );
  }

  const docRef =
    collection.doc(interactionId);

  const interactionData = {
    ...data,

    id: interactionId,
    sessionId: interactionId,

    createdAt:
      data.createdAt ||
      admin.firestore.FieldValue.serverTimestamp(),

    updatedAt:
      admin.firestore.FieldValue.serverTimestamp(),
  };

  await docRef.set(
    interactionData,
    {
      merge: true,
    }
  );

  return {
    id: interactionId,
  };
}

/* Get all interactions belonging to the authenticated user */
async function getInteractions(uid) {
  const collection =
    getUserInteractionsCollection(uid);

  if (!collection) {
    throw new Error(
      "Firestore is not available in the current environment."
    );
  }

  const snapshot =
    await collection
      .orderBy("updatedAt", "desc")
      .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

/* Get one interaction belonging to the authenticated user */
async function getInteraction(
  uid,
  interactionId
) {
  const collection =
    getUserInteractionsCollection(uid);

  if (!collection) {
    throw new Error(
      "Firestore is not available in the current environment."
    );
  }

  if (
    !interactionId ||
    typeof interactionId !== "string"
  ) {
    throw new Error(
      "Interaction ID is required."
    );
  }

  const doc =
    await collection
      .doc(interactionId)
      .get();

  if (!doc.exists) {
    return null;
  }

  return {
    id: doc.id,
    ...doc.data(),
  };
}

/* Delete an interaction belonging to the authenticated user */
async function deleteInteraction(
  uid,
  interactionId
) {
  const collection =
    getUserInteractionsCollection(uid);

  if (!collection) {
    throw new Error(
      "Firestore is not available in the current environment."
    );
  }

  if (
    !interactionId ||
    typeof interactionId !== "string"
  ) {
    throw new Error(
      "Interaction ID is required."
    );
  }

  const docRef =
    collection.doc(interactionId);

  const existingDoc =
    await docRef.get();

  if (!existingDoc.exists) {
    return {
      success: false,
      id: interactionId,
      message: "Reflection not found.",
    };
  }

  await docRef.delete();

  return {
    success: true,
    id: interactionId,
  };
}

export {
  createInteraction,
  getInteractions,
  getInteraction,
  deleteInteraction,
};