// ============================================================================
// MINDFLOW AI — CLIENT APPLICATION
// ============================================================================

(function () {
  "use strict";

  // ==========================================================================
  // STATE
  // ==========================================================================

  let currentUser = null;
  let currentIdToken = null;
  let activeSessionId = null;
  let currentChatHistory = [];
  let auth = null;

  let isRecordingVoice = false;
  let speechRecognition = null;

  // ==========================================================================
  // DOM ELEMENTS
  // ==========================================================================

  const landingHero =
    document.getElementById("landingHero");

  const mainDashboard =
    document.getElementById("mainDashboard");

  const signInBtn =
    document.getElementById("signInBtn");

  const heroSignInBtn =
    document.getElementById("heroSignInBtn");

  const signOutBtn =
    document.getElementById("signOutBtn");

  const authErrorMessage =
    document.getElementById("authErrorMessage");

  const userProfile =
    document.getElementById("userProfile");

  const userAvatar =
    document.getElementById("userAvatar");

  const userName =
    document.getElementById("userName");

  const userUidSnippet =
    document.getElementById("userUidSnippet");

  const entriesList =
    document.getElementById("entriesList");

  const newEntryBtn =
    document.getElementById("newEntryBtn");

  const messagesContainer =
    document.getElementById("messagesContainer");

  const messageInput =
    document.getElementById("messageInput");

  const sendBtn =
    document.getElementById("sendBtn");

  const charCounter =
    document.getElementById("charCounter");

  const voiceDictationBtn =
    document.getElementById("voiceDictationBtn");

  const voiceStatusText =
    document.getElementById("voiceStatusText");

  const synthesizeActionsBtn =
    document.getElementById("synthesizeActionsBtn");

  const actionsList =
    document.getElementById("actionsList");

  const analyzeToneBtn =
    document.getElementById("analyzeToneBtn");

  const clarityScoreDisplay =
    document.getElementById("clarityScoreDisplay");

  const sentimentLabel =
    document.getElementById("sentimentLabel");

  const energyLabel =
    document.getElementById("energyLabel");

  const thematicTags =
    document.getElementById("thematicTags");

  const exportMdBtn =
    document.getElementById("exportMdBtn");

  const reflectionContextSelect =
    document.getElementById("reflectionContextSelect");

  const sessionTitle =
    document.getElementById("sessionTitle");

  const sessionTimestamp =
    document.getElementById("sessionTimestamp");

  const toast =
    document.getElementById("toast");

  // ==========================================================================
  // TOAST
  // ==========================================================================

  function showToast(message, type = "info") {
    if (!toast) {
      return;
    }

    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.remove("hidden");

    setTimeout(() => {
      toast.classList.add("hidden");
    }, 4500);
  }

  // ==========================================================================
  // FIREBASE INITIALIZATION
  // ==========================================================================

  async function initializeFirebase() {
    try {
      let config = null;

      // ----------------------------------------------------------------------
      // Get Firebase configuration from backend
      // ----------------------------------------------------------------------

      try {
        const response =
          await fetch("/api/config");

        if (response.ok) {
          const data =
            await response.json();

          if (
            data &&
            data.firebaseConfig &&
            data.firebaseConfig.apiKey
          ) {
            config =
              data.firebaseConfig;
          }
        }
      } catch (error) {
        console.warn(
          "[Firebase] Could not fetch server config:",
          error.message
        );
      }

      // ----------------------------------------------------------------------
      // Local Firebase configuration fallback
      // ----------------------------------------------------------------------

      if (!config || !config.apiKey) {
        const savedConfig =
          localStorage.getItem(
            "custom_firebase_config"
          );

        if (savedConfig) {
          try {
            const parsed =
              JSON.parse(savedConfig);

            if (
              parsed &&
              parsed.apiKey
            ) {
              config = parsed;
            }
          } catch (error) {
            console.warn(
              "[Firebase] Invalid saved configuration."
            );
          }
        }
      }

      // ----------------------------------------------------------------------
      // Initialize Firebase Authentication
      // ----------------------------------------------------------------------

      if (
        config &&
        config.apiKey &&
        (config.projectId ||
          config.authDomain)
      ) {
        if (!firebase.apps.length) {
          firebase.initializeApp(config);
        }

        auth = firebase.auth();

        await auth
          .setPersistence(
            firebase.auth.Auth.Persistence.LOCAL
          )
          .catch((error) => {
            console.warn(
              "[Firebase Auth] Persistence:",
              error.message
            );
          });

        auth.onAuthStateChanged(
          async (user) => {
            if (user) {
              currentUser = user;

              try {
                currentIdToken =
                  await user.getIdToken();
              } catch (error) {
                console.warn(
                  "Could not retrieve ID token:",
                  error
                );
              }

              renderAuthenticatedState(
                user
              );

              await bindFirestoreHistoryListener(
                user.uid
              );
            } else {
              currentUser = null;
              currentIdToken = null;

              renderUnauthenticatedState();
            }
          }
        );

        console.log(
          "[Firebase] Initialized:",
          config.projectId
        );
      } else {
        auth = null;

        renderUnauthenticatedState();
      }
    } catch (error) {
      console.warn(
        "[Firebase Init Warning]:",
        error.message
      );

      auth = null;

      renderUnauthenticatedState();
    }
  }

  // ==========================================================================
  // GOOGLE SIGN-IN
  // ==========================================================================

  async function handleGoogleSignIn() {
    clearAuthError();

    if (!auth) {
      showAuthError(
        "Firebase Configuration Required",
        "Firebase Authentication is not configured."
      );

      showToast(
        "Firebase Authentication is not configured.",
        "error"
      );

      return;
    }

    try {
      if (heroSignInBtn) {
        heroSignInBtn.disabled = true;
      }

      if (signInBtn) {
        signInBtn.disabled = true;
      }

      const provider =
        new firebase.auth.GoogleAuthProvider();

      provider.addScope("profile");
      provider.addScope("email");

      provider.setCustomParameters({
        prompt: "select_account",
      });

      const result =
        await auth.signInWithPopup(
          provider
        );

      currentUser = result.user;

      currentIdToken =
        await currentUser.getIdToken();

      clearAuthError();

      showToast(
        `Signed in as ${
          currentUser.displayName ||
          currentUser.email
        }`,
        "success"
      );
    } catch (error) {
      console.error(
        "Google Sign-In Error:",
        error
      );

      handleFirebaseAuthError(error);
    } finally {
      if (heroSignInBtn) {
        heroSignInBtn.disabled = false;
      }

      if (signInBtn) {
        signInBtn.disabled = false;
      }
    }
  }

  // ==========================================================================
  // AUTH ERRORS
  // ==========================================================================

  function handleFirebaseAuthError(error) {
    let title =
      "Authentication Failed";

    let detail =
      error.message ||
      "An unknown authentication error occurred.";

    if (
      error.code ===
        "auth/popup-closed-by-user" ||
      error.code ===
        "auth/cancelled-popup-request"
    ) {
      title = "Sign-In Cancelled";

      detail =
        "The Google Sign-In popup was closed before authentication completed.";
    } else if (
      error.code ===
      "auth/unauthorized-domain"
    ) {
      title = "Unauthorized Domain";

      detail =
        `This domain (${window.location.hostname}) is not authorized in Firebase.`;
    } else if (
      error.code ===
      "auth/operation-not-allowed"
    ) {
      title =
        "Google Sign-In Disabled";

      detail =
        "Google Sign-In is not enabled in your Firebase Authentication settings.";
    } else if (
      error.code ===
        "auth/invalid-api-key" ||
      error.code ===
        "auth/configuration-not-found"
    ) {
      title =
        "Invalid Firebase Configuration";

      detail =
        "Please check your Firebase Web configuration.";
    } else if (
      error.code ===
      "auth/popup-blocked"
    ) {
      title = "Popup Blocked";

      detail =
        "Your browser blocked the Google Sign-In popup. Allow popups and try again.";
    }

    showAuthError(
      title,
      detail
    );

    showToast(
      title,
      "error"
    );
  }

  function showAuthError(
    title,
    detail
  ) {
    if (!authErrorMessage) {
      return;
    }

    authErrorMessage.innerHTML =
      `<strong>${escapeHtml(title)}</strong>${escapeHtml(detail)}`;

    authErrorMessage.classList.remove(
      "hidden"
    );
  }

  function clearAuthError() {
    if (!authErrorMessage) {
      return;
    }

    authErrorMessage.innerHTML = "";

    authErrorMessage.classList.add(
      "hidden"
    );
  }

  // ==========================================================================
  // SIGN OUT
  // ==========================================================================

  async function handleSignOut() {
    if (auth) {
      try {
        await auth.signOut();
      } catch (error) {
        console.warn(
          "Sign out warning:",
          error
        );
      }
    }

    currentUser = null;
    currentIdToken = null;
    activeSessionId = null;
    currentChatHistory = [];

    renderUnauthenticatedState();

    if (entriesList) {
      entriesList.innerHTML = `
        <div class="entry-loading">
          Please sign in to view your reflections.
        </div>
      `;
    }

    if (messagesContainer) {
      messagesContainer.innerHTML = "";
    }

    showToast(
      "Signed out successfully.",
      "info"
    );
  }

  // ==========================================================================
  // UI STATE
  // ==========================================================================

  function renderAuthenticatedState(
    user
  ) {
    if (landingHero) {
      landingHero.classList.add(
        "hidden"
      );
    }

    if (mainDashboard) {
      mainDashboard.classList.remove(
        "hidden"
      );
    }

    if (signInBtn) {
      signInBtn.classList.add(
        "hidden"
      );
    }

    if (userProfile) {
      userProfile.classList.remove(
        "hidden"
      );
    }

    const displayName =
      user?.displayName ||
      user?.email ||
      "Authenticated User";

    if (userName) {
      userName.textContent =
        displayName;
    }

    if (
      user?.uid &&
      userUidSnippet
    ) {
      const shortUid =
        user.uid.length > 14
          ? `${user.uid.substring(
              0,
              10
            )}...`
          : user.uid;

      userUidSnippet.textContent =
        `UID: ${shortUid}`;

      userUidSnippet.title =
        `Firebase UID: ${user.uid}`;
    }

    if (userAvatar) {
      userAvatar.src =
        user.photoURL ||
        "https://lh3.googleusercontent.com/a/default-user=s96-c";
    }

    clearAuthError();

    if (!activeSessionId) {
      startNewSession();
    }
  }

  function renderUnauthenticatedState() {
    if (landingHero) {
      landingHero.classList.remove(
        "hidden"
      );
    }

    if (mainDashboard) {
      mainDashboard.classList.add(
        "hidden"
      );
    }

    if (signInBtn) {
      signInBtn.classList.remove(
        "hidden"
      );
    }

    if (userProfile) {
      userProfile.classList.add(
        "hidden"
      );
    }

    if (userName) {
      userName.textContent = "";
    }

    if (userUidSnippet) {
      userUidSnippet.textContent = "";
      userUidSnippet.title = "";
    }

    if (userAvatar) {
      userAvatar.src = "";
    }
  }

  // ==========================================================================
  // MVC REFLECTION HISTORY
  // ==========================================================================

  async function bindFirestoreHistoryListener(
    userId
  ) {
    if (
      !userId ||
      !currentUser
    ) {
      if (entriesList) {
        entriesList.innerHTML = `
          <div class="entry-loading">
            Please sign in to view your reflections.
          </div>
        `;
      }

      return;
    }

    try {
      const token =
        await currentUser.getIdToken();

      if (!token) {
        throw new Error(
          "Authentication token unavailable."
        );
      }

      const response =
        await fetch(
          "/api/interactions",
          {
            method: "GET",
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      const data =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message ||
          data.error ||
          `Server responded with status ${response.status}`
        );
      }

      if (!entriesList) {
        return;
      }

      entriesList.innerHTML = "";

      const interactions =
        Array.isArray(
          data.interactions
        )
          ? data.interactions
          : [];

      if (!interactions.length) {
        entriesList.innerHTML = `
          <div class="entry-loading">
            No saved reflections yet.
          </div>
        `;

        return;
      }

      interactions.forEach(
        (interaction) => {
          renderHistoryEntryItem(
            interaction.id,
            interaction
          );
        }
      );

      console.log(
        "[MVC] Reflections loaded:",
        interactions.length
      );
    } catch (error) {
      console.error(
        "[MVC] Could not load reflections:",
        error
      );

      if (entriesList) {
        entriesList.innerHTML = `
          <div class="entry-loading">
            Could not load reflections.
            Please refresh and try again.
          </div>
        `;
      }
    }
  }

  // ==========================================================================
  // RENDER HISTORY ITEM
  // ==========================================================================

  function renderHistoryEntryItem(
    docId,
    data
  ) {
    if (!entriesList) {
      return;
    }

    const item =
      document.createElement("div");

    item.className =
      `entry-item ${
        docId === activeSessionId
          ? "active"
          : ""
      }`;

    item.id =
      `entry-${docId}`;

    let dateStr = "Recent";

    if (data.updatedAt) {
      try {
        let date;

        if (
          data.updatedAt &&
          typeof data.updatedAt.toDate ===
            "function"
        ) {
          date =
            data.updatedAt.toDate();
        } else {
          date =
            new Date(
              data.updatedAt
            );
        }

        if (
          !isNaN(
            date.getTime()
          )
        ) {
          dateStr =
            date.toLocaleDateString(
              undefined,
              {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }
            );
        }
      } catch (error) {
        dateStr = "Recent";
      }
    }

    item.innerHTML = `
      <div class="entry-item-main">

        <div class="entry-item-title">
          ${escapeHtml(
            data.title ||
              "Reflective Journal"
          )}
        </div>

        <div class="entry-item-preview">
          ${escapeHtml(
            data.lastMessage ||
              "Empty reflection..."
          )}
        </div>

        <span class="entry-item-date">
          ${escapeHtml(dateStr)}
        </span>

      </div>

      <button
        class="entry-delete-btn"
        title="Delete reflection"
        aria-label="Delete reflection"
        type="button"
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6l-1 14H6L5 6"></path>
          <path d="M10 11v6"></path>
          <path d="M14 11v6"></path>
          <path d="M9 6V4h6v2"></path>
        </svg>
      </button>
    `;

    // ------------------------------------------------------------------------
    // Open reflection
    // ------------------------------------------------------------------------

    item.addEventListener(
      "click",
      () => {
        loadExistingSession(
          docId,
          data
        );
      }
    );

    // ------------------------------------------------------------------------
    // Delete reflection
    // ------------------------------------------------------------------------

    const deleteBtn =
      item.querySelector(
        ".entry-delete-btn"
      );

    if (deleteBtn) {
      deleteBtn.addEventListener(
        "click",
        (event) => {
          event.stopPropagation();

          deleteReflection(docId);
        }
      );
    }

    entriesList.appendChild(item);
  }

  // ==========================================================================
  // DELETE REFLECTION — MVC API
  // ==========================================================================

  async function deleteReflection(
    docId
  ) {
    if (
      !currentUser ||
      !docId
    ) {
      showToast(
        "Please sign in before deleting a reflection.",
        "error"
      );

      return;
    }

    const confirmed =
      window.confirm(
        "Delete this reflection?\n\nThis cannot be undone."
      );

    if (!confirmed) {
      return;
    }

    const entryElement =
      document.getElementById(
        `entry-${docId}`
      );

    const deleteButton =
      entryElement?.querySelector(
        ".entry-delete-btn"
      );

    if (deleteButton) {
      deleteButton.disabled = true;
    }

    try {
      const token =
        await currentUser.getIdToken(
          true
        );

      if (!token) {
        throw new Error(
          "Authentication token unavailable."
        );
      }

      const response =
        await fetch(
          `/api/interactions/${encodeURIComponent(
            docId
          )}`,
          {
            method: "DELETE",
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      const data =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message ||
          data.error ||
          `Server responded with status ${response.status}`
        );
      }

      console.log(
        "[MVC] Reflection deleted:",
        docId
      );

      // ----------------------------------------------------------------------
      // Remove local fallback copy too.
      // ----------------------------------------------------------------------

      if (currentUser?.uid) {
        const key =
          `mindflow_${currentUser.uid}`;

        try {
          const saved =
            JSON.parse(
              localStorage.getItem(
                key
              ) || "[]"
            );

          const updated =
            saved.filter(
              (item) =>
                item.id !== docId
            );

          localStorage.setItem(
            key,
            JSON.stringify(updated)
          );
        } catch (storageError) {
          console.warn(
            "[LocalStorage] Delete failed:",
            storageError
          );
        }
      }

      // ----------------------------------------------------------------------
      // If deleting the active reflection,
      // start a fresh session.
      // ----------------------------------------------------------------------

      if (
        activeSessionId ===
        docId
      ) {
        startNewSession();
      }

      // ----------------------------------------------------------------------
      // Remove from UI.
      // ----------------------------------------------------------------------

      if (entryElement) {
        entryElement.remove();
      }

      // ----------------------------------------------------------------------
      // Empty state.
      // ----------------------------------------------------------------------

      if (
        entriesList &&
        !entriesList.querySelector(
          ".entry-item"
        )
      ) {
        entriesList.innerHTML = `
          <div class="entry-loading">
            No saved reflections yet.
          </div>
        `;
      }

      showToast(
        "Reflection deleted successfully.",
        "success"
      );
    } catch (error) {
      console.error(
        "[MVC] Delete reflection error:",
        error
      );

      if (deleteButton) {
        deleteButton.disabled = false;
      }

      showToast(
        `Could not delete this reflection. ${error.message}`,
        "error"
      );
    }
  }

  // ==========================================================================
  // LOCAL STORAGE FALLBACK
  // ==========================================================================

  function loadLocalSessionStorage(
    userId
  ) {
    if (!entriesList) {
      return;
    }

    const key =
      `mindflow_${userId}`;

    let saved = [];

    try {
      saved =
        JSON.parse(
          localStorage.getItem(
            key
          ) || "[]"
        );
    } catch (error) {
      console.warn(
        "[LocalStorage] Could not read reflections:",
        error
      );
    }

    entriesList.innerHTML = "";

    if (!saved.length) {
      entriesList.innerHTML = `
        <div class="entry-loading">
          No reflections recorded yet.
        </div>
      `;

      return;
    }

    saved.forEach((item) => {
      renderHistoryEntryItem(
        item.id,
        item
      );
    });
  }

  function saveToLocalStorage(
    userId,
    sessionData
  ) {
    if (!userId || !sessionData?.id) {
      return;
    }

    const key =
      `mindflow_${userId}`;

    let saved = [];

    try {
      saved =
        JSON.parse(
          localStorage.getItem(
            key
          ) || "[]"
        );
    } catch (error) {
      saved = [];
    }

    const existingIndex =
      saved.findIndex(
        (item) =>
          item.id ===
          sessionData.id
      );

    if (existingIndex >= 0) {
      saved[existingIndex] =
        sessionData;
    } else {
      saved.unshift(
        sessionData
      );
    }

    localStorage.setItem(
      key,
      JSON.stringify(saved)
    );
  }

  // ==========================================================================
  // SAVE REFLECTION — MVC API
  // ==========================================================================

  async function persistInteractionToFirestore(
    prompt,
    reply,
    modelUsed
  ) {
    if (
      !currentUser ||
      !activeSessionId
    ) {
      return;
    }

    // IMPORTANT:
    // Keep payload outside try/catch so the localStorage fallback
    // can safely access it if the API request fails.

    const payload = {
      id: activeSessionId,

      sessionId:
        activeSessionId,

      title:
        currentChatHistory[0]?.text?.substring(
          0,
          45
        ) ||
        "New Reflection",

      lastMessage:
        prompt,

      context:
        reflectionContextSelect?.value ||
        "",

      history:
        currentChatHistory,

      model:
        modelUsed || "",
    };

    try {
      const token =
        await currentUser.getIdToken();

      if (!token) {
        throw new Error(
          "Authentication token unavailable."
        );
      }

      const response =
        await fetch(
          "/api/interactions",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },

            body:
              JSON.stringify(
                payload
              ),
          }
        );

      const data =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message ||
          data.error ||
          `Server responded with status ${response.status}`
        );
      }

      console.log(
        "[MVC] Reflection saved:",
        data
      );

      await bindFirestoreHistoryListener(
        currentUser.uid
      );
    } catch (error) {
      console.error(
        "[MVC] Reflection save failed:",
        error
      );

      // ----------------------------------------------------------------------
      // LocalStorage fallback
      // ----------------------------------------------------------------------

      saveToLocalStorage(
        currentUser.uid,
        {
          ...payload,

          updatedAt:
            new Date().toISOString(),
        }
      );
    }
  }

  // ==========================================================================
  // NEW SESSION
  // ==========================================================================

  function startNewSession() {
    activeSessionId =
      `session_${Date.now()}`;

    currentChatHistory = [];

    if (messagesContainer) {
      messagesContainer.innerHTML = `
        <div class="message-bubble assistant-message">

          <div class="bubble-avatar mindflow-message-avatar">
            M
          </div>

          <div class="bubble-content">

            <div class="bubble-meta">

              <span class="bubble-author">
                MindFlow AI
              </span>

              <span class="bubble-tag">
                Get some clarity
              </span>

            </div>

            <div class="bubble-text">
              Welcome! What’s on your mind today?
              Share a situation, thought, or goal
              you want to work through together.
            </div>

          </div>

        </div>
      `;
    }

    if (sessionTitle) {
      sessionTitle.textContent =
        "New Reflection Session";
    }

    if (sessionTimestamp) {
      sessionTimestamp.textContent =
        new Date().toLocaleTimeString(
          [],
          {
            hour: "2-digit",
            minute: "2-digit",
          }
        );
    }

    if (actionsList) {
      actionsList.innerHTML = `
        <div class="empty-state">
          Share your thoughts, then click
          <strong>Synthesize</strong>
          to extract SMART action items.
        </div>
      `;
    }

    if (clarityScoreDisplay) {
      clarityScoreDisplay.textContent =
        "--";
    }

    if (sentimentLabel) {
      sentimentLabel.textContent =
        "--";
    }

    if (energyLabel) {
      energyLabel.textContent =
        "--";
    }

    if (thematicTags) {
      thematicTags.innerHTML = "";
    }

    if (messageInput) {
      messageInput.value = "";
    }

    updateCharCounter();

    document
      .querySelectorAll(
        ".entry-item"
      )
      .forEach((item) => {
        item.classList.remove(
          "active"
        );
      });
  }

  // ==========================================================================
  // LOAD EXISTING SESSION
  // ==========================================================================

  function loadExistingSession(
    docId,
    data
  ) {
    activeSessionId = docId;

    currentChatHistory =
      Array.isArray(data.history)
        ? data.history
        : [];

    if (sessionTitle) {
      sessionTitle.textContent =
        data.title ||
        "Reflection Session";
    }

    if (
      data.updatedAt &&
      sessionTimestamp
    ) {
      try {
        let date;

        if (
          data.updatedAt &&
          typeof data.updatedAt.toDate ===
            "function"
        ) {
          date =
            data.updatedAt.toDate();
        } else {
          date =
            new Date(
              data.updatedAt
            );
        }

        if (
          !isNaN(
            date.getTime()
          )
        ) {
          sessionTimestamp.textContent =
            date.toLocaleString();
        }
      } catch (error) {
        // Ignore invalid timestamp.
      }
    }

    if (
      data.context &&
      reflectionContextSelect
    ) {
      reflectionContextSelect.value =
        data.context;
    }

    if (messagesContainer) {
      messagesContainer.innerHTML = "";

      currentChatHistory.forEach(
        (turn) => {
          appendMessageUI(
            turn.role === "user"
              ? "user"
              : "assistant",
            turn.text,
            turn.model || ""
          );
        }
      );
    }

    document
      .querySelectorAll(
        ".entry-item"
      )
      .forEach((item) => {
        item.classList.remove(
          "active"
        );
      });

    const activeElement =
      document.getElementById(
        `entry-${docId}`
      );

    if (activeElement) {
      activeElement.classList.add(
        "active"
      );
    }
  }

  // ==========================================================================
  // MESSAGE UI
  // ==========================================================================

  function appendMessageUI(
    role,
    text,
    model = ""
  ) {
    const isUser =
      role === "user";

    const bubble =
      document.createElement("div");

    bubble.className =
      `message-bubble ${
        isUser
          ? "user-message"
          : "assistant-message"
      }`;

    let formattedContent = "";

    if (isUser) {
      formattedContent =
        escapeHtml(text).replace(
          /\n/g,
          "<br>"
        );
    } else if (
      window.marked &&
      typeof window.marked.parse ===
        "function"
    ) {
      formattedContent =
        window.marked.parse(
          text || ""
        );
    } else {
      formattedContent =
        escapeHtml(text).replace(
          /\n/g,
          "<br>"
        );
    }

    bubble.innerHTML = `
      <div class="bubble-avatar ${
        isUser
          ? ""
          : "mindflow-message-avatar"
      }">

        ${
          isUser
            ? `
              <svg
                width="16"
                height="16"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M12 12c2.21 0 4-1.79
                  4-4s-1.79-4-4-4-4
                  1.79-4 4 1.79 4
                  4 4zm0 2c-2.67
                  0-8 1.34-8 4v2h16
                  v-2c0-2.66-5.33-4-8-4z"
                />
              </svg>
            `
            : "M"
        }

      </div>

      <div class="bubble-content">

        <div class="bubble-meta">

          <span class="bubble-author">
            ${
              isUser
                ? escapeHtml(
                    currentUser?.displayName ||
                      "You"
                  )
                : "MindFlow AI"
            }
          </span>

          <span class="bubble-tag">
            ${
              isUser
                ? "User Input"
                : "Get some clarity"
            }
          </span>

        </div>

        <div class="bubble-text">
          ${formattedContent}
        </div>

      </div>
    `;

    if (messagesContainer) {
      messagesContainer.appendChild(
        bubble
      );

      messagesContainer.scrollTop =
        messagesContainer.scrollHeight;
    }
  }

  // ==========================================================================
  // SEND MESSAGE
  // ==========================================================================

  async function sendMessage() {
    if (!messageInput) {
      return;
    }

    const text =
      messageInput.value.trim();

    if (!text) {
      return;
    }

    if (!currentUser) {
      showToast(
        "Please sign in with Google before chatting.",
        "error"
      );

      return;
    }

    if (!activeSessionId) {
      startNewSession();
    }

    appendMessageUI(
      "user",
      text
    );

    currentChatHistory.push({
      role: "user",
      text: text,
    });

    messageInput.value = "";

    updateCharCounter();

    // ------------------------------------------------------------------------
    // Loading message
    // ------------------------------------------------------------------------

    const loadingBubble =
      document.createElement("div");

    loadingBubble.className =
      "message-bubble assistant-message loading";

    loadingBubble.innerHTML = `
      <div class="bubble-avatar mindflow-message-avatar">
        M
      </div>

      <div class="bubble-content">

        <div class="bubble-meta">

          <span class="bubble-author">
            MindFlow AI
          </span>

          <span class="bubble-tag">
            Get some clarity
          </span>

        </div>

        <div class="bubble-text">
          Reflecting...
        </div>

      </div>
    `;

    if (messagesContainer) {
      messagesContainer.appendChild(
        loadingBubble
      );

      messagesContainer.scrollTop =
        messagesContainer.scrollHeight;
    }

    try {
      const token =
        await currentUser.getIdToken(
          true
        );

      if (!token) {
        throw new Error(
          "Authentication token unavailable."
        );
      }

      const storedKey =
        localStorage.getItem(
          "gemini_api_key"
        ) || "";

      const headers = {
        "Content-Type":
          "application/json",

        Authorization:
          `Bearer ${token}`,
      };

      if (storedKey) {
        headers[
          "x-gemini-api-key"
        ] = storedKey;
      }

      const historyForApi =
        currentChatHistory
          .slice(0, -1)
          .map((turn) => ({
            role: turn.role,
            text: turn.text,
            model: turn.model,
          }));

      const response =
        await fetch(
          "/api/chat",
          {
            method: "POST",

            headers: headers,

            body:
              JSON.stringify({
                message: text,

                history:
                  historyForApi,

                context:
                  reflectionContextSelect?.value ||
                  "",
              }),
          }
        );

      const data =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message ||
          data.error ||
          `Server responded with status ${response.status}`
        );
      }

      loadingBubble.remove();

      appendMessageUI(
        "assistant",
        data.reply,
        data.model
      );

      currentChatHistory.push({
        role: "model",
        text: data.reply,
        model: data.model,
      });

      messageInput.disabled =
        false;

      if (sendBtn) {
        sendBtn.disabled =
          false;
      }

      messageInput.focus();

      // ----------------------------------------------------------------------
      // Save through MVC backend
      // ----------------------------------------------------------------------

      persistInteractionToFirestore(
        text,
        data.reply,
        data.model
      ).catch((error) => {
        console.warn(
          "[MVC] Background save failed:",
          error
        );
      });

      // ----------------------------------------------------------------------
      // Analyze in background
      // ----------------------------------------------------------------------

      triggerSmartAnalysis(
        `${text}\n${data.reply}`
      );
    } catch (error) {
      console.error(
        "Message Error:",
        error
      );

      loadingBubble.remove();

      showToast(
        `Error: ${error.message}`,
        "error"
      );

      const errorMessage =
        `⚠️ <strong>Could not connect to the AI service.</strong><br><br>` +
        `Please try sending your message again.`;

      appendMessageUI(
        "assistant",
        errorMessage
      );
    } finally {
      messageInput.disabled =
        false;

      if (sendBtn) {
        sendBtn.disabled =
          false;
      }

      messageInput.focus();
    }
  }

  // ==========================================================================
  // SMART ANALYSIS
  // ==========================================================================

  async function triggerSmartAnalysis(
    fullText
  ) {
    if (
      !fullText ||
      fullText.length < 20
    ) {
      return;
    }

    if (!currentUser) {
      return;
    }

    try {
      const token =
        currentIdToken ||
        await currentUser.getIdToken();

      if (!token) {
        return;
      }

      const storedKey =
        localStorage.getItem(
          "gemini_api_key"
        ) || "";

      const headers = {
        "Content-Type":
          "application/json",

        Authorization:
          `Bearer ${token}`,
      };

      if (storedKey) {
        headers[
          "x-gemini-api-key"
        ] = storedKey;
      }

      const response =
        await fetch(
          "/api/analyze-sentiment",
          {
            method: "POST",

            headers: headers,

            body:
              JSON.stringify({
                content:
                  fullText,
              }),
          }
        );

      if (!response.ok) {
        return;
      }

      const data =
        await response.json();

      if (clarityScoreDisplay) {
        clarityScoreDisplay.textContent =
          data.clarityScore ||
          85;
      }

      if (sentimentLabel) {
        sentimentLabel.textContent =
          data.sentiment ||
          "Reflective";
      }

      if (energyLabel) {
        energyLabel.textContent =
          data.energyLevel ||
          "Balanced";
      }

      if (thematicTags) {
        thematicTags.innerHTML = "";

        (
          data.keyThemes ||
          []
        ).forEach((theme) => {
          const chip =
            document.createElement(
              "span"
            );

          chip.className =
            "theme-chip";

          chip.textContent =
            `#${theme}`;

          thematicTags.appendChild(
            chip
          );
        });
      }
    } catch (error) {
      console.warn(
        "Sentiment analysis skipped:",
        error
      );
    }
  }

  // ==========================================================================
  // SMART ACTION ITEMS
  // ==========================================================================

  async function synthesizeActionItems() {
    if (
      currentChatHistory.length ===
      0
    ) {
      showToast(
        "Write a reflection first before synthesizing actions.",
        "info"
      );

      return;
    }

    if (!currentUser) {
      showToast(
        "Please sign in first.",
        "error"
      );

      return;
    }

    if (synthesizeActionsBtn) {
      synthesizeActionsBtn.disabled =
        true;

      synthesizeActionsBtn.textContent =
        "Extracting...";
    }

    const fullContent =
      currentChatHistory
        .map(
          (item) =>
            `${item.role}: ${item.text}`
        )
        .join("\n\n");

    try {
      const token =
        currentIdToken ||
        await currentUser.getIdToken();

      if (!token) {
        throw new Error(
          "Authentication token unavailable."
        );
      }

      const storedKey =
        localStorage.getItem(
          "gemini_api_key"
        ) || "";

      const headers = {
        "Content-Type":
          "application/json",

        Authorization:
          `Bearer ${token}`,
      };

      if (storedKey) {
        headers[
          "x-gemini-api-key"
        ] = storedKey;
      }

      const response =
        await fetch(
          "/api/synthesize-actions",
          {
            method: "POST",

            headers: headers,

            body:
              JSON.stringify({
                content:
                  fullContent,
              }),
          }
        );

      if (!response.ok) {
        const data =
          await response
            .json()
            .catch(() => ({}));

        throw new Error(
          data.message ||
          data.error ||
          "Synthesis service unavailable."
        );
      }

      const data =
        await response.json();

      renderActionItems(
        data.actions || []
      );

      showToast(
        "SMART Action items synthesized!",
        "success"
      );
    } catch (error) {
      showToast(
        `Synthesis Error: ${error.message}`,
        "error"
      );
    } finally {
      if (synthesizeActionsBtn) {
        synthesizeActionsBtn.disabled =
          false;

        synthesizeActionsBtn.textContent =
          "⚡ Synthesize";
      }
    }
  }

  function renderActionItems(
    actions
  ) {
    if (!actionsList) {
      return;
    }

    actionsList.innerHTML = "";

    if (
      !Array.isArray(actions) ||
      !actions.length
    ) {
      actionsList.innerHTML = `
        <div class="empty-state">
          No direct action items identified.
        </div>
      `;

      return;
    }

    actions.forEach((action) => {
      const card =
        document.createElement(
          "div"
        );

      card.className =
        "action-item-card";

      const priority =
        action.priority ||
        "Medium";

      const priorityClass =
        String(priority)
          .toLowerCase();

      card.innerHTML = `
        <div class="action-item-top">

          <strong style="color:#fff;">
            ${escapeHtml(
              action.title ||
                "Action item"
            )}
          </strong>

          <span class="action-tag tag-${escapeHtml(
            priorityClass
          )}">
            ${escapeHtml(
              priority
            )}
          </span>

        </div>

        <div class="action-step">
          Next Step:
          ${escapeHtml(
            action.nextStep ||
              "Review plan"
          )}
        </div>
      `;

      actionsList.appendChild(
        card
      );
    });
  }

  // ==========================================================================
  // VOICE DICTATION
  // ==========================================================================

  function setupVoiceDictation() {
    if (!voiceDictationBtn) {
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      voiceDictationBtn.style.display =
        "none";

      return;
    }

    speechRecognition =
      new SpeechRecognition();

    speechRecognition.continuous =
      true;

    speechRecognition.interimResults =
      true;

    speechRecognition.onresult =
      (event) => {
        if (!messageInput) {
          return;
        }

        for (
          let i =
            event.resultIndex;
          i <
          event.results.length;
          i++
        ) {
          if (
            event.results[i]
              .isFinal
          ) {
            messageInput.value +=
              event.results[i][0]
                .transcript +
              " ";
          }
        }

        updateCharCounter();
      };

    speechRecognition.onerror =
      (event) => {
        console.warn(
          "Speech recognition error:",
          event.error
        );

        stopRecording();
      };

    speechRecognition.onend =
      () => {
        if (isRecordingVoice) {
          isRecordingVoice =
            false;

          voiceDictationBtn.classList.remove(
            "recording"
          );

          if (voiceStatusText) {
            voiceStatusText.textContent =
              "Dictate";
          }
        }
      };

    voiceDictationBtn.addEventListener(
      "click",
      () => {
        if (isRecordingVoice) {
          stopRecording();
        } else {
          startRecording();
        }
      }
    );
  }

  function startRecording() {
    if (
      !speechRecognition
    ) {
      return;
    }

    try {
      speechRecognition.start();

      isRecordingVoice =
        true;

      voiceDictationBtn.classList.add(
        "recording"
      );

      if (voiceStatusText) {
        voiceStatusText.textContent =
          "Listening...";
      }
    } catch (error) {
      console.warn(
        "Could not start voice recognition:",
        error
      );
    }
  }

  function stopRecording() {
    if (
      !speechRecognition
    ) {
      return;
    }

    try {
      speechRecognition.stop();
    } catch (error) {
      // Ignore stop errors.
    }

    isRecordingVoice =
      false;

    voiceDictationBtn.classList.remove(
      "recording"
    );

    if (voiceStatusText) {
      voiceStatusText.textContent =
        "Dictate";
    }
  }

  // ==========================================================================
  // EXPORT
  // ==========================================================================

  function exportMarkdown() {
    if (
      !currentChatHistory.length
    ) {
      showToast(
        "No journal entries to export.",
        "info"
      );

      return;
    }

    let markdown =
      "# MindFlow AI Reflection\n\n";

    markdown +=
      `**Date:** ${new Date().toLocaleString()}\n`;

    markdown +=
      `**Focus:** ${
        reflectionContextSelect?.value ||
        ""
      }\n\n`;

    markdown +=
      "---\n\n";

    currentChatHistory.forEach(
      (turn) => {
        const speaker =
          turn.role === "user"
            ? "### 👤 You"
            : "### M MindFlow AI";

        markdown +=
          `${speaker}\n\n${turn.text}\n\n`;
      }
    );

    const blob =
      new Blob(
        [markdown],
        {
          type:
            "text/markdown;charset=utf-8",
        }
      );

    const url =
      URL.createObjectURL(
        blob
      );

    const link =
      document.createElement(
        "a"
      );

    link.href = url;

    link.download =
      `mindflow-reflection-${Date.now()}.md`;

    document.body.appendChild(
      link
    );

    link.click();

    document.body.removeChild(
      link
    );

    URL.revokeObjectURL(url);

    showToast(
      "Reflection exported!",
      "success"
    );
  }

  // ==========================================================================
  // SIDEBAR
  // ==========================================================================

  const conversationSidebar =
    document.getElementById(
      "conversationSidebar"
    );

  const sidebarToggleBtn =
    document.getElementById(
      "sidebarToggleBtn"
    );

  const conversationSearchInput =
    document.getElementById(
      "conversationSearchInput"
    );

  if (
    sidebarToggleBtn &&
    conversationSidebar
  ) {
    sidebarToggleBtn.addEventListener(
      "click",
      () => {
        conversationSidebar.classList.toggle(
          "collapsed"
        );

        const collapsed =
          conversationSidebar.classList.contains(
            "collapsed"
          );

        sidebarToggleBtn.title =
          collapsed
            ? "Expand sidebar"
            : "Collapse sidebar";

        sidebarToggleBtn.setAttribute(
          "aria-label",
          collapsed
            ? "Expand sidebar"
            : "Collapse sidebar"
        );
      }
    );
  }

  // ==========================================================================
  // SEARCH REFLECTIONS
  // ==========================================================================

  if (
    conversationSearchInput
  ) {
    conversationSearchInput.addEventListener(
      "input",
      () => {
        const query =
          conversationSearchInput.value
            .trim()
            .toLowerCase();

        document
          .querySelectorAll(
            ".entry-item"
          )
          .forEach((item) => {
            const title =
              item.querySelector(
                ".entry-item-title"
              )?.textContent
                ?.toLowerCase() ||
              "";

            const preview =
              item.querySelector(
                ".entry-item-preview"
              )?.textContent
                ?.toLowerCase() ||
              "";

            const matches =
              !query ||
              title.includes(query) ||
              preview.includes(query);

            item.style.display =
              matches
                ? ""
                : "none";
          });
      }
    );
  }

  // ==========================================================================
  // QUICK PROMPTS
  // ==========================================================================

  document
    .querySelectorAll(
      ".quick-prompt-chip"
    )
    .forEach((chip) => {
      chip.addEventListener(
        "click",
        () => {
          if (!messageInput) {
            return;
          }

          messageInput.value =
            chip.getAttribute(
              "data-prompt"
            ) || "";

          updateCharCounter();

          messageInput.focus();
        }
      );
    });

  // ==========================================================================
  // CHARACTER COUNTER
  // ==========================================================================

  function updateCharCounter() {
    if (
      !messageInput ||
      !charCounter
    ) {
      return;
    }

    charCounter.textContent =
      `${messageInput.value.length} characters`;
  }

  // ==========================================================================
  // HTML ESCAPING
  // ==========================================================================

  function escapeHtml(str) {
    if (
      str === null ||
      str === undefined
    ) {
      return "";
    }

    return String(str)
      .replace(
        /&/g,
        "&amp;"
      )
      .replace(
        /</g,
        "&lt;"
      )
      .replace(
        />/g,
        "&gt;"
      )
      .replace(
        /"/g,
        "&quot;"
      )
      .replace(
        /'/g,
        "&#039;"
      );
  }

  // ==========================================================================
  // EVENT LISTENERS
  // ==========================================================================

  if (signInBtn) {
    signInBtn.addEventListener(
      "click",
      handleGoogleSignIn
    );
  }

  if (heroSignInBtn) {
    heroSignInBtn.addEventListener(
      "click",
      handleGoogleSignIn
    );
  }

  if (signOutBtn) {
    signOutBtn.addEventListener(
      "click",
      handleSignOut
    );
  }

  if (newEntryBtn) {
    newEntryBtn.addEventListener(
      "click",
      startNewSession
    );
  }

  if (sendBtn) {
    sendBtn.addEventListener(
      "click",
      sendMessage
    );
  }

  if (synthesizeActionsBtn) {
    synthesizeActionsBtn.addEventListener(
      "click",
      synthesizeActionItems
    );
  }

  if (analyzeToneBtn) {
    analyzeToneBtn.addEventListener(
      "click",
      () => {
        const fullText =
          currentChatHistory
            .map(
              (item) =>
                item.text
            )
            .join("\n");

        triggerSmartAnalysis(
          fullText
        );
      }
    );
  }

  if (exportMdBtn) {
    exportMdBtn.addEventListener(
      "click",
      exportMarkdown
    );
  }

  if (messageInput) {
    messageInput.addEventListener(
      "input",
      updateCharCounter
    );

    messageInput.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key === "Enter" &&
          !event.shiftKey
        ) {
          event.preventDefault();

          sendMessage();
        }
      }
    );
  }

  // ==========================================================================
  // CONFIGURATION MODAL
  // ==========================================================================

  const configModal =
    document.getElementById(
      "configModal"
    );

  const openApiKeyModalBtn =
    document.getElementById(
      "openApiKeyModalBtn"
    );

  const closeConfigModalBtn =
    document.getElementById(
      "closeConfigModalBtn"
    );

  const cancelConfigBtn =
    document.getElementById(
      "cancelConfigBtn"
    );

  const saveConfigBtn =
    document.getElementById(
      "saveConfigBtn"
    );

  const geminiApiKeyInput =
    document.getElementById(
      "geminiApiKeyInput"
    );

  const firebaseConfigInput =
    document.getElementById(
      "firebaseConfigInput"
    );

  function openConfigModal() {
    if (geminiApiKeyInput) {
      geminiApiKeyInput.value =
        localStorage.getItem(
          "gemini_api_key"
        ) || "";
    }

    if (configModal) {
      configModal.classList.remove(
        "hidden"
      );
    }
  }

  function closeConfigModal() {
    if (configModal) {
      configModal.classList.add(
        "hidden"
      );
    }
  }

  window.openApiKeyModal =
    openConfigModal;

  if (openApiKeyModalBtn) {
    openApiKeyModalBtn.addEventListener(
      "click",
      openConfigModal
    );
  }

  if (closeConfigModalBtn) {
    closeConfigModalBtn.addEventListener(
      "click",
      closeConfigModal
    );
  }

  if (cancelConfigBtn) {
    cancelConfigBtn.addEventListener(
      "click",
      closeConfigModal
    );
  }

  if (saveConfigBtn) {
    saveConfigBtn.addEventListener(
      "click",
      async () => {
        const apiKey =
          geminiApiKeyInput
            ? geminiApiKeyInput.value.trim()
            : "";

        if (apiKey) {
          localStorage.setItem(
            "gemini_api_key",
            apiKey
          );

          // Optional compatibility endpoint.
          // The actual AI requests are still handled by
          // the backend MVC service.
          fetch(
            "/api/set-key",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  key: apiKey,
                }),
            }
          ).catch(() => {});

          showToast(
            "AI configuration saved!",
            "success"
          );
        }

        const firebaseConfigText =
          firebaseConfigInput
            ? firebaseConfigInput.value.trim()
            : "";

        if (firebaseConfigText) {
          try {
            const config =
              JSON.parse(
                firebaseConfigText
              );

            localStorage.setItem(
              "custom_firebase_config",
              JSON.stringify(
                config
              )
            );

            showToast(
              "Firebase configuration saved. Reloading...",
              "success"
            );

            setTimeout(
              () => {
                window.location.reload();
              },
              1000
            );

            return;
          } catch (error) {
            showToast(
              "Invalid Firebase configuration JSON.",
              "error"
            );

            return;
          }
        }

        closeConfigModal();
      }
    );
  }

  // ==========================================================================
  // START APPLICATION
  // ==========================================================================

  initializeFirebase();

  setupVoiceDictation();

  updateCharCounter();

})();