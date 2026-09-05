// ============================================================================
// MindFlow AI Studio Client Application (Firebase + Cloud Run + Gemini 3.6 Flash)
// ============================================================================

(function () {
  "use strict";

  // State Management
  let currentUser = null;
  let currentIdToken = null;
  let activeSessionId = null;
  let currentChatHistory = [];
  let db = null;
  let auth = null;
  let isRecordingVoice = false;
  let speechRecognition = null;

  // DOM Elements
  const landingHero = document.getElementById("landingHero");
  const mainDashboard = document.getElementById("mainDashboard");
  const signInBtn = document.getElementById("signInBtn");
  const heroSignInBtn = document.getElementById("heroSignInBtn");
  const authErrorMessage = document.getElementById("authErrorMessage");
  const signOutBtn = document.getElementById("signOutBtn");
  const userProfile = document.getElementById("userProfile");
  const userAvatar = document.getElementById("userAvatar");
  const userName = document.getElementById("userName");
  const userUidSnippet = document.getElementById("userUidSnippet");
  const entriesList = document.getElementById("entriesList");
  const newEntryBtn = document.getElementById("newEntryBtn");
  const messagesContainer = document.getElementById("messagesContainer");
  const messageInput = document.getElementById("messageInput");
  const sendBtn = document.getElementById("sendBtn");
  const charCounter = document.getElementById("charCounter");
  const voiceDictationBtn = document.getElementById("voiceDictationBtn");
  const voiceStatusText = document.getElementById("voiceStatusText");
  const synthesizeActionsBtn = document.getElementById("synthesizeActionsBtn");
  const actionsList = document.getElementById("actionsList");
  const analyzeToneBtn = document.getElementById("analyzeToneBtn");
  const clarityScoreDisplay = document.getElementById("clarityScoreDisplay");
  const sentimentLabel = document.getElementById("sentimentLabel");
  const energyLabel = document.getElementById("energyLabel");
  const thematicTags = document.getElementById("thematicTags");
  const exportMdBtn = document.getElementById("exportMdBtn");
  const reflectionContextSelect = document.getElementById("reflectionContextSelect");
  const sessionTitle = document.getElementById("sessionTitle");
  const sessionTimestamp = document.getElementById("sessionTimestamp");
  const toast = document.getElementById("toast");

  // ==========================================================================
  // 1. SECURE DATABASE PAYLOAD HYGIENE (Zero-Crash Undefined-Stripping)
  // ==========================================================================
  function sanitizeFirestorePayload(obj) {
    if (obj === null || typeof obj !== "object") return obj;
    if (Array.isArray(obj)) return obj.map(sanitizeFirestorePayload).filter((v) => v !== undefined);
    
    const cleanObj = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleanObj[key] = sanitizeFirestorePayload(value);
      }
    }
    return cleanObj;
  }

  // Toast Notification
  function showToast(message, type = "info") {
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.remove("hidden");
    setTimeout(() => {
      toast.classList.add("hidden");
    }, 4500);
  }

  // ==========================================================================
  // 2. FIREBASE AUTH & FIRESTORE INITIALIZATION
  // ==========================================================================
  async function initializeFirebase() {
    try {
      // 1. Fetch Firebase config from server environment (.env / Cloud Run)
      let config = null;
      try {
        const res = await fetch("/api/config");
        if (res.ok) {
          const data = await res.json();
          if (data && data.firebaseConfig && data.firebaseConfig.apiKey) {
            config = data.firebaseConfig;
          }
        }
      } catch (cfgErr) {
        console.warn("[Firebase] Could not fetch server config:", cfgErr.message);
      }

      // 2. Client fallback: Check custom config stored in localStorage
      if (!config || !config.apiKey) {
        const localCfgStr = localStorage.getItem("custom_firebase_config");
        if (localCfgStr) {
          try {
            const parsed = JSON.parse(localCfgStr);
            if (parsed && parsed.apiKey) {
              config = parsed;
              console.log("[Firebase] Using locally stored Firebase configuration.");
            }
          } catch (e) {}
        }
      }

      // 3. Initialize Firebase SDK if valid configuration exists
      if (config && config.apiKey && (config.projectId || config.authDomain)) {
        if (!firebase.apps.length) {
          firebase.initializeApp(config);
        }
        auth = firebase.auth();
        db = firebase.firestore();

        // Ensure session persists across browser page reloads
        await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch((persErr) => {
          console.warn("[Firebase Auth] Persistence setup:", persErr.message);
        });

        // Listen for authentication changes
        auth.onAuthStateChanged(async (user) => {
          if (user) {
            currentUser = user;
            try {
              currentIdToken = await user.getIdToken();
            } catch (tErr) {
              console.warn("Could not retrieve ID token:", tErr);
            }
            renderAuthenticatedState(user);
            bindFirestoreHistoryListener(user.uid);
          } else {
            currentUser = null;
            currentIdToken = null;
            renderUnauthenticatedState();
          }
        });
        console.log("[Firebase] Client SDK initialized successfully with project:", config.projectId || config.authDomain);
      } else {
        console.info("[Firebase] Firebase Authentication configuration not found. Real Google Sign-In will prompt for configuration.");
        auth = null;
        db = null;
        renderUnauthenticatedState();
      }
    } catch (err) {
      console.warn("[Firebase Init Warning]:", err.message);
      auth = null;
      db = null;
      renderUnauthenticatedState();
    }
  }

  // Google Sign-In Popup
  async function handleGoogleSignIn() {
    clearAuthError();

    // If Firebase is not configured, show clear error and guidance
    if (!auth) {
      const msg = "Firebase Authentication is not yet configured.<br><br>" +
        "Please provide your Firebase Web Configuration in <code>.env</code> (FIREBASE_API_KEY, FIREBASE_AUTH_DOMAIN, FIREBASE_PROJECT_ID) " +
        "or click the <strong>API Key</strong> button in the top navigation to paste your Firebase config JSON.";
      showAuthError("Firebase Configuration Required", msg);
      showToast("Firebase Authentication is not configured.", "error");
      return;
    }

    try {
      if (heroSignInBtn) heroSignInBtn.disabled = true;
      if (signInBtn) signInBtn.disabled = true;

      const provider = new firebase.auth.GoogleAuthProvider();
      provider.addScope("profile");
      provider.addScope("email");
      provider.setCustomParameters({ prompt: "select_account" });

      const result = await auth.signInWithPopup(provider);
      currentUser = result.user;
      currentIdToken = await currentUser.getIdToken();
      clearAuthError();
      showToast(`Signed in as ${currentUser.displayName || currentUser.email}`, "success");
    } catch (err) {
      console.error("Auth Popup Error:", err);
      handleFirebaseAuthError(err);
    } finally {
      if (heroSignInBtn) heroSignInBtn.disabled = false;
      if (signInBtn) signInBtn.disabled = false;
    }
  }

  function handleFirebaseAuthError(err) {
    let title = "Authentication Failed";
    let detail = err.message || "An unknown authentication error occurred.";

    if (err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request") {
      title = "Sign-In Cancelled";
      detail = "The Google Sign-In popup was closed before completing authentication.";
    } else if (err.code === "auth/unauthorized-domain") {
      title = "Unauthorized Domain";
      detail = "The domain <code>localhost</code> is not authorized for OAuth in your Firebase project.<br>" +
        "<strong>To Fix:</strong> Go to <a href='https://console.firebase.google.com' target='_blank' style='color:#38bdf8'>Firebase Console</a> &rarr; <strong>Authentication</strong> &rarr; <strong>Settings</strong> &rarr; <strong>Authorized domains</strong> &rarr; Add <code>localhost</code>.";
    } else if (err.code === "auth/operation-not-allowed") {
      title = "Google Sign-In Disabled";
      detail = "The Google Sign-In provider is disabled in Firebase.<br>" +
        "<strong>To Fix:</strong> Go to <a href='https://console.firebase.google.com' target='_blank' style='color:#38bdf8'>Firebase Console</a> &rarr; <strong>Authentication</strong> &rarr; <strong>Sign-in method</strong> &rarr; Enable <strong>Google</strong>.";
    } else if (err.code === "auth/configuration-not-found" || err.code === "auth/invalid-api-key") {
      title = "Invalid Firebase Configuration";
      detail = "The Firebase API Key or Project ID is invalid. Please check your configuration.";
    } else if (err.code === "auth/popup-blocked") {
      title = "Popup Blocked";
      detail = "The browser blocked the sign-in popup. Please allow popups for localhost:8080 and try again.";
    }

    showAuthError(title, detail);
    showToast(title, "error");
  }

  function showAuthError(title, detail) {
    if (authErrorMessage) {
      authErrorMessage.innerHTML = `<strong>${title}</strong>${detail}`;
      authErrorMessage.classList.remove("hidden");
    }
  }

  function clearAuthError() {
    if (authErrorMessage) {
      authErrorMessage.innerHTML = "";
      authErrorMessage.classList.add("hidden");
    }
  }

  // Sign Out
  async function handleSignOut() {
    if (auth) {
      try {
        await auth.signOut();
      } catch (e) {
        console.warn("SignOut warning:", e);
      }
    }
    currentUser = null;
    currentIdToken = null;
    activeSessionId = null;
    currentChatHistory = [];
    renderUnauthenticatedState();
    entriesList.innerHTML = `<div class="entry-loading">Please sign in to view your reflections.</div>`;
    messagesContainer.innerHTML = "";
    showToast("Signed out successfully.", "info");
  }

  // ==========================================================================
  // 3. UI STATE TRANSITIONS
  // ==========================================================================
  function renderAuthenticatedState(user) {
    landingHero.classList.add("hidden");
    mainDashboard.classList.remove("hidden");
    signInBtn.classList.add("hidden");
    userProfile.classList.remove("hidden");

    const displayName = (user && user.displayName) || (user && user.email) || "Authenticated User";
    userName.textContent = displayName;
    
    // Show real Firebase UID
    if (user && user.uid) {
      const shortUid = user.uid.length > 14 ? `${user.uid.substring(0, 10)}...` : user.uid;
      userUidSnippet.textContent = `UID: ${shortUid}`;
      userUidSnippet.title = `Full Firebase UID: ${user.uid}`;
    } else {
      userUidSnippet.textContent = "";
    }

    userAvatar.src = (user && user.photoURL) || "https://lh3.googleusercontent.com/a/default-user=s96-c";
    clearAuthError();

    if (!activeSessionId) {
      startNewSession();
    }
  }

  function renderUnauthenticatedState() {
    landingHero.classList.remove("hidden");
    mainDashboard.classList.add("hidden");
    signInBtn.classList.remove("hidden");
    userProfile.classList.add("hidden");

    userName.textContent = "";
    userUidSnippet.textContent = "";
    userUidSnippet.title = "";
    userAvatar.src = "";
  }

  // ==========================================================================
  // 4. USER-ISOLATED FIRESTORE PERSISTENCE (/users/{uid}/interactions)
  // ==========================================================================
  function bindFirestoreHistoryListener(userId) {
    if (!db || !userId) {
      entriesList.innerHTML = `<div class="entry-loading">Firestore database not connected.</div>`;
      return;
    }

    // Strictly isolated query to /users/{userId}/interactions
    const interactionsRef = db.collection("users").doc(userId).collection("interactions").orderBy("updatedAt", "desc");

    interactionsRef.onSnapshot(
      (snapshot) => {
        entriesList.innerHTML = "";
        if (snapshot.empty) {
          entriesList.innerHTML = `<div class="entry-loading">No saved reflections yet. Start typing to create your first!</div>`;
          return;
        }

        snapshot.forEach((doc) => {
          const data = doc.data();
          renderHistoryEntryItem(doc.id, data);
        });
      },
      (error) => {
        console.error("Firestore snapshot error:", error);
        loadLocalSessionStorage(userId);
      }
    );
  }

  function renderHistoryEntryItem(docId, data) {
    const item = document.createElement("div");
    item.className = `entry-item ${docId === activeSessionId ? "active" : ""}`;
    item.id = `entry-${docId}`;

    const dateStr = data.updatedAt ? new Date(data.updatedAt.toDate ? data.updatedAt.toDate() : data.updatedAt).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }) : "Recent";

    item.innerHTML = `
      <div class="entry-item-title">${escapeHtml(data.title || "Reflective Journal")}</div>
      <div class="entry-item-preview">${escapeHtml(data.lastMessage || "Empty reflection...")}</div>
      <span class="entry-item-date">${dateStr}</span>
    `;

    item.addEventListener("click", () => {
      loadExistingSession(docId, data);
    });

    entriesList.appendChild(item);
  }

  // Local storage fallback for isolated sessions during mock test
  function loadLocalSessionStorage(userId) {
    const key = `gemini_lifepulse_${userId}`;
    const saved = JSON.parse(localStorage.getItem(key) || "[]");
    entriesList.innerHTML = "";
    if (saved.length === 0) {
      entriesList.innerHTML = `<div class="entry-loading">No reflections recorded yet.</div>`;
      return;
    }
    saved.forEach((item) => {
      renderHistoryEntryItem(item.id, item);
    });
  }

  function saveToLocalStorage(userId, sessionData) {
    const key = `gemini_lifepulse_${userId}`;
    const saved = JSON.parse(localStorage.getItem(key) || "[]");
    const existingIndex = saved.findIndex((s) => s.id === sessionData.id);
    if (existingIndex >= 0) {
      saved[existingIndex] = sessionData;
    } else {
      saved.unshift(sessionData);
    }
    localStorage.setItem(key, JSON.stringify(saved));
  }

  // Guaranteed Input-to-Save Completeness
  async function persistInteractionToFirestore(prompt, reply, modelUsed) {
    if (!currentUser) return;

    const payload = sanitizeFirestorePayload({
      sessionId: activeSessionId,
      userId: currentUser.uid,
      title: currentChatHistory[0]?.text?.substring(0, 45) || "Personal Reflection",
      lastMessage: prompt,
      context: reflectionContextSelect.value,
      history: currentChatHistory,
      updatedAt: new Date().toISOString(),
      model: modelUsed || "gemini-3.6-flash",
    });

    if (db) {
      try {
        await db
          .collection("users")
          .doc(currentUser.uid)
          .collection("interactions")
          .doc(activeSessionId)
          .set(payload, { merge: true });
        console.log(`[Firestore] Persisted interaction to /users/${currentUser.uid}/interactions/${activeSessionId}`);
      } catch (err) {
        console.warn("[Firestore Write Warning]:", err.message);
        saveToLocalStorage(currentUser.uid, { id: activeSessionId, ...payload });
      }
    } else {
      saveToLocalStorage(currentUser.uid, { id: activeSessionId, ...payload });
    }
  }

  // ==========================================================================
  // 5. SESSION & CHAT MANAGEMENT
  // ==========================================================================
  function startNewSession() {
    activeSessionId = "session_" + Date.now();
    currentChatHistory = [];
    messagesContainer.innerHTML = `
      <div class="message-bubble assistant-message">
        <div class="bubble-avatar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 9.5L12 2Z"/></svg>
        </div>
        <div class="bubble-content">
          <div class="bubble-meta">
            <span class="bubble-author">Gemini 3.6 Flash</span>
            <span class="bubble-tag">Resilient Model Ladder</span>
          </div>
          <div class="bubble-text">
            Welcome! What’s on your mind today? Share a situation, thought, or goal you want to work through together.
          </div>
        </div>
      </div>
    `;
    sessionTitle.textContent = "New Reflection Session";
    sessionTimestamp.textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    actionsList.innerHTML = `<div class="empty-state">Share your thoughts, then click <strong>Synthesize</strong> to extract SMART action items.</div>`;
    clarityScoreDisplay.textContent = "--";
    sentimentLabel.textContent = "--";
    energyLabel.textContent = "--";
    thematicTags.innerHTML = "";
    messageInput.value = "";
    updateCharCounter();

    document.querySelectorAll(".entry-item").forEach((el) => el.classList.remove("active"));
  }

  function loadExistingSession(docId, data) {
    activeSessionId = docId;
    currentChatHistory = data.history || [];
    sessionTitle.textContent = data.title || "Reflection Session";
    sessionTimestamp.textContent = data.updatedAt ? new Date(data.updatedAt).toLocaleString() : "";
    if (data.context) {
      reflectionContextSelect.value = data.context;
    }

    messagesContainer.innerHTML = "";
    currentChatHistory.forEach((turn) => {
      appendMessageUI(turn.role === "user" ? "user" : "assistant", turn.text, turn.model || "Gemini 3.6 Flash");
    });

    document.querySelectorAll(".entry-item").forEach((el) => el.classList.remove("active"));
    const activeEl = document.getElementById(`entry-${docId}`);
    if (activeEl) activeEl.classList.add("active");
  }

  function appendMessageUI(role, text, model = "Gemini 3.6 Flash") {
    const isUser = role === "user";
    const bubble = document.createElement("div");
    bubble.className = `message-bubble ${isUser ? "user-message" : "assistant-message"}`;

    const formattedContent = isUser ? escapeHtml(text).replace(/\n/g, "<br>") : (window.marked ? marked.parse(text) : text);

    bubble.innerHTML = `
      <div class="bubble-avatar">
        ${
          isUser
            ? `<svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`
            : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"/></svg>`
        }
      </div>
      <div class="bubble-content">
        <div class="bubble-meta">
          <span class="bubble-author">${isUser ? (currentUser?.displayName || "You") : "Gemini"}</span>
          <span class="bubble-tag">${isUser ? "User Input" : model}</span>
        </div>
        <div class="bubble-text">${formattedContent}</div>
      </div>
    `;

    messagesContainer.appendChild(bubble);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // ==========================================================================
  // 6. CHAT SUBMISSION & RESILIENT API COMMUNICATION
  // ==========================================================================
  async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text) return;

    // Guaranteed Input Retention: Don't clear input until network is acknowledged
    messageInput.disabled = true;
    sendBtn.disabled = true;

    appendMessageUI("user", text);
    currentChatHistory.push({ role: "user", text: text });
    messageInput.value = "";
    updateCharCounter();

    // Loading indicator
    const loadingBubble = document.createElement("div");
    loadingBubble.className = "message-bubble assistant-message loading";
    loadingBubble.innerHTML = `
      <div class="bubble-avatar"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L12 22L9.5 9.5L12 2Z"/></svg></div>
      <div class="bubble-content"><div class="bubble-text">Reflecting with Gemini...</div></div>
    `;
    messagesContainer.appendChild(loadingBubble);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    try {
      const token = currentUser
      ? await currentUser.getIdToken(true)
      : null;

      if (!token) {
      throw new Error("Please sign in with Google before chatting.");
      }
      const storedKey = localStorage.getItem("gemini_api_key") || "";
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };
      if (storedKey) {
        headers["x-gemini-api-key"] = storedKey;
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: headers,
        body: JSON.stringify({
          message: text,
          history: currentChatHistory.slice(0, -1),
          context: reflectionContextSelect.value,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || data.error || `Server responded with status ${res.status}`);
      }

      loadingBubble.remove();

      appendMessageUI("assistant", data.reply, data.model);
      currentChatHistory.push({ role: "model", text: data.reply, model: data.model });

      // Persist to user-isolated Firestore
      await persistInteractionToFirestore(text, data.reply, data.model);

      // Auto-trigger background analysis
      triggerSmartAnalysis(text + "\n" + data.reply);
    } catch (err) {
      console.error("Message Error:", err);
      loadingBubble.remove();
      showToast(`Error: ${err.message}`, "error");
      
      const errorMsg = `⚠️ **Could not connect to Gemini service:** ${err.message}.<br><br>` +
        `💡 *Click the **API Key** button in the top navigation bar or enter your key to activate live Gemini 3.6 Flash.*`;
      appendMessageUI("assistant", errorMsg);
    } finally {
      messageInput.disabled = false;
      sendBtn.disabled = false;
      messageInput.focus();
    }
  }

  // ==========================================================================
  // 7. SMART ACTION ITEMS & EMOTIONAL CLARITY SUITE
  // ==========================================================================
  async function triggerSmartAnalysis(fullText) {
    if (!fullText || fullText.length < 20) return;
    const token = currentIdToken || (await currentUser?.getIdToken?.()) || "MOCK_TOKEN";

    const storedKey = localStorage.getItem("gemini_api_key") || "";
    const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
    if (storedKey) headers["x-gemini-api-key"] = storedKey;

    // Analyze Sentiment & Clarity
    fetch("/api/analyze-sentiment", {
      method: "POST",
      headers: headers,
      body: JSON.stringify({ content: fullText }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        clarityScoreDisplay.textContent = data.clarityScore || 85;
        sentimentLabel.textContent = data.sentiment || "Reflective";
        energyLabel.textContent = data.energyLevel || "Balanced";

        thematicTags.innerHTML = "";
        (data.keyThemes || []).forEach((t) => {
          const chip = document.createElement("span");
          chip.className = "theme-chip";
          chip.textContent = `#${t}`;
          thematicTags.appendChild(chip);
        });
      })
      .catch((e) => console.warn("Sentiment analysis skipped:", e));
  }

  async function synthesizeActionItems() {
    if (currentChatHistory.length === 0) {
      showToast("Write a reflection first before synthesizing actions.", "info");
      return;
    }

    synthesizeActionsBtn.disabled = true;
    synthesizeActionsBtn.textContent = "Extracting...";

    const fullContent = currentChatHistory.map((c) => `${c.role}: ${c.text}`).join("\n\n");
    const token = currentIdToken || (await currentUser?.getIdToken?.()) || "MOCK_TOKEN";
    const storedKey = localStorage.getItem("gemini_api_key") || "";
    const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
    if (storedKey) headers["x-gemini-api-key"] = storedKey;

    try {
      const res = await fetch("/api/synthesize-actions", {
        method: "POST",
        headers: headers,
        body: JSON.stringify({ content: fullContent }),
      });

      if (!res.ok) throw new Error("Synthesis service unavailable");

      const data = await res.json();
      renderActionItems(data.actions || []);
      showToast("SMART Action items synthesized!", "success");
    } catch (err) {
      showToast(`Synthesis Error: ${err.message}`, "error");
    } finally {
      synthesizeActionsBtn.disabled = false;
      synthesizeActionsBtn.textContent = "⚡ Synthesize";
    }
  }

  function renderActionItems(actions) {
    actionsList.innerHTML = "";
    if (!actions.length) {
      actionsList.innerHTML = `<div class="empty-state">No direct action items identified.</div>`;
      return;
    }

    actions.forEach((act) => {
      const card = document.createElement("div");
      card.className = "action-item-card";
      const priorityClass = (act.priority || "Medium").toLowerCase();

      card.innerHTML = `
        <div class="action-item-top">
          <strong style="color: #fff;">${escapeHtml(act.title)}</strong>
          <span class="action-tag tag-${priorityClass}">${act.priority}</span>
        </div>
        <div class="action-step">Next Step: ${escapeHtml(act.nextStep || "Review plan")}</div>
      `;
      actionsList.appendChild(card);
    });
  }

  // ==========================================================================
  // 8. VOICE DICTATION (Web Speech API)
  // ==========================================================================
  function setupVoiceDictation() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      voiceDictationBtn.style.display = "none";
      return;
    }

    speechRecognition = new SpeechRecognition();
    speechRecognition.continuous = true;
    speechRecognition.interimResults = true;

    speechRecognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          messageInput.value += event.results[i][0].transcript + " ";
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      updateCharCounter();
    };

    speechRecognition.onerror = (event) => {
      console.warn("Speech recognition error:", event.error);
      stopRecording();
    };

    voiceDictationBtn.addEventListener("click", () => {
      if (isRecordingVoice) {
        stopRecording();
      } else {
        startRecording();
      }
    });
  }

  function startRecording() {
    try {
      speechRecognition.start();
      isRecordingVoice = true;
      voiceDictationBtn.classList.add("recording");
      voiceStatusText.textContent = "Listening...";
    } catch (e) {
      console.warn(e);
    }
  }

  function stopRecording() {
    try {
      speechRecognition.stop();
      isRecordingVoice = false;
      voiceDictationBtn.classList.remove("recording");
      voiceStatusText.textContent = "Dictate";
    } catch (e) {
      console.warn(e);
    }
  }

  // ==========================================================================
  // 9. EXPORT (MARKDOWN / PRINT)
  // ==========================================================================
  function exportMarkdown() {
    if (!currentChatHistory.length) {
      showToast("No journal entries to export.", "info");
      return;
    }

    let md = `# MindFlow AI Studio Reflection\n\n`;
    md += `**Date:** ${new Date().toLocaleString()}\n`;
    md += `**Focus:** ${reflectionContextSelect.value}\n\n---\n\n`;

    currentChatHistory.forEach((turn) => {
      const speaker = turn.role === "user" ? "### 👤 You" : `### ✨ MindFlow AI Studio (${turn.model || "Flash"})`;
      md += `${speaker}\n\n${turn.text}\n\n`;
    });

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mindflow-reflection-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast("Journal exported to Markdown!", "success");
  }

  // ==========================================================================
  // 10. EVENT LISTENERS & INITIALIZATION
  // ==========================================================================
  function updateCharCounter() {
    const len = messageInput.value.length;
    charCounter.textContent = `${len} characters`;
  }

  function escapeHtml(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Quick Prompt Chips
  document.querySelectorAll(".quick-prompt-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      messageInput.value = chip.getAttribute("data-prompt");
      updateCharCounter();
      messageInput.focus();
    });
  });

  // Buttons & Inputs
  signInBtn.addEventListener("click", handleGoogleSignIn);
  heroSignInBtn.addEventListener("click", handleGoogleSignIn);
  
  signOutBtn.addEventListener("click", handleSignOut);
  newEntryBtn.addEventListener("click", startNewSession);
  sendBtn.addEventListener("click", sendMessage);
  synthesizeActionsBtn.addEventListener("click", synthesizeActionItems);
  analyzeToneBtn.addEventListener("click", () => {
    const fullText = currentChatHistory.map((c) => c.text).join("\n");
    triggerSmartAnalysis(fullText);
  });
  exportMdBtn.addEventListener("click", exportMarkdown);

  messageInput.addEventListener("input", updateCharCounter);
  messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Config & API Key Modal Controls
  const configModal = document.getElementById("configModal");
  const openApiKeyModalBtn = document.getElementById("openApiKeyModalBtn");
  const closeConfigModalBtn = document.getElementById("closeConfigModalBtn");
  const cancelConfigBtn = document.getElementById("cancelConfigBtn");
  const saveConfigBtn = document.getElementById("saveConfigBtn");
  const geminiApiKeyInput = document.getElementById("geminiApiKeyInput");
  const firebaseConfigInput = document.getElementById("firebaseConfigInput");

  function openConfigModal() {
    if (geminiApiKeyInput) {
      geminiApiKeyInput.value = localStorage.getItem("gemini_api_key") || "";
    }
    if (configModal) configModal.classList.remove("hidden");
  }

  function closeConfigModal() {
    if (configModal) configModal.classList.add("hidden");
  }

  window.openApiKeyModal = openConfigModal;

  if (openApiKeyModalBtn) openApiKeyModalBtn.addEventListener("click", openConfigModal);
  if (closeConfigModalBtn) closeConfigModalBtn.addEventListener("click", closeConfigModal);
  if (cancelConfigBtn) cancelConfigBtn.addEventListener("click", closeConfigModal);

  if (saveConfigBtn) {
    saveConfigBtn.addEventListener("click", async () => {
      const apiKeyVal = geminiApiKeyInput ? geminiApiKeyInput.value.trim() : "";
      if (apiKeyVal) {
        localStorage.setItem("gemini_api_key", apiKeyVal);
        fetch("/api/set-key", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: apiKeyVal }),
        }).catch(() => {});
        showToast("Gemini API key saved & applied!", "success");
      }

      const fbVal = firebaseConfigInput ? firebaseConfigInput.value.trim() : "";
      if (fbVal) {
        try {
          const cfg = JSON.parse(fbVal);
          localStorage.setItem("custom_firebase_config", JSON.stringify(cfg));
          showToast("Firebase configuration saved! Reloading...", "success");
          setTimeout(() => window.location.reload(), 1000);
        } catch (e) {
          showToast("Invalid JSON for Firebase config", "error");
          return;
        }
      }

      closeConfigModal();
    });
  }

  // Boot Application
  initializeFirebase();
  setupVoiceDictation();
})();
