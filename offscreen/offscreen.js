// Polls the clipboard for changes and reports new content to the service worker.
let lastText = "";
let intervalId = null;

const POLL_INTERVAL = 1500; // ms

async function poll() {
  try {
    const text = await navigator.clipboard.readText();
    if (text && text !== lastText) {
      lastText = text;
      chrome.runtime.sendMessage({ type: "NEW_CLIP", text, sourceUrl: "" });
    }
  } catch {
    // Clipboard read failed; stop polling
    clearInterval(intervalId);
  }
}

// Seed lastText without saving (avoids re-saving existing clipboard on startup)
navigator.clipboard.readText().then((text) => { lastText = text; }).catch(() => {});
intervalId = setInterval(poll, POLL_INTERVAL);
