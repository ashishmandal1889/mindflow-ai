import {
  createInteraction,
  getInteractions,
  getInteraction,
  deleteInteraction,
} from "../models/interactionModel.js";

/* Create a new reflection */
async function createInteractionController(req, res) {
  try {
    const uid = req.user?.uid;

    if (!uid) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User authentication is required.",
      });
    }

    const body =
      req.body && typeof req.body === "object"
        ? req.body
        : {};

    const interaction = await createInteraction(uid, {
      ...body,
      uid,
    });

    return res.status(201).json({
      success: true,
      interaction,
    });
  } catch (error) {
    console.error(
      "[Interaction Create] Failed:",
      error
    );

    return res.status(500).json({
      error: "Create Failed",
      message: "Unable to create reflection.",
    });
  }
}

/* Get the current user's reflections */
async function getInteractionsController(req, res) {
  try {
    const uid = req.user?.uid;

    if (!uid) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User authentication is required.",
      });
    }

    const interactions = await getInteractions(uid);

    return res.status(200).json({
      success: true,
      interactions,
    });
  } catch (error) {
    console.error(
      "[Interaction List] Failed:",
      error
    );

    return res.status(500).json({
      error: "Fetch Failed",
      message: "Unable to load reflections.",
    });
  }
}

/* Get one reflection */
async function getInteractionController(req, res) {
  try {
    const uid = req.user?.uid;
    const { id } = req.params;

    if (!uid) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User authentication is required.",
      });
    }

    if (!id) {
      return res.status(400).json({
        error: "Validation Error",
        message: "Reflection ID is required.",
      });
    }

    const interaction = await getInteraction(
      uid,
      id
    );

    if (!interaction) {
      return res.status(404).json({
        error: "Not Found",
        message: "Reflection not found.",
      });
    }

    return res.status(200).json({
      success: true,
      interaction,
    });
  } catch (error) {
    console.error(
      "[Interaction Get] Failed:",
      error
    );

    return res.status(500).json({
      error: "Fetch Failed",
      message: "Unable to load reflection.",
    });
  }
}

/* Delete a reflection */
async function deleteInteractionController(req, res) {
  try {
    const uid = req.user?.uid;
    const { id } = req.params;

    if (!uid) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User authentication is required.",
      });
    }

    if (!id) {
      return res.status(400).json({
        error: "Validation Error",
        message: "Reflection ID is required.",
      });
    }

    const existing = await getInteraction(
      uid,
      id
    );

    if (!existing) {
      return res.status(404).json({
        error: "Not Found",
        message: "Reflection not found.",
      });
    }

    await deleteInteraction(uid, id);

    return res.status(200).json({
      success: true,
      message: "Reflection deleted successfully.",
      id,
    });
  } catch (error) {
    console.error(
      "[Interaction Delete] Failed:",
      error
    );

    return res.status(500).json({
      error: "Delete Failed",
      message: "Unable to delete reflection.",
    });
  }
}

export {
  createInteractionController,
  getInteractionsController,
  getInteractionController,
  deleteInteractionController,
};