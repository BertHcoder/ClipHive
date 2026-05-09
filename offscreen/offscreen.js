// Polls the clipboard for changes and reports new content to the service worker.
let lastText = "";

const POLL_INTERVAL = 1500; // ms

function readClipboard() {
  const textarea = document.getElementById("clipArea");
  textarea.value = "";
  textarea.focus();
  document.execCommand("paste");
  return textarea.value;
}

function poll() {
  const text = readClipboard();
  if (text && text !== lastText) {
    lastText = text;
    chrome.runtime.sendMessage({ type: "NEW_CLIP", text, sourceUrl: "" });
  }
}

// Initial read to seed lastText without saving (avoids re-saving existing clipboard)
lastText = readClipboard();

setInterval(poll, POLL_INTERVAL);
