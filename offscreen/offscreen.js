// Polls the clipboard for changes and reports new content to the service worker.
// Constants shared with utils/constants.js
const POLL_INTERVAL = 1500; // ms
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

let lastText = "";
let intervalId = null;

/**
 * Check if text matches sensitive content patterns.
 * @param {string} text - The text to check
 * @returns {boolean} True if text matches a sensitive pattern
 */
function isSensitive(text) {
  return SENSITIVE_PATTERNS.some((p) => p.test(text));
}

async function poll() {
  try {
    const text = await navigator.clipboard.readText();
    if (text && text !== lastText) {
      lastText = text;
      chrome.runtime.sendMessage({ type: "NEW_CLIP", text, sourceUrl: "" }).catch((err) => {
        console.warn('[ClipHive] Offscreen: send message failed:', err.message);
      });
    }
  } catch (err) {
    console.warn('[ClipHive] Clipboard read failed:', err.message);
    clearInterval(intervalId);
  }
}

// Seed lastText without saving (avoids re-saving existing clipboard on startup)
navigator.clipboard.readText().then((text) => { lastText = text; }).catch((err) => {
  console.warn('[ClipHive] Offscreen: initial clipboard read failed:', err.message);
});
intervalId = setInterval(poll, POLL_INTERVAL);
