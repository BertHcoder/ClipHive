const MAX_CLIPS = 100;

// Listen for copy events on the page and store directly
document.addEventListener("copy", () => {
  const selection = document.getSelection();
  if (!selection) return;

  const text = selection.toString();
  if (!text || !text.trim()) return;

  // Store directly in chrome.storage.local (avoids service worker lifecycle issues)
  chrome.storage.local.get("clips").then(({ clips = [] }) => {
    // Skip exact duplicate of most recent clip
    if (clips.length > 0 && clips[0].text === text) return;

    const clip = {
      id: crypto.randomUUID(),
      text: text,
      timestamp: Date.now(),
      sourceUrl: location.href
    };

    clips.unshift(clip);
    if (clips.length > MAX_CLIPS) clips.length = MAX_CLIPS;

    chrome.storage.local.set({ clips }).then(() => {
      // Notify background to update badge (fire-and-forget)
      chrome.runtime.sendMessage({ type: "UPDATE_BADGE" }).catch(() => {});
    });
  });
});
