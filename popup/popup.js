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

// Advanced panel elements
const advancedBtn = document.getElementById("advancedBtn");
const advancedPanel = document.getElementById("advancedPanel");
const advancedTabs = document.querySelectorAll(".advanced-tab");
const foldersTab = document.getElementById("foldersTab");
const templatesTab = document.getElementById("templatesTab");
const newFolderInput = document.getElementById("newFolderInput");
const addFolderBtn = document.getElementById("addFolderBtn");
const folderListEl = document.getElementById("folderList");
const emptyFolders = document.getElementById("emptyFolders");
const newTemplateName = document.getElementById("newTemplateName");
const addTemplateBtn = document.getElementById("addTemplateBtn");
const templateEditor = document.getElementById("templateEditor");
const templateContent = document.getElementById("templateContent");
const saveTemplateBtn = document.getElementById("saveTemplateBtn");
const cancelTemplateBtn = document.getElementById("cancelTemplateBtn");
const templateListEl = document.getElementById("templateList");
const emptyTemplates = document.getElementById("emptyTemplates");

let allClips = [];
let isPaused = false;
let advancedOpen = false;
let folders = [];
let templates = [];
let activeFolderId = null; // null = show all clips
let editingTemplateName = "";

// ===== Init =====
document.addEventListener("DOMContentLoaded", loadClips);
searchInput.addEventListener("input", renderClips);
clearAllBtn.addEventListener("click", handleClearAll);
pauseBtn.addEventListener("click", togglePause);

// Advanced panel events
advancedBtn.addEventListener("click", toggleAdvancedPanel);
advancedTabs.forEach((tab) => {
  tab.addEventListener("click", () => switchAdvancedTab(tab.dataset.tab));
});
addFolderBtn.addEventListener("click", createFolder);
newFolderInput.addEventListener("keydown", (e) => { if (e.key === "Enter") createFolder(); });
addTemplateBtn.addEventListener("click", startNewTemplate);
saveTemplateBtn.addEventListener("click", saveTemplate);
cancelTemplateBtn.addEventListener("click", cancelTemplate);

async function loadClips() {
  const response = await chrome.runtime.sendMessage({ type: "GET_CLIPS" });
  allClips = response.clips || [];
  renderClips();

  const { paused = false } = await chrome.storage.local.get("paused");
  isPaused = paused;
  updatePauseUI();

  // Load advanced data
  const data = await chrome.storage.local.get(["folders", "templates"]);
  folders = data.folders || [];
  templates = data.templates || [];
  renderFolders();
  renderTemplates();
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
  let filtered = query
    ? allClips.filter((c) => c.text.toLowerCase().includes(query))
    : allClips;

  // Filter by active folder
  if (activeFolderId) {
    filtered = filtered.filter((c) => c.folderId === activeFolderId);
  }

  // Sort: pinned first, then by timestamp descending
  const sorted = [...filtered].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return 0;
  });

  clipCountEl.textContent = `${allClips.length} clip${allClips.length !== 1 ? "s" : ""}`;

  // Clear existing cards (keep emptyState node and breadcrumb)
  clipList.querySelectorAll(".clip-card, .folder-breadcrumb").forEach((el) => el.remove());

  // Show folder breadcrumb if filtering by folder
  if (activeFolderId) {
    const folder = folders.find((f) => f.id === activeFolderId);
    const breadcrumb = document.createElement("div");
    breadcrumb.className = "folder-breadcrumb";
    breadcrumb.innerHTML = `
      <button class="folder-breadcrumb-back">← All Clips</button>
      <span>/ <span class="folder-breadcrumb-name">${escapeHtml(folder?.name || "")}</span></span>
    `;
    breadcrumb.querySelector(".folder-breadcrumb-back").addEventListener("click", () => {
      activeFolderId = null;
      renderClips();
      renderFolders();
    });
    clipList.insertBefore(breadcrumb, emptyState);
  }

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
        ${advancedOpen ? `<button class="clip-folder-assign" title="Move to folder">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
        </button>` : ""}
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
    if (e.target.closest(".clip-delete") || e.target.closest(".clip-paste") || e.target.closest(".clip-pin") || e.target.closest(".clip-folder-assign") || e.target.closest(".folder-dropdown")) return;
    copyToClipboard(clip.text, card);
  });

  // Folder assign button
  const folderAssignBtn = card.querySelector(".clip-folder-assign");
  if (folderAssignBtn) {
    folderAssignBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      showFolderDropdown(clip.id, card);
    });
  }

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

// ===== Advanced Panel =====
function toggleAdvancedPanel() {
  advancedOpen = !advancedOpen;
  advancedPanel.style.display = advancedOpen ? "block" : "none";
  advancedBtn.classList.toggle("active", advancedOpen);
  renderClips(); // re-render to show/hide folder assign buttons
}

function switchAdvancedTab(tabName) {
  advancedTabs.forEach((t) => t.classList.toggle("active", t.dataset.tab === tabName));
  foldersTab.classList.toggle("active", tabName === "folders");
  templatesTab.classList.toggle("active", tabName === "templates");
}

// ===== Folders =====
async function createFolder() {
  const name = newFolderInput.value.trim();
  if (!name) return;
  const folder = { id: crypto.randomUUID(), name };
  folders.push(folder);
  await chrome.storage.local.set({ folders });
  newFolderInput.value = "";
  renderFolders();
  showToast(`Folder "${name}" created`);
}

function renderFolders() {
  folderListEl.querySelectorAll(".folder-item").forEach((el) => el.remove());
  if (folders.length === 0) {
    emptyFolders.style.display = "block";
    return;
  }
  emptyFolders.style.display = "none";
  const fragment = document.createDocumentFragment();
  for (const folder of folders) {
    const count = allClips.filter((c) => c.folderId === folder.id).length;
    const item = document.createElement("div");
    item.className = "folder-item" + (activeFolderId === folder.id ? " active" : "");
    item.innerHTML = `
      <div class="folder-item-left">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        </svg>
        <span class="folder-item-name">${escapeHtml(folder.name)}</span>
        <span class="folder-item-count">${count}</span>
      </div>
      <div class="folder-item-actions">
        <button class="folder-item-delete" title="Delete folder">&times;</button>
      </div>
    `;
    item.addEventListener("click", (e) => {
      if (e.target.closest(".folder-item-delete")) return;
      activeFolderId = activeFolderId === folder.id ? null : folder.id;
      renderClips();
      renderFolders();
    });
    item.querySelector(".folder-item-delete").addEventListener("click", async (e) => {
      e.stopPropagation();
      if (!confirm(`Delete folder "${folder.name}"?`)) return;
      // Unassign clips from this folder
      allClips.forEach((c) => { if (c.folderId === folder.id) delete c.folderId; });
      await chrome.storage.local.set({ clips: allClips });
      folders = folders.filter((f) => f.id !== folder.id);
      await chrome.storage.local.set({ folders });
      if (activeFolderId === folder.id) activeFolderId = null;
      renderFolders();
      renderClips();
      showToast(`Folder deleted`);
    });
    fragment.appendChild(item);
  }
  folderListEl.appendChild(fragment);
}

function showFolderDropdown(clipId, cardEl) {
  // Remove any existing dropdown
  document.querySelectorAll(".folder-dropdown").forEach((el) => el.remove());
  if (folders.length === 0) {
    showToast("Create a folder first");
    return;
  }
  const dropdown = document.createElement("div");
  dropdown.className = "folder-dropdown";

  // "No folder" option
  const noFolderItem = document.createElement("div");
  noFolderItem.className = "folder-dropdown-item";
  noFolderItem.textContent = "— No folder —";
  noFolderItem.addEventListener("click", async (e) => {
    e.stopPropagation();
    const clip = allClips.find((c) => c.id === clipId);
    if (clip) delete clip.folderId;
    await chrome.storage.local.set({ clips: allClips });
    dropdown.remove();
    renderClips();
    renderFolders();
    showToast("Removed from folder");
  });
  dropdown.appendChild(noFolderItem);

  for (const folder of folders) {
    const item = document.createElement("div");
    item.className = "folder-dropdown-item";
    item.textContent = folder.name;
    item.addEventListener("click", async (e) => {
      e.stopPropagation();
      const clip = allClips.find((c) => c.id === clipId);
      if (clip) clip.folderId = folder.id;
      await chrome.storage.local.set({ clips: allClips });
      dropdown.remove();
      renderClips();
      renderFolders();
      showToast(`Moved to "${folder.name}"`);
    });
    dropdown.appendChild(item);
  }
  cardEl.style.zIndex = "30";
  cardEl.appendChild(dropdown);
  // Close on outside click
  const closeDropdown = (e) => {
    if (!dropdown.contains(e.target)) {
      dropdown.remove();
      cardEl.style.zIndex = "";
      document.removeEventListener("click", closeDropdown);
    }
  };
  setTimeout(() => document.addEventListener("click", closeDropdown), 0);
}

// ===== Templates =====
function startNewTemplate() {
  const name = newTemplateName.value.trim();
  if (!name) { newTemplateName.focus(); return; }
  editingTemplateName = name;
  templateContent.value = "";
  templateEditor.style.display = "block";
  templateContent.focus();
}

async function saveTemplate() {
  const text = templateContent.value.trim();
  if (!text || !editingTemplateName) return;
  const template = {
    id: crypto.randomUUID(),
    name: editingTemplateName,
    text
  };
  templates.push(template);
  await chrome.storage.local.set({ templates });
  cancelTemplate();
  newTemplateName.value = "";
  renderTemplates();
  showToast(`Template "${template.name}" saved`);
}

function cancelTemplate() {
  editingTemplateName = "";
  templateEditor.style.display = "none";
  templateContent.value = "";
}

function renderTemplates() {
  templateListEl.querySelectorAll(".template-item").forEach((el) => el.remove());
  if (templates.length === 0) {
    emptyTemplates.style.display = "block";
    return;
  }
  emptyTemplates.style.display = "none";
  const fragment = document.createDocumentFragment();
  for (const tpl of templates) {
    const preview = tpl.text.length > 60 ? tpl.text.slice(0, 60) + "…" : tpl.text;
    const item = document.createElement("div");
    item.className = "template-item";
    item.innerHTML = `
      <div class="template-item-left">
        <span class="template-item-name">${escapeHtml(tpl.name)}</span>
        <span class="template-item-preview">${escapeHtml(preview)}</span>
      </div>
      <div class="template-item-actions">
        <button class="template-item-delete" title="Delete template">&times;</button>
      </div>
    `;
    // Click template → copy text
    item.addEventListener("click", (e) => {
      if (e.target.closest(".template-item-delete")) return;
      navigator.clipboard.writeText(tpl.text).then(() => {
        showToast(`Template "${tpl.name}" copied`);
      });
    });
    item.querySelector(".template-item-delete").addEventListener("click", async (e) => {
      e.stopPropagation();
      templates = templates.filter((t) => t.id !== tpl.id);
      await chrome.storage.local.set({ templates });
      renderTemplates();
      showToast("Template deleted");
    });
    fragment.appendChild(item);
  }
  templateListEl.appendChild(fragment);
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
