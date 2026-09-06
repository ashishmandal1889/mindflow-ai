// MindFlow AI — Client Application

(function () {
  "use strict";

  let currentUser = null;
  let activeSessionId = null;
  let currentChatHistory = [];
  let auth = null;

  let isRecordingVoice = false;
  let speechRecognition = null;

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
    document.getElementById(
      "reflectionContextSelect"
    );

  const sessionTitle =
    document.getElementById("sessionTitle");

  const sessionTimestamp =
    document.getElementById("sessionTimestamp");

  const toast =
    document.getElementById("toast");

  /* Show a temporary notification */
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

  /* Initialize Firebase Authentication */
  async function initializeFirebase() {
    try {
      let config = null;

      try {
        const response =
          await fetch("/api/config");

        if (response.ok) {
          const data =
            await response.json();

          if (
            data?.firebaseConfig?.apiKey
          ) {
            config = data.firebaseConfig;
          }
        }
      } catch (error) {
        console.warn(
          "[Firebase] Could not fetch server config."
        );
      }

      if (!config?.apiKey) {
        const savedConfig =
          localStorage.getItem(
            "custom_firebase_config"
          );

        if (savedConfig) {
          try {
            const parsed =
              JSON.parse(savedConfig);

            if (parsed?.apiKey) {
              config = parsed;
            }
          } catch (error) {
            console.warn(
              "[Firebase] Invalid saved configuration."
            );
          }
        }
      }

      if (
        config?.apiKey &&
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
          .catch(() => {});

        auth.onAuthStateChanged(
          async (user) => {
            if (user) {
              currentUser = user;

              try {
                await user.getIdToken();
              } catch (error) {
                console.warn(
                  "[Firebase Auth] Token unavailable."
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
              activeSessionId = null;
              currentChatHistory = [];

              renderUnauthenticatedState();
            }
          }
        );

        console.log(
          "[Firebase] Initialized:",
          config.projectId ||
            "configured"
        );
      } else {
        auth = null;
        renderUnauthenticatedState();
      }
    } catch (error) {
      console.warn(
        "[Firebase] Initialization failed."
      );

      auth = null;
      renderUnauthenticatedState();
    }
  }

  /* Sign the user in with Google */
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

      clearAuthError();

      showToast(
        `Signed in as ${
          currentUser.displayName ||
          currentUser.email ||
          "User"
        }`,
        "success"
      );
    } catch (error) {
      console.error(
        "[Google Sign-In] Failed:",
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

  /* Convert Firebase authentication errors into user-friendly messages */
  function handleFirebaseAuthError(error) {
    let title = "Authentication Failed";

    let detail =
      error?.message ||
      "An unknown authentication error occurred.";

    if (
      error?.code ===
        "auth/popup-closed-by-user" ||
      error?.code ===
        "auth/cancelled-popup-request"
    ) {
      title = "Sign-In Cancelled";

      detail =
        "The Google Sign-In popup was closed before authentication completed.";
    } else if (
      error?.code ===
      "auth/unauthorized-domain"
    ) {
      title = "Unauthorized Domain";

      detail =
        `This domain (${window.location.hostname}) is not authorized in Firebase.`;
    } else if (
      error?.code ===
      "auth/operation-not-allowed"
    ) {
      title = "Google Sign-In Disabled";

      detail =
        "Google Sign-In is not enabled in your Firebase Authentication settings.";
    } else if (
      error?.code ===
        "auth/invalid-api-key" ||
      error?.code ===
        "auth/configuration-not-found"
    ) {
      title =
        "Invalid Firebase Configuration";

      detail =
        "Please check your Firebase Web configuration.";
    } else if (
      error?.code ===
      "auth/popup-blocked"
    ) {
      title = "Popup Blocked";

      detail =
        "Your browser blocked the Google Sign-In popup. Allow popups and try again.";
    }

    showAuthError(title, detail);
    showToast(title, "error");
  }

  /* Display an authentication error */
  function showAuthError(title, detail) {
    if (!authErrorMessage) {
      return;
    }

    authErrorMessage.innerHTML =
      `<strong>${escapeHtml(
        title
      )}</strong> ${escapeHtml(detail)}`;

    authErrorMessage.classList.remove(
      "hidden"
    );
  }

  /* Hide the authentication error */
  function clearAuthError() {
    if (!authErrorMessage) {
      return;
    }

    authErrorMessage.innerHTML = "";
    authErrorMessage.classList.add(
      "hidden"
    );
  }

  /* Sign the current user out */
  async function handleSignOut() {
    if (auth) {
      try {
        await auth.signOut();
      } catch (error) {
        console.warn(
          "[Firebase Auth] Sign out failed."
        );
      }
    }

    currentUser = null;
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

  /* Display the authenticated dashboard */
  function renderAuthenticatedState(user) {
    landingHero?.classList.add("hidden");
    mainDashboard?.classList.remove("hidden");
    signInBtn?.classList.add("hidden");
    userProfile?.classList.remove("hidden");

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

  /* Display the unauthenticated landing page */
  function renderUnauthenticatedState() {
    landingHero?.classList.remove(
      "hidden"
    );

    mainDashboard?.classList.add(
      "hidden"
    );

    signInBtn?.classList.remove(
      "hidden"
    );

    userProfile?.classList.add(
      "hidden"
    );

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

  /* Get a fresh Firebase authentication token */
  async function getAuthToken(
    forceRefresh = false
  ) {
    if (!currentUser) {
      throw new Error(
        "User authentication is required."
      );
    }

    const token =
      await currentUser.getIdToken(
        forceRefresh
      );

    if (!token) {
      throw new Error(
        "Authentication token unavailable."
      );
    }

    return token;
  }

  /* Send an authenticated request to the backend */
  async function authenticatedFetch(
    url,
    options = {}
  ) {
    let token =
      await getAuthToken(false);

    const requestOptions = {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization:
          `Bearer ${token}`,
      },
    };

    let response =
      await fetch(
        url,
        requestOptions
      );

    if (
      response.status === 401 &&
      currentUser
    ) {
      token =
        await getAuthToken(true);

      response =
        await fetch(url, {
          ...options,
          headers: {
            ...(options.headers || {}),
            Authorization:
              `Bearer ${token}`,
          },
        });
    }

    return response;
  }

  /* Parse a backend response */
  async function parseApiResponse(
    response
  ) {
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

    return data;
  }

  /* Load saved reflections for the authenticated user */
  async function bindFirestoreHistoryListener(
    userId
  ) {
    if (!userId || !currentUser) {
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
      const response =
        await authenticatedFetch(
          "/api/interactions"
        );

      const data =
        await parseApiResponse(
          response
        );

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
        loadLocalSessionStorage(
          userId
        );

        if (
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
    } catch (error) {
      console.error(
        "[History] Could not load reflections:",
        error
      );

      loadLocalSessionStorage(
        userId
      );

      if (
        entriesList &&
        !entriesList.querySelector(
          ".entry-item"
        )
      ) {
        entriesList.innerHTML = `
          <div class="entry-loading">
            Could not load cloud reflections.
            Local reflections are shown when available.
          </div>
        `;
      }
    }
  }

  /* Render one saved reflection in the sidebar */
  function renderHistoryEntryItem(
    docId,
    data
  ) {
    if (!entriesList || !docId) {
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
          typeof data.updatedAt
            ?.toDate === "function"
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

    item.addEventListener(
      "click",
      () => {
        loadExistingSession(
          docId,
          data
        );
      }
    );

    const deleteBtn =
      item.querySelector(
        ".entry-delete-btn"
      );

    deleteBtn?.addEventListener(
      "click",
      (event) => {
        event.stopPropagation();
        deleteReflection(docId);
      }
    );

    entriesList.appendChild(item);
  }

  /* Delete a saved reflection */
  /* Delete a saved reflection */
async function deleteReflection(docId) {
  if (!currentUser || !docId) {
    showToast(
      "Please sign in before deleting a reflection.",
      "error"
    );
    return;
  }

  const confirmed = window.confirm(
    "Delete this reflection?\n\nThis cannot be undone."
  );

  if (!confirmed) {
    return;
  }

  const entryElement = document.getElementById(
    `entry-${docId}`
  );

  const deleteButton = entryElement?.querySelector(
    ".entry-delete-btn"
  );

  if (deleteButton) {
    deleteButton.disabled = true;
  }

  try {
    const response = await authenticatedFetch(
      `/api/interactions/${encodeURIComponent(docId)}`,
      {
        method: "DELETE",
      }
    );

    if (response.status === 404) {
      removeLocalReflection(docId);

      entryElement?.remove();

      if (
        entriesList &&
        !entriesList.querySelector(".entry-item")
      ) {
        entriesList.innerHTML = `
          <div class="entry-loading">
            No saved reflections yet.
          </div>
        `;
      }

      if (activeSessionId === docId) {
        startNewSession();
      }

      showToast(
        "Reflection deleted successfully.",
        "success"
      );

      return;
    }

    await parseApiResponse(response);

    removeLocalReflection(docId);

    entryElement?.remove();

    if (activeSessionId === docId) {
      startNewSession();
    }

    if (
      entriesList &&
      !entriesList.querySelector(".entry-item")
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
      "[History] Delete reflection failed:",
      error
    );

    if (deleteButton) {
      deleteButton.disabled = false;
    }

    showToast(
      getUserFriendlyApiError(error),
      "error"
    );
  }
}
  /* Save a reflection to local storage */
  function saveToLocalStorage(
    userId,
    sessionData
  ) {
    if (
      !userId ||
      !sessionData?.id
    ) {
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

      if (!Array.isArray(saved)) {
        saved = [];
      }
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

  /* Remove one locally cached reflection */
  function removeLocalReflection(
    docId
  ) {
    if (
      !currentUser?.uid ||
      !docId
    ) {
      return;
    }

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
        Array.isArray(saved)
          ? saved.filter(
              (item) =>
                item.id !==
                docId
            )
          : [];

      localStorage.setItem(
        key,
        JSON.stringify(updated)
      );
    } catch (error) {
      console.warn(
        "[LocalStorage] Could not remove reflection."
      );
    }
  }

  /* Save the current reflection through the backend */
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

      lastMessage: prompt,

      context:
        reflectionContextSelect?.value ||
        "",

      history:
        currentChatHistory,

      model:
        modelUsed || "",
    };

    try {
      const response =
        await authenticatedFetch(
          "/api/interactions",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify(payload),
          }
        );

      await parseApiResponse(
        response
      );

      await bindFirestoreHistoryListener(
        currentUser.uid
      );
    } catch (error) {
      console.error(
        "[History] Reflection save failed:",
        error
      );

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

  /* Start a new reflection session */
  function startNewSession() {
    activeSessionId =
      `session_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 8)}`;

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

    messageInput?.focus();
  }

  /* Open a previously saved reflection */
  function loadExistingSession(
    docId,
    data
  ) {
    if (!docId) {
      return;
    }

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
          typeof data.updatedAt
            ?.toDate === "function"
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
        sessionTimestamp.textContent =
          "Recent reflection";
      }
    }

    if (
      data.context &&
      reflectionContextSelect
    ) {
      const matchingOption =
        Array.from(
          reflectionContextSelect.options
        ).find(
          (option) =>
            option.value ===
            data.context
        );

      if (matchingOption) {
        reflectionContextSelect.value =
          data.context;
      }
    }

    if (messagesContainer) {
      messagesContainer.innerHTML =
        "";

      currentChatHistory.forEach(
        (turn) => {
          appendMessageUI(
            turn.role === "user"
              ? "user"
              : "assistant",
            turn.text || "",
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

    document
      .getElementById(
        `entry-${docId}`
      )
      ?.classList.add("active");

    triggerSmartAnalysis(
      currentChatHistory
        .map(
          (item) =>
            item.text || ""
        )
        .join("\n")
    );
  }

  /* Render a chat message */
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
      const markdownHtml =
        window.marked.parse(
          text || "",
          {
            breaks: true,
          }
        );

      if (
        window.DOMPurify &&
        typeof window.DOMPurify.sanitize ===
          "function"
      ) {
        formattedContent =
          window.DOMPurify.sanitize(
            markdownHtml
          );
      } else {
        formattedContent =
          escapeHtml(
            text
          ).replace(
            /\n/g,
            "<br>"
          );
      }
    } else {
      formattedContent =
        escapeHtml(
          text
        ).replace(
          /\n/g,
          "<br>"
        );
    }

    const safeModel =
      escapeHtml(model);

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

          ${
            !isUser && safeModel
              ? `
                <span class="bubble-tag">
                  ${safeModel}
                </span>
              `
              : ""
          }
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

      requestAnimationFrame(() => {
        messagesContainer.scrollTop =
          messagesContainer.scrollHeight;
      });
    }
  }

  /* Send a reflection to the AI backend */
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
      text,
    });

    messageInput.value = "";

    updateCharCounter();

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

    messagesContainer?.appendChild(
      loadingBubble
    );

    if (messagesContainer) {
      messagesContainer.scrollTop =
        messagesContainer.scrollHeight;
    }

    messageInput.disabled = true;

    if (sendBtn) {
      sendBtn.disabled = true;
    }

    try {
      const historyForApi =
        currentChatHistory
          .slice(0, -1)
          .slice(-10)
          .map((turn) => ({
            role: turn.role,
            text: turn.text,
            model: turn.model || "",
          }));

      const response =
        await authenticatedFetch(
          "/api/chat",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
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
        await parseApiResponse(
          response
        );

      if (!data.reply) {
        throw new Error(
          "The AI service returned an empty response."
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
        model:
          data.model || "",
      });

      if (sessionTitle) {
        sessionTitle.textContent =
          currentChatHistory[0]?.text?.substring(
            0,
            45
          ) ||
          "Reflection Session";
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

      await persistInteractionToFirestore(
        text,
        data.reply,
        data.model
      );

      triggerSmartAnalysis(
        `${text}\n${data.reply}`
      );
    } catch (error) {
      console.error(
        "[Chat] Message failed:",
        error
      );

      loadingBubble.remove();

      showToast(
        getUserFriendlyApiError(
          error
        ),
        "error"
      );

      appendMessageUI(
        "assistant",
        "⚠️ **I couldn't complete that response.**\n\nPlease try sending your message again."
      );
    } finally {
      messageInput.disabled =
        false;

      messageInput.focus();

      if (sendBtn) {
        sendBtn.disabled =
          false;
      }
    }
  }

  /* Analyze sentiment and clarity through the backend */
  async function triggerSmartAnalysis(
    fullText
  ) {
    if (
      !fullText ||
      fullText.length < 20 ||
      !currentUser
    ) {
      return;
    }

    try {
      const response =
        await authenticatedFetch(
          "/api/analyze-sentiment",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                content:
                  fullText,
              }),
          }
        );

      const data =
        await parseApiResponse(
          response
        );

      if (clarityScoreDisplay) {
        clarityScoreDisplay.textContent =
          data.clarityScore ??
          "--";
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
        thematicTags.innerHTML =
          "";

        (
          Array.isArray(
            data.keyThemes
          )
            ? data.keyThemes
            : []
        ).forEach((theme) => {
          if (!theme) {
            return;
          }

          const chip =
            document.createElement(
              "span"
            );

          chip.className =
            "theme-chip";

          chip.textContent =
            `#${String(theme)
              .replace(/^#+/, "")
              .trim()}`;

          thematicTags.appendChild(
            chip
          );
        });
      }
    } catch (error) {
      console.warn(
        "[Sentiment] Analysis skipped."
      );
    }
  }

  /* Generate SMART action items through the backend */
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
      const response =
        await authenticatedFetch(
          "/api/synthesize-actions",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                content:
                  fullContent,
              }),
          }
        );

      const data =
        await parseApiResponse(
          response
        );

      renderActionItems(
        data.actions || []
      );

      showToast(
        data.simulated
          ? "Local fallback actions generated."
          : "SMART Action items synthesized!",
        "success"
      );
    } catch (error) {
      console.error(
        "[SMART Actions] Failed:",
        error
      );

      showToast(
        getUserFriendlyApiError(
          error
        ),
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

  /* Render generated SMART action items */
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
        action?.priority ||
        "Medium";

      const priorityClass =
        String(priority)
          .toLowerCase()
          .replace(
            /[^a-z0-9_-]/g,
            ""
          );

      card.innerHTML = `
        <div class="action-item-top">
          <strong style="color:#fff;">
            ${escapeHtml(
              action?.title ||
                "Action item"
            )}
          </strong>

          <span
            class="action-tag tag-${escapeHtml(
              priorityClass
            )}"
          >
            ${escapeHtml(
              priority
            )}
          </span>
        </div>

        <div class="action-step">
          Next Step:
          ${escapeHtml(
            action?.nextStep ||
              "Review plan"
          )}
        </div>
      `;

      actionsList.appendChild(
        card
      );
    });
  }

  /* Initialize browser speech recognition */
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

    speechRecognition.lang =
      navigator.language ||
      "en-US";

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
      () => {
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

  /* Start voice dictation */
  function startRecording() {
    if (!speechRecognition) {
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
        "[Voice] Could not start recognition."
      );
    }
  }

  /* Stop voice dictation */
  function stopRecording() {
    if (!speechRecognition) {
      return;
    }

    try {
      speechRecognition.stop();
    } catch (error) {
      console.warn(
        "[Voice] Stop warning."
      );
    }

    isRecordingVoice =
      false;

    voiceDictationBtn?.classList.remove(
      "recording"
    );

    if (voiceStatusText) {
      voiceStatusText.textContent =
        "Dictate";
    }
  }

  /* Export the current reflection as Markdown */
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
            : "### ✨ MindFlow AI";

        markdown +=
          `${speaker}\n\n${
            turn.text || ""
          }\n\n`;
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
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

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

  /* Toggle the desktop sidebar */
  sidebarToggleBtn?.addEventListener(
    "click",
    () => {
      conversationSidebar?.classList.toggle(
        "collapsed"
      );

      const collapsed =
        conversationSidebar?.classList.contains(
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

  /* Filter saved reflections by search text */
  conversationSearchInput?.addEventListener(
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
            matches ? "" : "none";
        });
    }
  );

  /* Insert a quick prompt into the message input */
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

  /* Update the message character count */
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

  /* Escape user-controlled text before inserting it into HTML */
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

  /* Convert backend errors into clear user-facing messages */
  function getUserFriendlyApiError(
    error
  ) {
    const message =
      error?.message || "";

    const lowerMessage =
      message.toLowerCase();

    if (
      message.includes("401") ||
      lowerMessage.includes(
        "authentication"
      ) ||
      lowerMessage.includes(
        "unauthorized"
      )
    ) {
      return "Your session may have expired. Please sign in again.";
    }

    if (
      message.includes("429")
    ) {
      return "The AI service is temporarily busy. Please try again in a moment.";
    }

    if (
      message.includes("500") ||
      message.includes("502") ||
      message.includes("503")
    ) {
      return "The AI service is temporarily unavailable. Please try again.";
    }

    if (
      lowerMessage.includes(
        "fetch failed"
      ) ||
      lowerMessage.includes(
        "network"
      )
    ) {
      return "Could not reach the AI service. Please check your connection and try again.";
    }

    return "Could not connect to the AI service. Please try again.";
  }

  signInBtn?.addEventListener(
    "click",
    handleGoogleSignIn
  );

  heroSignInBtn?.addEventListener(
    "click",
    handleGoogleSignIn
  );

  signOutBtn?.addEventListener(
    "click",
    handleSignOut
  );

  newEntryBtn?.addEventListener(
    "click",
    startNewSession
  );

  sendBtn?.addEventListener(
    "click",
    sendMessage
  );

  synthesizeActionsBtn?.addEventListener(
    "click",
    synthesizeActionItems
  );

  analyzeToneBtn?.addEventListener(
    "click",
    () => {
      const fullText =
        currentChatHistory
          .map(
            (item) =>
              item.text || ""
          )
          .join("\n");

      triggerSmartAnalysis(
        fullText
      );
    }
  );

  exportMdBtn?.addEventListener(
    "click",
    exportMarkdown
  );

  messageInput?.addEventListener(
    "input",
    updateCharCounter
  );

  messageInput?.addEventListener(
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

  const firebaseConfigInput =
    document.getElementById(
      "firebaseConfigInput"
    );

  /* Open the Firebase configuration modal */
  function openConfigModal() {
    if (firebaseConfigInput) {
      firebaseConfigInput.value =
        localStorage.getItem(
          "custom_firebase_config"
        ) || "";
    }

    configModal?.classList.remove(
      "hidden"
    );
  }

  /* Close the Firebase configuration modal */
  function closeConfigModal() {
    configModal?.classList.add(
      "hidden"
    );
  }

  window.openApiKeyModal =
    openConfigModal;

  openApiKeyModalBtn?.addEventListener(
    "click",
    openConfigModal
  );

  closeConfigModalBtn?.addEventListener(
    "click",
    closeConfigModal
  );

  cancelConfigBtn?.addEventListener(
    "click",
    closeConfigModal
  );

  saveConfigBtn?.addEventListener(
    "click",
    () => {
      const firebaseConfigText =
        firebaseConfigInput
          ?.value.trim() || "";

      if (!firebaseConfigText) {
        closeConfigModal();
        return;
      }

      try {
        const config =
          JSON.parse(
            firebaseConfigText
          );

        if (
          !config ||
          !config.apiKey
        ) {
          throw new Error(
            "Firebase API key is required."
          );
        }

        localStorage.setItem(
          "custom_firebase_config",
          JSON.stringify(config)
        );

        showToast(
          "Firebase configuration saved. Reloading...",
          "success"
        );

        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } catch (error) {
        showToast(
          "Invalid Firebase configuration JSON.",
          "error"
        );
      }
    }
  );

  initializeFirebase();
  setupVoiceDictation();
  updateCharCounter();
})();

document.addEventListener(
  "DOMContentLoaded",
  () => {
    const mobileMenuBtn =
      document.getElementById(
        "mobileMenuBtn"
      );

    const mobileSidebarClose =
      document.getElementById(
        "mobileSidebarClose"
      );

    const sidebarOverlay =
      document.getElementById(
        "sidebarOverlay"
      );

    const conversationSidebar =
      document.getElementById(
        "conversationSidebar"
      );

    /* Open mobile sidebar */
    function openMobileSidebar() {
      conversationSidebar?.classList.add(
        "mobile-open"
      );

      sidebarOverlay?.classList.add(
        "active"
      );

      document.body.classList.add(
        "sidebar-open"
      );
    }

    /* Close mobile sidebar */
    function closeMobileSidebar() {
      conversationSidebar?.classList.remove(
        "mobile-open"
      );

      sidebarOverlay?.classList.remove(
        "active"
      );

      document.body.classList.remove(
        "sidebar-open"
      );
    }

    /* Open sidebar from the mobile menu */
    mobileMenuBtn?.addEventListener(
      "click",
      (event) => {
        event.stopPropagation();
        openMobileSidebar();
      }
    );

    /* Close sidebar from the close button */
    mobileSidebarClose?.addEventListener(
      "click",
      closeMobileSidebar
    );

    /* Close sidebar by clicking the overlay */
    sidebarOverlay?.addEventListener(
      "click",
      closeMobileSidebar
    );

    /* Close sidebar with the Escape key */
    document.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key === "Escape"
        ) {
          closeMobileSidebar();
        }
      }
    );

    /* Close sidebar after selecting an item */
    conversationSidebar?.addEventListener(
      "click",
      (event) => {
        const clickedElement =
          event.target.closest(
            "button, a, .conversation-entry, .entry-item"
          );

        if (!clickedElement) {
          return;
        }

        if (
          clickedElement.classList.contains(
            "entry-delete-btn"
          )
        ) {
          return;
        }

        if (
          clickedElement.id ===
          "sidebarToggleBtn"
        ) {
          return;
        }

        closeMobileSidebar();
      }
    );

    /* Close mobile sidebar when switching to desktop */
    window.addEventListener(
      "resize",
      () => {
        if (
          window.innerWidth > 900
        ) {
          closeMobileSidebar();
        }
      }
    );
  }
);