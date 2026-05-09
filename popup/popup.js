const clipList = document.getElementById("clipList");
const emptyState = document.getElementById("emptyState");
const searchInput = document.getElementById("searchInput");
const clearAllBtn = document.getElementById("clearAll");
const clipCountEl = document.getElementById("clipCount");
const toastEl = document.getElementById("toast");

let allClips = [];

// ===== Init =====
document.addEventListener("DOMContentLoaded", loadClips);
searchInput.addEventListener("input", renderClips);
clearAllBtn.addEventListener("click", handleClearAll);

async function loadClips() {
  const response = await chrome.runtime.sendMessage({ type: "GET_CLIPS" });
  allClips = response.clips || [];
  renderClips();
}

// ===== Render =====
function renderClips() {
  const query = searchInput.value.toLowerCase().trim();
  const filtered = query
    ? allClips.filter((c) => c.text.toLowerCase().includes(query))
    : allClips;

  clipCountEl.textContent = `${allClips.length} clip${allClips.length !== 1 ? "s" : ""}`;

  // Clear existing cards (keep emptyState node)
  clipList.querySelectorAll(".clip-card").forEach((el) => el.remove());

  if (filtered.length === 0) {
    emptyState.style.display = "flex";
    return;
  }

  emptyState.style.display = "none";

  const fragment = document.createDocumentFragment();
  for (const clip of filtered) {
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

  card.innerHTML = `
    <div class="clip-text">${escapeHtml(truncated)}</div>
    <div class="clip-meta">
      <div class="clip-meta-left">
        <span class="clip-time">${timeAgo(clip.timestamp)}</span>
        ${domain ? `<span class="clip-source">${escapeHtml(domain)}</span>` : ""}
      </div>
      <button class="clip-delete" title="Delete clip">&times;</button>
    </div>
  `;

  // Click card → re-copy
  card.addEventListener("click", (e) => {
    if (e.target.closest(".clip-delete")) return;
    copyToClipboard(clip.text, card);
  });

  // Delete button
  card.querySelector(".clip-delete").addEventListener("click", (e) => {
    e.stopPropagation();
    deleteClip(clip.id, card);
  });

  return card;
}

// ===== Actions =====
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
