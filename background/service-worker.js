const MAX_CLIPS = 100;

// ===== Sensitive content detection =====
const SENSITIVE_PATTERNS = [
  /gh[pousr]_[A-Za-z0-9_]{36,}/,                    // GitHub PATs
  /github_pat_[A-Za-z0-9_]{22,}/,                    // GitHub fine-grained PATs
  /glpat-[A-Za-z0-9\-_]{20,}/,                       // GitLab PATs
  /AKIA[0-9A-Z]{16}/,                                // AWS access key IDs
  /npm_[A-Za-z0-9]{36,}/,                            // npm tokens
  /xox[bposatr]-[A-Za-z0-9\-]{10,}/,                 // Slack tokens
  /sk_(?:live|test)_[A-Za-z0-9]{20,}/,               // Stripe secret keys
  /pk_(?:live|test)_[A-Za-z0-9]{20,}/,               // Stripe publishable keys
  /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, // JWTs
  /-----BEGIN (?:RSA |DSA |EC |OPENSSH )?PRIVATE KEY-----/,             // SSH/PEM keys
  /(?:api[_-]?key|api[_-]?secret|access[_-]?token|secret[_-]?key|private[_-]?key|auth[_-]?token)\s*[:=]\s*\S{10,}/i,
  /Bearer\s+[A-Za-z0-9\-._~+\/]{20,}=*/i,           // Bearer tokens
  /(?:password|pwd)\s*=\s*[^\s;]{8,}/i,              // Connection string passwords
];

function isSensitive(text) {
  return SENSITIVE_PATTERNS.some((p) => p.test(text));
}

async function getClips() {
  const { clips = [] } = await chrome.storage.local.get("clips");
  return clips;
}

// Update badge with current clip count
async function updateBadge() {
  const clips = await getClips();
  const count = clips.length;
  const text = count === 0 ? "" : count > 99 ? "99+" : String(count);
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color: "#F5A623" });
  chrome.action.setBadgeTextColor({ color: "#FFFFFF" });
}

// Save a new clip
async function saveClip(text, sourceUrl) {
  if (!text?.trim()) return;

  const { paused = false } = await chrome.storage.local.get("paused");
  if (paused) return;

  const clips = await getClips();

  // Avoid storing exact duplicates back-to-back
  if (clips.length > 0 && clips[0].text === text) return;

  const { sensitiveDetection = true } = await chrome.storage.local.get("sensitiveDetection");
  const sensitive = sensitiveDetection && isSensitive(text);

  const clip = {
    id: crypto.randomUUID(),
    text,
    timestamp: Date.now(),
    sourceUrl: sourceUrl || "",
    sensitive: sensitive || undefined
  };

  // Set auto-expiry for sensitive clips
  if (sensitive) {
    const { sensitiveExpiry = 5 } = await chrome.storage.local.get("sensitiveExpiry");
    if (sensitiveExpiry > 0) {
      clip.expiresAt = Date.now() + sensitiveExpiry * 60 * 1000;
    }
  }

  clips.unshift(clip);

  // Cap at MAX_CLIPS
  if (clips.length > MAX_CLIPS) {
    clips.length = MAX_CLIPS;
  }

  await chrome.storage.local.set({ clips });
  await updateBadge();
}

// Delete a single clip
async function deleteClip(id) {
  const clips = await getClips();
  const filtered = clips.filter((c) => c.id !== id);
  await chrome.storage.local.set({ clips: filtered });
  await updateBadge();
}

// Toggle pin on a clip
async function togglePin(id) {
  const clips = await getClips();
  const clip = clips.find((c) => c.id === id);
  if (clip) {
    clip.pinned = !clip.pinned;
    await chrome.storage.local.set({ clips });
  }
}

// Clear all clips
async function clearClips() {
  await chrome.storage.local.set({ clips: [] });
  await updateBadge();
}

// Message handler
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {
    case "NEW_CLIP":
      saveClip(message.text, message.sourceUrl).then(() =>
        sendResponse({ success: true })
      );
      return true; // async response

    case "GET_CLIPS":
      chrome.storage.local.get("clips").then(({ clips = [] }) =>
        sendResponse({ clips })
      );
      return true;

    case "DELETE_CLIP":
      deleteClip(message.id).then(() => sendResponse({ success: true }));
      return true;

    case "TOGGLE_PIN":
      togglePin(message.id).then(() => sendResponse({ success: true }));
      return true;

    case "CLEAR_CLIPS":
      clearClips().then(() => sendResponse({ success: true }));
      return true;

    case "UPDATE_BADGE":
      updateBadge().then(() => sendResponse({ success: true }));
      return true;
  }
});

// Also update badge whenever storage changes (catches content script direct writes)
chrome.storage.onChanged.addListener((changes) => {
  if (changes.clips) updateBadge();
  if (changes.addressBarPolling) {
    if (changes.addressBarPolling.newValue) {
      ensureOffscreenDocument();
    } else {
      closeOffscreenDocument();
    }
  }
});

// ===== Offscreen document for clipboard polling =====
async function ensureOffscreenDocument() {
  const { addressBarPolling = false } = await chrome.storage.local.get("addressBarPolling");
  if (!addressBarPolling) return;

  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [chrome.runtime.getURL("offscreen/offscreen.html")]
  });
  if (existingContexts.length > 0) return;

  await chrome.offscreen.createDocument({
    url: "offscreen/offscreen.html",
    reasons: ["CLIPBOARD"],
    justification: "Poll clipboard for changes from browser UI (e.g. address bar)"
  });
}

async function closeOffscreenDocument() {
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [chrome.runtime.getURL("offscreen/offscreen.html")]
  });
  if (existingContexts.length === 0) return;
  await chrome.offscreen.closeDocument();
}

ensureOffscreenDocument();

// ===== Sensitive clip auto-expiry =====
async function cleanupExpiredClips() {
  const clips = await getClips();
  const now = Date.now();
  const unexpired = clips.filter((c) => !c.expiresAt || c.expiresAt > now);
  if (unexpired.length < clips.length) {
    await chrome.storage.local.set({ clips: unexpired });
    await updateBadge();
  }
}

chrome.alarms.create("sensitive-expiry-cleanup", { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "sensitive-expiry-cleanup") {
    cleanupExpiredClips();
  }
});
cleanupExpiredClips();

// Set badge on install/startup
updateBadge();
