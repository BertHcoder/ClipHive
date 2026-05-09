const MAX_CLIPS = 100;

// Update badge with current clip count
async function updateBadge() {
  const { clips = [] } = await chrome.storage.local.get("clips");
  const text = clips.length > 0 ? String(clips.length) : "";
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color: "#F5A623" });
}

// Save a new clip
async function saveClip(text, sourceUrl) {
  if (!text || !text.trim()) return;

  const { clips = [] } = await chrome.storage.local.get("clips");

  // Avoid storing exact duplicates back-to-back
  if (clips.length > 0 && clips[0].text === text) return;

  const clip = {
    id: crypto.randomUUID(),
    text: text,
    timestamp: Date.now(),
    sourceUrl: sourceUrl || ""
  };

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
  const { clips = [] } = await chrome.storage.local.get("clips");
  const filtered = clips.filter((c) => c.id !== id);
  await chrome.storage.local.set({ clips: filtered });
  await updateBadge();
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

    case "CLEAR_CLIPS":
      clearClips().then(() => sendResponse({ success: true }));
      return true;
  }
});

// Set badge on install/startup
updateBadge();
