# ClipHive

A Chrome Extension (Manifest V3) for clipboard history and quick re-paste.

ClipHive captures copied text from web pages, keeps a searchable local history, and lets you paste or re-copy clips quickly from the popup.

## Features

- Clipboard history with badge count and configurable history limit
- Fast search across captured clips
- One-click re-copy and paste into focused fields
- Rich text support (stores optional HTML fragments and can paste formatted content)
- Pin important clips to keep them at the top
- Folder organization for clips
- Reusable text templates
- Export and import clipboard history (JSON and CSV)
- Pause/resume clip tracking
- Auto-copy selected text (optional)
- Address-bar polling mode for browser-UI clipboard capture (optional)
- Sensitive content detection (tokens/secrets patterns)
- Sensitive clip masking and auto-expiry
- Optional cross-device sync using `chrome.storage.sync`
- Keyboard shortcut to open popup (`Ctrl+Shift+V` / `Cmd+Shift+V`)

## Why ClipHive

- No framework, no build step, easy to read and modify
- Uses Chrome extension APIs directly
- Privacy-first defaults for sensitive content handling

## Installation (Load Unpacked)

1. Clone this repository.
2. Open Chrome and go to `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select this repository folder.

The extension icon should now appear in Chrome.

## Usage

1. Copy text on any web page (`Ctrl+C` / `Cmd+C`).
2. Open ClipHive from the toolbar icon (or use `Ctrl+Shift+V` / `Cmd+Shift+V`).
3. Click a clip card to copy it again, or use the paste button to insert into the focused field.
4. Use **Advanced** for folders, templates, export/import, and settings.

## Development

This project is plain HTML/CSS/JavaScript with no build tooling.

- Edit files directly in place.
- Reload the extension in `chrome://extensions` after changes.
- Check service worker logs in the extension details page.

### Project Structure

- `manifest.json`: extension metadata, permissions, entry points
- `background/service-worker.js`: clip storage, badge updates, sync chunking, sensitive expiry, offscreen lifecycle
- `content/content.js`: page-level copy/select capture and paste back into focused editables
- `offscreen/offscreen.js`: clipboard polling for browser UI contexts
- `popup/popup.html`: popup UI structure
- `popup/popup.js`: popup behavior and user actions
- `popup/popup.css`: popup styling and themes

## Data Model

A clip object can include:

- `id` (UUID)
- `text` (plain text)
- `html` (optional rich fragment)
- `timestamp` (epoch ms)
- `sourceUrl` (optional)
- `pinned` (optional)
- `sensitive` (optional)
- `expiresAt` (optional epoch ms)
- `folderId` (optional)

## Permissions

ClipHive requests:

- `clipboardRead`, `clipboardWrite`: read/write clipboard and support re-paste flows
- `storage`: local and sync persistence
- `activeTab`, `tabs`: messaging to active page for paste actions
- `offscreen`: offscreen document for optional clipboard polling
- `alarms`: periodic cleanup for expiring sensitive clips

## Privacy & Security

- Clipboard clips are stored in `chrome.storage.local` by default.
- Sync is opt-in and uses `chrome.storage.sync` with chunked writes.
- Sensitive pattern detection can mark clips as sensitive.
- Sensitive clips are masked in the UI until revealed.
- Sensitive clips can auto-expire after a configurable interval.

## Known Limitations

- Browser and site restrictions can block scripted paste in some contexts.
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
