<p align="center">
  <img src="icons/icon128.png" alt="ClipHive logo" width="96" />
</p>

<h1 align="center">ClipHive</h1>

<p align="center">
  <strong>Clipboard history manager for Chrome</strong><br>
  Auto-captures, organizes, and re-pastes your clips — with privacy-first defaults.
</p>

<p align="center">
  <a href="https://chromewebstore.google.com/detail/cliphive/oboodmebcbkoghbjhkdicegigbkmnfbl">
    <img src="https://img.shields.io/badge/Chrome%20Web%20Store-Published-blue?logo=googlechrome&logoColor=white" alt="Chrome Web Store" />
  </a>
  <img src="https://img.shields.io/badge/Manifest-V3-green" alt="Manifest V3" />
  <img src="https://img.shields.io/badge/No%20Dependencies-vanilla%20JS-orange" alt="No Dependencies" />
</p>

---

## Features

| Category | Details |
|----------|---------|
| **Clipboard History** | Auto-captures copies with badge count, configurable history limit |
| **Search** | Instant full-text search across all clips |
| **Re-paste** | One-click re-copy or direct paste into focused fields |
| **Rich Text** | Stores HTML fragments, pastes formatted content |
| **Organization** | Pin clips, organize into folders, reusable templates |
| **Import/Export** | JSON and CSV export/import of full history |
| **Privacy** | Sensitive content detection (tokens, secrets, API keys), auto-masking, configurable auto-expiry |
| **Sync** | Optional cross-device sync via `chrome.storage.sync` |
| **Controls** | Pause/resume tracking, auto-copy selection mode, address-bar polling |
| **Keyboard** | `Ctrl+Shift+V` / `Cmd+Shift+V` to open |

## Install

**From Chrome Web Store (recommended):**

> [Install ClipHive](https://chromewebstore.google.com/detail/cliphive/oboodmebcbkoghbjhkdicegigbkmnfbl)

**From source (developer):**

1. Clone this repo
2. Go to `chrome://extensions` → enable **Developer mode**
3. Click **Load unpacked** → select this folder

## Quick Start

1. Copy text on any page (`Ctrl+C`)
2. Click the ClipHive icon or press `Ctrl+Shift+V`
3. Click a clip to re-copy, or hit paste to insert into the active field
4. Use **Advanced** for folders, templates, export, and settings

## Tech Stack

- **Plain JavaScript, HTML, CSS** — no framework, no build step, no dependencies
- **Chrome Extension Manifest V3** APIs
- **Privacy-first**: clips stored locally, sync is opt-in, sensitive content auto-masked

## Project Structure

```
manifest.json              → Extension config & permissions
background/service-worker.js → Clip storage, badge, sync, sensitive expiry
content/content.js         → Page-level copy/select capture & paste-back
offscreen/offscreen.js     → Clipboard polling for browser UI contexts
popup/popup.html/js/css    → Popup UI, behavior, and styling
utils/constants.js         → Shared constants
```

## Privacy & Security

- All clips stored in `chrome.storage.local` by default — never leaves your machine unless you enable sync
- Sync is opt-in and uses chunked writes to respect Chrome quota limits
- Automatic detection of tokens, API keys, and secrets
- Sensitive clips are masked in the UI and can auto-expire
- No analytics, no telemetry, no external network calls

See [PRIVACY_POLICY.md](PRIVACY_POLICY.md) for full details.

## Contributing

1. Fork & clone
2. Make changes (no build step — edit and reload)
3. Test with the [manual test checklist](#manual-testing)
4. Open a PR

### Manual Testing

- [ ] Copy text on a page → appears in popup
- [ ] Paste from popup into input/textarea/contenteditable
- [ ] Toggle sensitive detection → clips are masked
- [ ] Change history limit → old clips trimmed
- [ ] Enable/disable sync → no errors during chunk ops
- [ ] Toggle address-bar polling → offscreen stable

## License

MIT
- Rich HTML paste is best-effort and depends on editable target behavior.
- Address-bar polling uses periodic clipboard reads and should stay off unless needed.

## Contributing

Issues and pull requests are welcome.

Suggested workflow:

1. Open an issue describing bug/feature scope.
2. Create a focused branch.
3. Keep changes small and test manually in Chrome.
4. Include notes for privacy/security impact if clipboard handling changes.

## Manual Test Checklist

- Copy text on a page and confirm it appears in the popup.
- Paste from popup into `input`, `textarea`, and `contenteditable` targets.
- Verify sensitive detection, masking, and expiry behavior.
- Change history limit and confirm trimming.
- Toggle sync on/off and confirm no sync errors.
- Toggle address-bar polling and verify capture behavior.

## License

Add your preferred license file (for example, MIT) and update this section.

---

## Support

If this saved you time or you just like it, consider buying me a coffee:

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-ffdd00?logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/dirtymasterchief)

---
