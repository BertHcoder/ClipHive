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

// ===== Constants =====
const BUY_ME_A_COFFEE_URL = "https://www.buymeacoffee.com/DIRTYmasterchief";
const THEME_STORAGE_KEY = "theme";
const THEMES = new Set(["honey", "forest", "midnight"]);

// UI Timing Constants
const TOAST_DURATION_NORMAL = 1800; // ms
const TOAST_DURATION_WARNING = 3000; // ms
const WINDOW_CLOSE_DELAY = 300; // ms
const CLIPBOARD_READ_TIMEOUT = 100; // ms

// Clip Display Constants
const CLIP_TEXT_MAX_LENGTH = 120; // characters to show before truncation
const EXPIRY_MINS_REMINDER = 60000; // ms to convert to minutes

// Expand button elements
const expandBtn = document.getElementById("expandBtn");
let isExpanded = false;

// Time unit constants (for timeAgo function)
const TIME_JUST_NOW_THRESHOLD = 5; // seconds
const SECS_PER_MINUTE = 60;
const MINS_PER_HOUR = 60;
const HOURS_PER_DAY = 24;

// Advanced panel elements
const advancedBtn = document.getElementById("advancedBtn");
const advancedPanel = document.getElementById("advancedPanel");
const advancedTabs = document.querySelectorAll(".advanced-tab");
const foldersTab = document.getElementById("foldersTab");
const templatesTab = document.getElementById("templatesTab");
const settingsTab = document.getElementById("settingsTab");
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

// Export/Import elements
const exportImportTab = document.getElementById("exportImportTab");
const exportJsonBtn = document.getElementById("exportJsonBtn");
const exportCsvBtn = document.getElementById("exportCsvBtn");
const importJsonBtn = document.getElementById("importJsonBtn");
const importFileInput = document.getElementById("importFileInput");
const supportLink = document.getElementById("supportLink");

let allClips = [];
let isPaused = false;
let advancedOpen = false;
let folders = [];
let templates = [];
let activeFolderId = null; // null = show all clips
let editingTemplateName = "";
let revealedClips = new Set(); // track which sensitive clips have been revealed
let activeAdvancedTab = "folders";

const TAB_CONTENT = {
  folders: foldersTab,
  templates: templatesTab,
  settings: settingsTab,
  exportimport: exportImportTab
};

let selectedIndex = -1;

// ===== Init =====
document.addEventListener("DOMContentLoaded", loadClips);
searchInput.addEventListener("input", () => { selectedIndex = -1; renderClips(); });
clearAllBtn.addEventListener("click", handleClearAll);
pauseBtn.addEventListener("click", togglePause);
expandBtn.addEventListener("click", toggleExpand);
document.addEventListener("keydown", handleKeyboardNav);

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
exportJsonBtn.addEventListener("click", exportAsJson);
exportCsvBtn.addEventListener("click", exportAsCsv);
importJsonBtn.addEventListener("click", () => importFileInput.click());
importFileInput.addEventListener("change", importFromJson);
supportLink.addEventListener("click", (e) => {
  if (BUY_ME_A_COFFEE_URL.includes("your-name")) {
    e.preventDefault();
    showToast("Set your Buy Me a Coffee profile URL in popup.js");
    return;
  }
  supportLink.href = BUY_ME_A_COFFEE_URL;
});

function normalizeTheme(theme) {
  return THEMES.has(theme) ? theme : "honey";
}

function applyTheme(theme) {
  document.body.dataset.theme = normalizeTheme(theme);
}

async function loadClips() {
  const response = await chrome.runtime.sendMessage({ type: "GET_CLIPS" });
  allClips = response.clips || [];
  renderClips();

  const { paused = false } = await chrome.storage.local.get("paused");
  isPaused = paused;
  updatePauseUI();

  // Load expanded state
  const { expanded = false } = await chrome.storage.local.get("expanded");
  isExpanded = expanded;
  updateExpandUI();

  // Load advanced data
  const data = await chrome.storage.local.get(["folders", "templates", "addressBarPolling", "autoCopy", "sensitiveDetection", "sensitiveExpiry", THEME_STORAGE_KEY]);
  folders = data.folders || [];
  templates = data.templates || [];
  renderFolders();
  renderTemplates();

  const themeSelect = document.getElementById("themeSelect");
  const currentTheme = normalizeTheme(data[THEME_STORAGE_KEY]);
  applyTheme(currentTheme);
  themeSelect.value = currentTheme;
  themeSelect.addEventListener("change", async () => {
    const nextTheme = normalizeTheme(themeSelect.value);
    applyTheme(nextTheme);
    await chrome.storage.local.set({ [THEME_STORAGE_KEY]: nextTheme });
    showToast(`Theme: ${themeSelect.options[themeSelect.selectedIndex].text}`);
  });

  const autoCopyToggle = document.getElementById("autoCopyToggle");
  autoCopyToggle.checked = data.autoCopy === true;
  autoCopyToggle.addEventListener("change", async () => {
    await chrome.storage.local.set({ autoCopy: autoCopyToggle.checked });
  });

  const toggle = document.getElementById("addressBarPollingToggle");
  toggle.checked = data.addressBarPolling === true;
  toggle.addEventListener("change", async () => {
    await chrome.storage.local.set({ addressBarPolling: toggle.checked });
  });

  // Sync & history limit settings (synced across devices)
  const syncSettings = await chrome.storage.sync.get({ syncEnabled: false, maxClips: 100 });

  const syncToggle = document.getElementById("syncToggle");
  syncToggle.checked = syncSettings.syncEnabled;
  syncToggle.addEventListener("change", async () => {
    await chrome.storage.sync.set({ syncEnabled: syncToggle.checked });
    showToast(syncToggle.checked ? "Sync enabled" : "Sync disabled");
  });

  const maxClipsSelect = document.getElementById("maxClipsSelect");
  maxClipsSelect.value = String(syncSettings.maxClips);
  maxClipsSelect.addEventListener("change", async () => {
    const maxClips = parseInt(maxClipsSelect.value, 10);
    await chrome.storage.sync.set({ maxClips });
    if (allClips.length > maxClips) {
      allClips.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return b.timestamp - a.timestamp;
      });
      allClips.length = maxClips;
      await chrome.storage.local.set({ clips: allClips });
      renderClips();
    }
    showToast(`History limit: ${maxClips} clips`);
  });

  // Sensitive content settings
  const sensitiveToggle = document.getElementById("sensitiveDetectionToggle");
  sensitiveToggle.checked = data.sensitiveDetection !== false; // default true
  sensitiveToggle.addEventListener("change", async () => {
    await chrome.storage.local.set({ sensitiveDetection: sensitiveToggle.checked });
  });

  const sensitiveExpirySelect = document.getElementById("sensitiveExpirySelect");
  sensitiveExpirySelect.value = String(data.sensitiveExpiry ?? 5);
  sensitiveExpirySelect.addEventListener("change", async () => {
    await chrome.storage.local.set({ sensitiveExpiry: Number(sensitiveExpirySelect.value) });
  });
  toggle.checked = data.addressBarPolling === true;
  toggle.addEventListener("change", async () => {
    await chrome.storage.local.set({ addressBarPolling: toggle.checked });
  });

  // Show the real shortcut assigned to _execute_action
  const commands = await chrome.commands.getAll();
  const openCmd = commands.find((c) => c.name === "_execute_action");
  const shortcutKey = document.getElementById("shortcutKey");
  if (openCmd && openCmd.shortcut) {
    shortcutKey.textContent = openCmd.shortcut;
  } else {
    shortcutKey.textContent = "Not set";
  }

  document.getElementById("changeShortcutBtn").addEventListener("click", () => {
    chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
  });
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

function updateExpandUI() {
  document.body.classList.toggle("expanded", isExpanded);
  expandBtn.classList.toggle("active", isExpanded);
}

async function toggleExpand() {
  isExpanded = !isExpanded;
  await chrome.storage.local.set({ expanded: isExpanded });
  updateExpandUI();
}

// ===== Keyboard Navigation =====
function handleKeyboardNav(e) {
  // Skip if typing in an input/textarea
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
    if (e.key === "Escape") {
      e.target.blur();
      e.preventDefault();
    }
    return;
  }

  const cards = Array.from(clipList.querySelectorAll(".clip-card"));
  if (cards.length === 0) return;

  switch (e.key) {
    case "ArrowDown":
    case "j":
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, cards.length - 1);
      updateSelection(cards);
      break;
    case "ArrowUp":
    case "k":
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, 0);
      updateSelection(cards);
      break;
    case "Enter":
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < cards.length) {
        const card = cards[selectedIndex];
        const clip = allClips.find((c) => c.id === card.dataset.id);
        if (clip) {
          if (clip.sensitive && !revealedClips.has(clip.id)) break; // don't copy masked
          copyToClipboard(clip.text, card, clip.sensitive);
        }
      }
      break;
    case "Delete":
    case "Backspace":
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < cards.length) {
        const card = cards[selectedIndex];
        deleteClip(card.dataset.id, card);
        if (selectedIndex >= cards.length - 1) selectedIndex = cards.length - 2;
        setTimeout(() => updateSelection(Array.from(clipList.querySelectorAll(".clip-card"))), 250);
      }
      break;
    case "p":
      if (selectedIndex >= 0 && selectedIndex < cards.length) {
        e.preventDefault();
        togglePin(cards[selectedIndex].dataset.id);
      }
      break;
    case "/":
      e.preventDefault();
      searchInput.focus();
      break;
    case "Escape":
      e.preventDefault();
      selectedIndex = -1;
      updateSelection(cards);
      break;
  }
}

function updateSelection(cards) {
  cards.forEach((card, i) => {
    card.classList.toggle("kb-selected", i === selectedIndex);
  });
  if (selectedIndex >= 0 && cards[selectedIndex]) {
    cards[selectedIndex].scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
}

// ===== Render =====
function updateClipCount() {
  clipCountEl.textContent = `${allClips.length} clip${allClips.length !== 1 ? "s" : ""}`;
}

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

  updateClipCount();

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

  const isMasked = clip.sensitive && !revealedClips.has(clip.id);
  const truncated = isMasked
    ? "●●●●●●●●●●●●●●●●●●●●"
    : clip.text.length > CLIP_TEXT_MAX_LENGTH
      ? clip.text.slice(0, CLIP_TEXT_MAX_LENGTH) + "…"
      : clip.text;

  const domain = extractDomain(clip.sourceUrl);

  if (clip.pinned) card.classList.add("pinned");
  if (clip.sensitive) card.classList.add("sensitive");

  // Expiry countdown text
  let expiryText = "";
  if (clip.expiresAt) {
    const remaining = Math.max(0, clip.expiresAt - Date.now());
    const mins = Math.ceil(remaining / EXPIRY_MINS_REMINDER);
    expiryText = mins > 0 ? `expires in ${mins}m` : "expiring…";
  }

  card.innerHTML = `
    <div class="clip-text${isMasked ? " clip-text-masked" : ""}">${escapeHtml(truncated)}</div>
    <div class="clip-meta">
      <div class="clip-meta-left">
        <span class="clip-time">${timeAgo(clip.timestamp)}</span>
        ${domain ? `<span class="clip-source">${escapeHtml(domain)}</span>` : ""}
        ${clip.html ? `<span class="clip-rich-badge" title="Rich text available">HTML</span>` : ""}
        ${clip.sensitive ? `<span class="clip-sensitive-badge" title="Sensitive content detected">🔒 SENSITIVE</span>` : ""}
        ${expiryText ? `<span class="clip-expiry-timer" title="Auto-expires">${expiryText}</span>` : ""}
      </div>
      <div class="clip-actions">
        <button class="clip-action-btn clip-secure-toggle${clip.sensitive ? " active" : ""}" title="${clip.sensitive ? "Already marked secure" : "Mark as secure"}">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </button>
        ${clip.sensitive ? `<button class="clip-reveal-btn" title="${isMasked ? "Reveal" : "Hide"} sensitive content">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            ${isMasked
              ? `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`
              : `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>`
            }
          </svg>
        </button>` : ""}
        ${advancedOpen ? `<button class="clip-action-btn clip-folder-assign" title="Move to folder">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
        </button>` : ""}
        ${clip.html ? `<button class="clip-action-btn clip-paste-rich" title="Paste as formatted HTML">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 3v12M8 11l4 4 4-4"/>
            <rect x="4" y="17" width="16" height="4" rx="1" fill="currentColor" opacity="0.2"/>
          </svg>
        </button>` : ""}
        <button class="clip-action-btn clip-pin${clip.pinned ? " active" : ""}" title="${clip.pinned ? "Unpin" : "Pin"}">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="${clip.pinned ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2">
            <path d="M12 2l2.09 6.26L21 9.27l-5 4.87L17.18 21 12 17.27 6.82 21 8 14.14l-5-4.87 6.91-1.01L12 2z"/>
          </svg>
        </button>
        <button class="clip-action-btn clip-paste" title="Paste as plain text">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
            <rect x="8" y="2" width="8" height="4" rx="1"/>
          </svg>
        </button>
        <button class="clip-delete" title="Delete clip">&times;</button>
      </div>
    </div>
  `;

  // Click card → re-copy (with warning for sensitive)
  card.addEventListener("click", (e) => {
    if (e.target.closest(".clip-delete") || e.target.closest(".clip-paste") || e.target.closest(".clip-pin") || e.target.closest(".clip-folder-assign") || e.target.closest(".folder-dropdown") || e.target.closest(".clip-reveal-btn") || e.target.closest(".clip-secure-toggle")) return;
    if (clip.sensitive && isMasked) return; // don't copy masked content
    copyToClipboard(clip.text, card, clip.sensitive);
  });

  const secureToggleBtn = card.querySelector(".clip-secure-toggle");
  secureToggleBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    markClipSecure(clip.id);
  });

  // Reveal/hide toggle for sensitive clips
  const revealBtn = card.querySelector(".clip-reveal-btn");
  if (revealBtn) {
    revealBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (revealedClips.has(clip.id)) {
        revealedClips.delete(clip.id);
      } else {
        revealedClips.add(clip.id);
      }
      renderClips();
    });
  }

  // Folder assign button
  const folderAssignBtn = card.querySelector(".clip-folder-assign");
  if (folderAssignBtn) {
    folderAssignBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      showFolderDropdown(clip.id, card);
    });
  }

  // Rich paste button (paste as formatted HTML)
  const richPasteBtn = card.querySelector(".clip-paste-rich");
  if (richPasteBtn) {
    richPasteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      pasteToPage(clip.text, clip.html, true);
    });
  }

  // Pin button
  card.querySelector(".clip-pin").addEventListener("click", (e) => {
    e.stopPropagation();
    togglePin(clip.id);
  });

  // Paste button — inserts text at cursor in the active page (plain text)
  card.querySelector(".clip-paste").addEventListener("click", (e) => {
    e.stopPropagation();
    pasteToPage(clip.text, clip.html, false);
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
  updateViewMode();
  renderClips(); // re-render to show/hide folder assign buttons
}

function switchAdvancedTab(tabName) {
  activeAdvancedTab = tabName;
  advancedTabs.forEach((t) => t.classList.toggle("active", t.dataset.tab === tabName));
  Object.entries(TAB_CONTENT).forEach(([key, el]) => {
    el.classList.toggle("active", key === tabName);
  });
  updateViewMode();
}

function updateViewMode() {
  const settingsOnlyView = advancedOpen && activeAdvancedTab === "settings";
  document.body.classList.toggle("settings-only-view", settingsOnlyView);
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
      }).catch((err) => {
        console.warn('[ClipHive] Clipboard write failed:', err.message);
        showToast("Failed to copy template");
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
async function pasteToPage(text, html, useRich = false) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) { showToast("No active tab"); return; }

    const response = await chrome.tabs.sendMessage(tab.id, {
      type: "PASTE_TEXT",
      text,
      html: html || "",
      useRich
    });

    if (response?.success) {
      showToast(useRich ? "Pasted (formatted)!" : "Pasted!");
      setTimeout(() => window.close(), WINDOW_CLOSE_DELAY);
    } else {
      // No focused element — fall back to copy
      await navigator.clipboard.writeText(text);
      showToast("Copied (click target first)");
    }
  } catch (err) {
    console.warn('[ClipHive] Paste failed:', err.message);
    // Content script not available — fall back to copy
    await navigator.clipboard.writeText(text).catch((clipErr) => {
      console.warn('[ClipHive] Clipboard write failed:', clipErr.message);
    });
    showToast("Copied (paste manually)");
  }
}

async function copyToClipboard(text, cardEl, isSensitiveClip = false) {
  try {
    await navigator.clipboard.writeText(text);
    cardEl.classList.remove("copied");
    // Trigger reflow for re-animation
    void cardEl.offsetWidth;
    cardEl.classList.add("copied");
    if (isSensitiveClip) {
      showToast("⚠ Sensitive content copied — clear clipboard when done", true);
    } else {
      showToast("Copied to clipboard!");
    }
  } catch (err) {
    console.warn('[ClipHive] Clipboard write failed:', err.message);
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
    updateClipCount();
    if (allClips.length === 0) emptyState.style.display = "flex";
  }, 200);
}

async function togglePin(id) {
  await chrome.runtime.sendMessage({ type: "TOGGLE_PIN", id });
  const clip = allClips.find((c) => c.id === id);
  if (clip) clip.pinned = !clip.pinned;
  renderClips();
}

async function markClipSecure(id) {
  const clip = allClips.find((c) => c.id === id);
  if (!clip) return;
  if (clip.sensitive) {
    showToast("Already marked secure");
    return;
  }

  const response = await chrome.runtime.sendMessage({
    type: "SET_CLIP_SENSITIVE",
    id,
    sensitive: true
  });

  if (!response?.success) {
    showToast("Failed to mark secure");
    return;
  }

  clip.sensitive = true;
  const { sensitiveExpiry = 5 } = await chrome.storage.local.get("sensitiveExpiry");
  if (sensitiveExpiry > 0) {
    clip.expiresAt = Date.now() + sensitiveExpiry * 60 * 1000;
  } else {
    delete clip.expiresAt;
  }

  revealedClips.delete(id);
  renderClips();
  showToast("Clip marked secure");
}

async function handleClearAll() {
  if (allClips.length === 0) return;
  await chrome.runtime.sendMessage({ type: "CLEAR_CLIPS" });
  allClips = [];
  renderClips();
  showToast("All clips cleared");
}

// ===== Export / Import =====
function exportAsJson() {
  if (allClips.length === 0) { showToast("No clips to export"); return; }
  const data = JSON.stringify(allClips, null, 2);
  downloadFile(data, "cliphive-export.json", "application/json");
  showToast(`Exported ${allClips.length} clips as JSON`);
}

function exportAsCsv() {
  if (allClips.length === 0) { showToast("No clips to export"); return; }
  const header = "id,text,html,timestamp,sourceUrl,pinned,folderId";
  const rows = allClips.map((c) => {
    const fields = [
      c.id,
      csvEscape(c.text),
      csvEscape(c.html || ""),
      c.timestamp,
      csvEscape(c.sourceUrl || ""),
      c.pinned ? "true" : "false",
      c.folderId || ""
    ];
    return fields.join(",");
  });
  const csv = [header, ...rows].join("\n");
  downloadFile(csv, "cliphive-export.csv", "text/csv");
  showToast(`Exported ${allClips.length} clips as CSV`);
}

function csvEscape(str) {
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function importFromJson(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const imported = JSON.parse(event.target.result);
      if (!Array.isArray(imported)) throw new Error("Invalid format");

      // Validate and normalize each clip
      const valid = imported.filter((c) => c && typeof c.text === "string" && c.text.trim());
      if (valid.length === 0) { showToast("No valid clips found"); return; }

      // Merge: skip duplicates by text
      const existingTexts = new Set(allClips.map((c) => c.text));
      let added = 0;
      for (const clip of valid) {
        if (existingTexts.has(clip.text)) continue;
        allClips.unshift({
          id: clip.id || crypto.randomUUID(),
          text: clip.text,
          html: clip.html || undefined,
          timestamp: clip.timestamp || Date.now(),
          sourceUrl: clip.sourceUrl || "",
          pinned: clip.pinned || false,
          folderId: clip.folderId || undefined
        });
        existingTexts.add(clip.text);
        added++;
      }

      await chrome.storage.local.set({ clips: allClips });
      renderClips();
      showToast(`Imported ${added} new clips`);
    } catch (err) {
      console.warn('[ClipHive] JSON import failed:', err.message);
      showToast("Invalid JSON file");
    }
  };
  reader.readAsText(file);
  importFileInput.value = "";
}

// ===== Toast =====
let toastTimer;
function showToast(message, isWarning = false) {
  clearTimeout(toastTimer);
  toastEl.textContent = message;
  toastEl.classList.toggle("warning", isWarning);
  toastEl.classList.add("show");
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), isWarning ? TOAST_DURATION_WARNING : TOAST_DURATION_NORMAL);
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
  } catch (err) {
    console.warn('[ClipHive] Invalid URL:', err.message);
    return "";
  }
}

function timeAgo(ts) {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < TIME_JUST_NOW_THRESHOLD) return "just now";
  if (seconds < SECS_PER_MINUTE) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / SECS_PER_MINUTE);
  if (minutes < MINS_PER_HOUR) return `${minutes}m ago`;
  const hours = Math.floor(minutes / MINS_PER_HOUR);
  if (hours < HOURS_PER_DAY) return `${hours}h ago`;
  const days = Math.floor(hours / HOURS_PER_DAY);
  return `${days}d ago`;
}
