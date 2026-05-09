const DEFAULT_MAX_CLIPS = 100;
const SYNC_CHUNK_SIZE = 6000; // bytes per chunk (under 8,192 sync limit)
let isSyncing = false;

async function getSettings() {
  return await chrome.storage.sync.get({ syncEnabled: false, maxClips: DEFAULT_MAX_CLIPS });
}

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

  // Cap at configured limit
  const { maxClips } = await getSettings();
  if (clips.length > maxClips) {
    clips.length = maxClips;
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

// Mark/unmark a clip as sensitive and apply configured expiry.
async function setClipSensitive(id, sensitive) {
  const clips = await getClips();
  const clip = clips.find((c) => c.id === id);
  if (!clip) return false;

  if (sensitive) {
    clip.sensitive = true;
    const { sensitiveExpiry = 5 } = await chrome.storage.local.get("sensitiveExpiry");
    if (sensitiveExpiry > 0) {
      clip.expiresAt = Date.now() + sensitiveExpiry * 60 * 1000;
    } else {
      delete clip.expiresAt;
    }
  } else {
    delete clip.sensitive;
    delete clip.expiresAt;
  }

  await chrome.storage.local.set({ clips });
  return true;
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

    case "SET_CLIP_SENSITIVE":
      setClipSensitive(message.id, message.sensitive !== false).then((success) =>
        sendResponse({ success })
      );
      return true;

    case "CLEAR_CLIPS":
      clearClips().then(() => sendResponse({ success: true }));
      return true;

    case "UPDATE_BADGE":
      updateBadge().then(() => sendResponse({ success: true }));
      return true;
  }
});

// ===== Sync helpers =====
async function syncClipsToSync(clips) {
  const { clips_meta = { chunks: 0 } } = await chrome.storage.sync.get("clips_meta");
  const oldKeys = [];
  for (let i = 0; i < clips_meta.chunks; i++) oldKeys.push(`clips_chunk_${i}`);
  if (oldKeys.length > 0) await chrome.storage.sync.remove(oldKeys);

  const chunks = [];
  let current = [];
  let size = 2;
  for (const clip of clips) {
    const s = JSON.stringify(clip).length + 1;
    if (size + s > SYNC_CHUNK_SIZE && current.length > 0) {
      chunks.push(current);
      current = [];
      size = 2;
    }
    current.push(clip);
    size += s;
  }
  if (current.length > 0) chunks.push(current);

  const data = { clips_meta: { chunks: chunks.length } };
  for (let i = 0; i < chunks.length; i++) data[`clips_chunk_${i}`] = chunks[i];
  try {
    await chrome.storage.sync.set(data);
  } catch (e) {
    console.warn("ClipHive: sync write failed", e.message);
  }
}

async function loadClipsFromSync() {
  const { clips_meta = { chunks: 0 } } = await chrome.storage.sync.get("clips_meta");
  if (clips_meta.chunks === 0) return [];
  const keys = [];
  for (let i = 0; i < clips_meta.chunks; i++) keys.push(`clips_chunk_${i}`);
  const data = await chrome.storage.sync.get(keys);
  const clips = [];
  for (let i = 0; i < clips_meta.chunks; i++) {
    if (data[`clips_chunk_${i}`]) clips.push(...data[`clips_chunk_${i}`]);
  }
  return clips;
}

async function clearSyncChunks() {
  const { clips_meta = { chunks: 0 } } = await chrome.storage.sync.get("clips_meta");
  const keys = ["clips_meta"];
  for (let i = 0; i < clips_meta.chunks; i++) keys.push(`clips_chunk_${i}`);
  await chrome.storage.sync.remove(keys);
}

async function mergeFromSync() {
  if (isSyncing) return;
  isSyncing = true;
  try {
    const { syncEnabled } = await getSettings();
    if (!syncEnabled) return;
    const syncClips = await loadClipsFromSync();
    if (syncClips.length === 0) return;

    const localClips = await getClips();
    const localIds = new Set(localClips.map((c) => c.id));
    let merged = [...localClips];
    for (const clip of syncClips) {
      if (!localIds.has(clip.id)) merged.push(clip);
    }
    merged.sort((a, b) => b.timestamp - a.timestamp);
    const { maxClips } = await getSettings();
    if (merged.length > maxClips) merged.length = maxClips;

    await chrome.storage.local.set({ clips: merged });
    await updateBadge();
  } finally {
    isSyncing = false;
  }
}

// Update badge & sync whenever storage changes
chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area === "local") {
    if (changes.clips) {
      updateBadge();
      if (!isSyncing) {
        isSyncing = true;
        try {
          const { syncEnabled } = await getSettings();
          if (syncEnabled) await syncClipsToSync(changes.clips.newValue || []);
        } finally {
          isSyncing = false;
        }
      }
    }
    if (changes.addressBarPolling) {
      if (changes.addressBarPolling.newValue) ensureOffscreenDocument();
      else closeOffscreenDocument();
    }
  }
  if (area === "sync") {
    const hasClipChanges = Object.keys(changes).some(
      (k) => k.startsWith("clips_chunk") || k === "clips_meta"
    );
    if (hasClipChanges) mergeFromSync();
    if (changes.syncEnabled) {
      if (changes.syncEnabled.newValue) {
        const clips = await getClips();
        isSyncing = true;
        try { await syncClipsToSync(clips); } finally { isSyncing = false; }
      } else {
        await clearSyncChunks();
      }
    }
    if (changes.maxClips) {
      const maxClips = changes.maxClips.newValue || DEFAULT_MAX_CLIPS;
      const clips = await getClips();
      if (clips.length > maxClips) {
        clips.length = maxClips;
        await chrome.storage.local.set({ clips });
      }
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
mergeFromSync();
