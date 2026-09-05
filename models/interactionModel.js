// ============================================================================
// MINDFLOW AI — INTERACTION MODEL
// ============================================================================

import {
  admin,
  firebaseAdminActive,
} from "../config/firebase.js";

// ============================================================================
// FIRESTORE CONNECTION
// ============================================================================

function getFirestore() {
  if (!firebaseAdminActive) {
    return null;
  }

  return admin.firestore();
}

// ============================================================================
// USER INTERACTIONS COLLECTION
// ============================================================================

function getUserInteractionsCollection(uid) {
  const db = getFirestore();

  if (!db) {
    return null;
  }

  if (!uid) {
    throw new Error(
      "Firebase user ID is required."
    );
  }

  return db
    .collection("users")
    .doc(uid)
    .collection("interactions");
}

// ============================================================================
// CREATE / UPDATE INTERACTION
// ============================================================================

async function createInteraction(uid, data) {
  const collection =
    getUserInteractionsCollection(uid);

  if (!collection) {
    throw new Error(
      "Firestore is not available in the current environment."
    );
  }

  const interactionId =
    data.id ||
    data.sessionId;

  if (!interactionId) {
    throw new Error(
      "Interaction ID is required."
    );
  }

  const docRef =
    collection.doc(interactionId);

  await docRef.set(
    {
      ...data,

      // Keep the document ID and application ID consistent.
      id: interactionId,
      sessionId: interactionId,

      createdAt:
        admin.firestore.FieldValue.serverTimestamp(),

      updatedAt:
        admin.firestore.FieldValue.serverTimestamp(),
    },
    {
      merge: true,
    }
  );

  return {
    id: interactionId,
  };
}

// ============================================================================
// GET ALL USER INTERACTIONS
// ============================================================================

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

  return snapshot.docs.map(
    (doc) => ({
      id: doc.id,
      ...doc.data(),
    })
  );
}

// ============================================================================
// GET SINGLE INTERACTION
// ============================================================================

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

  if (!interactionId) {
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

// ============================================================================
// DELETE INTERACTION
// ============================================================================

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

  if (!interactionId) {
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
      message:
        "Reflection not found.",
    };
  }

  await docRef.delete();

  return {
    success: true,
    id: interactionId,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  createInteraction,
  getInteractions,
  getInteraction,
  deleteInteraction,
};