const MAX_CLIPS = 100;

// ===== Track last focused editable element =====
let lastFocusedEl = null;
let lastSelectionStart = 0;
let lastSelectionEnd = 0;
let lastRange = null;

document.addEventListener("focusin", (e) => {
  const el = e.target;
  if (
    el.tagName === "INPUT" ||
    el.tagName === "TEXTAREA" ||
    el.isContentEditable
  ) {
    lastFocusedEl = el;
  }
}, true);

// Capture selection/cursor right before popup steals focus
document.addEventListener("blur", (e) => {
  const el = e.target;
  if (el !== lastFocusedEl) return;
  if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
    lastSelectionStart = el.selectionStart ?? el.value.length;
    lastSelectionEnd = el.selectionEnd ?? el.value.length;
  } else if (el.isContentEditable) {
    const sel = document.getSelection();
    if (sel && sel.rangeCount > 0) {
      lastRange = sel.getRangeAt(0).cloneRange();
    }
  }
}, true);

// Handle paste request from popup
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== "PASTE_TEXT") return;
  const text = msg.text;
  const el = lastFocusedEl;

  if (!el) {
    sendResponse({ success: false, reason: "no-target" });
    return;
  }

  if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
    el.focus();
    el.setRangeText(text, lastSelectionStart, lastSelectionEnd, "end");
    el.dispatchEvent(new Event("input", { bubbles: true }));
    sendResponse({ success: true });
    return;
  }

  if (el.isContentEditable) {
    el.focus();
    if (lastRange) {
      const sel = document.getSelection();
      sel.removeAllRanges();
      sel.addRange(lastRange);
    }
    document.execCommand("insertText", false, text);
    sendResponse({ success: true });
    return;
  }

  sendResponse({ success: false, reason: "not-editable" });
});

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
