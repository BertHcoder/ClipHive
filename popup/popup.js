const clipList = document.getElementById("clipList");
const emptyState = document.getElementById("emptyState");
const searchInput = document.getElementById("searchInput");
const clearAllBtn = document.getElementById("clearAll");
const clipCountEl = document.getElementById("clipCount");
const toastEl = document.getElementById("toast");
const pauseBtn = document.getElementById("pauseBtn");
const pauseIcon = pauseBtn.querySelector(".pause-icon");
const playIcon = pauseBtn.querySelector(".play-icon");
const pauseLabel = pauseBtn.querySelector(".pause-label");

let allClips = [];
let isPaused = false;

// ===== Init =====
document.addEventListener("DOMContentLoaded", loadClips);
searchInput.addEventListener("input", renderClips);
clearAllBtn.addEventListener("click", handleClearAll);
pauseBtn.addEventListener("click", togglePause);

async function loadClips() {
  const response = await chrome.runtime.sendMessage({ type: "GET_CLIPS" });
  allClips = response.clips || [];
  renderClips();

  const { paused = false } = await chrome.storage.local.get("paused");
  isPaused = paused;
  updatePauseUI();
}

function updatePauseUI() {
  pauseIcon.style.display = isPaused ? "none" : "";
  playIcon.style.display = isPaused ? "" : "none";
  pauseLabel.textContent = isPaused ? "Resume" : "Pause";
  pauseBtn.classList.toggle("active", isPaused);
}

async function togglePause() {
  isPaused = !isPaused;
  await chrome.storage.local.set({ paused: isPaused });
  updatePauseUI();
  showToast(isPaused ? "Tracking paused" : "Tracking resumed");
}

// ===== Render =====
function renderClips() {
  const query = searchInput.value.toLowerCase().trim();
  const filtered = query
    ? allClips.filter((c) => c.text.toLowerCase().includes(query))
    : allClips;

  // Sort: pinned first, then by timestamp descending
  const sorted = [...filtered].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return 0;
  });

  clipCountEl.textContent = `${allClips.length} clip${allClips.length !== 1 ? "s" : ""}`;

  // Clear existing cards (keep emptyState node)
  clipList.querySelectorAll(".clip-card").forEach((el) => el.remove());

  if (sorted.length === 0) {
    emptyState.style.display = "flex";
    return;
  }

  emptyState.style.display = "none";

  const fragment = document.createDocumentFragment();
  for (const clip of sorted) {
    fragment.appendChild(createClipCard(clip));
  }
  clipList.appendChild(fragment);
}

function createClipCard(clip) {
  const card = document.createElement("div");
  card.className = "clip-card";
  card.dataset.id = clip.id;

  const truncated = clip.text.length > 120
    ? clip.text.slice(0, 120) + "…"
    : clip.text;

  const domain = extractDomain(clip.sourceUrl);

  if (clip.pinned) card.classList.add("pinned");

  card.innerHTML = `
    <div class="clip-text">${escapeHtml(truncated)}</div>
    <div class="clip-meta">
      <div class="clip-meta-left">
        <span class="clip-time">${timeAgo(clip.timestamp)}</span>
        ${domain ? `<span class="clip-source">${escapeHtml(domain)}</span>` : ""}
      </div>
      <div class="clip-actions">
        <button class="clip-pin${clip.pinned ? " active" : ""}" title="${clip.pinned ? "Unpin" : "Pin"}">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="${clip.pinned ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2">
            <path d="M12 2l2.09 6.26L21 9.27l-5 4.87L17.18 21 12 17.27 6.82 21 8 14.14l-5-4.87 6.91-1.01L12 2z"/>
          </svg>
        </button>
        <button class="clip-paste" title="Paste into page">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
            <rect x="8" y="2" width="8" height="4" rx="1"/>
          </svg>
        </button>
        <button class="clip-delete" title="Delete clip">&times;</button>
      </div>
    </div>
  `;

  // Click card → re-copy
  card.addEventListener("click", (e) => {
    if (e.target.closest(".clip-delete") || e.target.closest(".clip-paste") || e.target.closest(".clip-pin")) return;
    copyToClipboard(clip.text, card);
  });

  // Pin button
  card.querySelector(".clip-pin").addEventListener("click", (e) => {
    e.stopPropagation();
    togglePin(clip.id);
  });

  // Paste button — inserts text at cursor in the active page
  card.querySelector(".clip-paste").addEventListener("click", (e) => {
    e.stopPropagation();
    pasteToPage(clip.text);
  });

  // Delete button
  card.querySelector(".clip-delete").addEventListener("click", (e) => {
    e.stopPropagation();
    deleteClip(clip.id, card);
  });

  return card;
}

// ===== Actions =====
async function pasteToPage(text) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) { showToast("No active tab"); return; }

    const response = await chrome.tabs.sendMessage(tab.id, {
      type: "PASTE_TEXT",
      text: text
    });

    if (response?.success) {
      showToast("Pasted!");
      setTimeout(() => window.close(), 300);
    } else {
      // No focused element — fall back to copy
      await navigator.clipboard.writeText(text);
      showToast("Copied (click target first)");
    }
  } catch {
    // Content script not available — fall back to copy
    await navigator.clipboard.writeText(text);
    showToast("Copied (paste manually)");
  }
}

async function copyToClipboard(text, cardEl) {
  try {
    await navigator.clipboard.writeText(text);
    cardEl.classList.remove("copied");
    // Trigger reflow for re-animation
    void cardEl.offsetWidth;
    cardEl.classList.add("copied");
    showToast("Copied to clipboard!");
  } catch {
    showToast("Failed to copy");
  }
}

async function deleteClip(id, cardEl) {
  cardEl.style.transition = "opacity 0.2s, transform 0.2s";
  cardEl.style.opacity = "0";
  cardEl.style.transform = "translateX(20px)";

  await chrome.runtime.sendMessage({ type: "DELETE_CLIP", id });
  allClips = allClips.filter((c) => c.id !== id);

  setTimeout(() => {
    cardEl.remove();
    clipCountEl.textContent = `${allClips.length} clip${allClips.length !== 1 ? "s" : ""}`;
    if (allClips.length === 0) emptyState.style.display = "flex";
  }, 200);
}

async function togglePin(id) {
  await chrome.runtime.sendMessage({ type: "TOGGLE_PIN", id });
  const clip = allClips.find((c) => c.id === id);
  if (clip) clip.pinned = !clip.pinned;
  renderClips();
}

async function handleClearAll() {
  if (allClips.length === 0) return;
  await chrome.runtime.sendMessage({ type: "CLEAR_CLIPS" });
  allClips = [];
  renderClips();
  showToast("All clips cleared");
}

// ===== Toast =====
let toastTimer;
function showToast(message) {
  clearTimeout(toastTimer);
  toastEl.textContent = message;
  toastEl.classList.add("show");
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1800);
}

// ===== Helpers =====
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function extractDomain(url) {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function timeAgo(ts) {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
