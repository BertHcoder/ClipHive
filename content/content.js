const MAX_CLIPS = 100;

// ===== Sensitive content detection =====
const SENSITIVE_PATTERNS = [
  /gh[pousr]_[A-Za-z0-9_]{36,}/,
  /github_pat_[A-Za-z0-9_]{22,}/,
  /glpat-[A-Za-z0-9\-_]{20,}/,
  /AKIA[0-9A-Z]{16}/,
  /npm_[A-Za-z0-9]{36,}/,
  /xox[bposatr]-[A-Za-z0-9\-]{10,}/,
  /sk_(?:live|test)_[A-Za-z0-9]{20,}/,
  /pk_(?:live|test)_[A-Za-z0-9]{20,}/,
  /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
  /-----BEGIN (?:RSA |DSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /(?:api[_-]?key|api[_-]?secret|access[_-]?token|secret[_-]?key|private[_-]?key|auth[_-]?token)\s*[:=]\s*\S{10,}/i,
  /Bearer\s+[A-Za-z0-9\-._~+\/]{20,}=*/i,
  /(?:password|pwd)\s*=\s*[^\s;]{8,}/i,
];

function isSensitive(text) {
  return SENSITIVE_PATTERNS.some((p) => p.test(text));
}

// ===== Track last focused editable element =====
let lastFocusedEl = null;
let lastSelectionStart = 0;
let lastSelectionEnd = 0;
let lastRange = null;

function isEditable(el) {
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable;
}

document.addEventListener("focusin", (e) => {
  const el = e.target;
  if (isEditable(el)) {
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
  const html = msg.html;
  const useRich = msg.useRich && html;
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
    if (useRich) {
      // Insert HTML content
      document.execCommand("insertHTML", false, html);
    } else {
      document.execCommand("insertText", false, text);
    }
    sendResponse({ success: true });
    return;
  }

  sendResponse({ success: false, reason: "not-editable" });
});

// Auto-copy on text selection (mouseup)
document.addEventListener("mouseup", () => {
  chrome.storage.local.get(["autoCopy", "paused"]).then(({ autoCopy = false, paused = false }) => {
    if (!autoCopy || paused) return;
    const selection = document.getSelection();
    if (!selection) return;
    const text = selection.toString();
    if (!text?.trim()) return;

    // Copy to clipboard
    navigator.clipboard.writeText(text).catch(() => {});

    // Capture HTML content if available
    let html = "";
    if (selection.rangeCount > 0) {
      const container = document.createElement("div");
      for (let i = 0; i < selection.rangeCount; i++) {
        container.appendChild(selection.getRangeAt(i).cloneContents());
      }
      const rawHtml = container.innerHTML;
      if (rawHtml && rawHtml !== text && rawHtml.includes("<")) {
        html = rawHtml;
      }
    }

    // Store the clip
    chrome.storage.local.get(["clips", "sensitiveDetection", "sensitiveExpiry"]).then(({ clips = [], sensitiveDetection = true, sensitiveExpiry = 5 }) => {
      if (clips.length > 0 && clips[0].text === text) return;
      const sensitive = sensitiveDetection && isSensitive(text);
      const clip = {
        id: crypto.randomUUID(),
        text,
        html: html || undefined,
        timestamp: Date.now(),
        sourceUrl: location.href,
        sensitive: sensitive || undefined
      };
      if (sensitive && sensitiveExpiry > 0) {
        clip.expiresAt = Date.now() + sensitiveExpiry * 60 * 1000;
      }
      clips.unshift(clip);
      if (clips.length > MAX_CLIPS) clips.length = MAX_CLIPS;
      chrome.storage.local.set({ clips }).then(() => {
        chrome.runtime.sendMessage({ type: "UPDATE_BADGE" }).catch(() => {});
      });
    });
  });
});

// Listen for copy events on the page and store directly
document.addEventListener("copy", () => {
  const selection = document.getSelection();
  if (!selection) return;

  const text = selection.toString();
  if (!text?.trim()) return;

  // Capture HTML content if available
  let html = "";
  if (selection.rangeCount > 0) {
    const container = document.createElement("div");
    for (let i = 0; i < selection.rangeCount; i++) {
      container.appendChild(selection.getRangeAt(i).cloneContents());
    }
    const rawHtml = container.innerHTML;
    // Only store HTML if it differs meaningfully from plain text
    if (rawHtml && rawHtml !== text && rawHtml.includes("<")) {
      html = rawHtml;
    }
  }

  // Store directly in chrome.storage.local (avoids service worker lifecycle issues)
  chrome.storage.local.get(["clips", "paused", "sensitiveDetection", "sensitiveExpiry"]).then(({ clips = [], paused = false, sensitiveDetection = true, sensitiveExpiry = 5 }) => {
    if (paused) return;
    // Skip exact duplicate of most recent clip
    if (clips.length > 0 && clips[0].text === text) return;

    const sensitive = sensitiveDetection && isSensitive(text);
    const clip = {
      id: crypto.randomUUID(),
      text,
      html: html || undefined,
      timestamp: Date.now(),
      sourceUrl: location.href,
      sensitive: sensitive || undefined
    };

    if (sensitive && sensitiveExpiry > 0) {
      clip.expiresAt = Date.now() + sensitiveExpiry * 60 * 1000;
    }

    clips.unshift(clip);
    if (clips.length > MAX_CLIPS) clips.length = MAX_CLIPS;

    chrome.storage.local.set({ clips }).then(() => {
      // Notify background to update badge (fire-and-forget)
      chrome.runtime.sendMessage({ type: "UPDATE_BADGE" }).catch(() => {});
    });
  });
});
