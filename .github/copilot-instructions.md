# ClipHive Copilot Instructions

These instructions guide AI-assisted development for this repository.

## Project context
- ClipHive is a Chrome Extension (Manifest V3) for clipboard history and quick re-paste.
- Tech stack: plain JavaScript, HTML, CSS, Chrome Extension APIs.
- No build step or framework is used. Keep changes simple and directly runnable in Chrome.

## Architecture map
- `manifest.json`: extension capabilities, permissions, entry points.
- `background/service-worker.js`: source of truth for clip storage, badge updates, sync chunking, and offscreen lifecycle.
- `content/content.js`: page-level capture (copy/select) and paste-back into focused editable fields.
- `offscreen/offscreen.js`: clipboard polling for browser UI contexts (for example, address bar copy).
- `popup/popup.html`: popup structure and controls.
- `popup/popup.js`: popup behavior, rendering, user actions, settings, import/export.
- `popup/popup.css`: theme tokens and visual styling.

## Data model conventions
A clip object can contain:
- `id`: UUID string
- `text`: plain text clip content
- `html`: optional rich HTML fragment
- `timestamp`: epoch milliseconds
- `sourceUrl`: source page URL if available
- `pinned`: optional boolean
- `sensitive`: optional boolean
- `expiresAt`: optional epoch milliseconds
- `folderId`: optional folder reference

Keep this shape backward compatible unless a migration is explicitly implemented.

## Messaging conventions
Use existing runtime message types and keep naming uppercase snake-case:
- `NEW_CLIP`
- `GET_CLIPS`
- `DELETE_CLIP`
- `TOGGLE_PIN`
- `SET_CLIP_SENSITIVE`
- `CLEAR_CLIPS`
- `UPDATE_BADGE`
- `PASTE_TEXT`

When adding new message types:
- Handle them in a single clear place.
- Preserve async `sendResponse` behavior (`return true` when needed).
- Avoid introducing race conditions with `isSyncing` or storage listeners.

## Storage conventions
- Local state is primarily in `chrome.storage.local` (`clips`, UI settings, folders/templates, pause state).
- Cross-device settings/history metadata are in `chrome.storage.sync` (`syncEnabled`, `maxClips`, chunked clip sync keys).
- Be careful with sync size limits; follow existing chunking strategy.

## Security and privacy rules
- Preserve and extend sensitive-content detection carefully.
- Never log clip contents, tokens, secrets, or clipboard payloads.
- Default to secure behavior when uncertain.
- If a feature touches clip capture, masking, export/import, or sync, include a short privacy impact note in PR text.

## UI and UX rules
- Keep popup responsive and functional in the existing size constraints.
- Reuse theme variables in `popup/popup.css`; avoid hardcoded colors when possible.
- Preserve keyboard navigation and accessibility behaviors.

## Coding style
- Prefer small functions and early returns.
- Match existing naming and formatting in each file.
- Avoid introducing dependencies unless clearly necessary.
- Add concise comments only for non-obvious logic.

## Change checklist for Copilot
Before finalizing a change:
1. Confirm `manifest.json` permissions remain minimal.
2. Confirm all message senders/handlers agree on payload shape.
3. Confirm storage updates keep clip limits and sync behavior intact.
4. Confirm badge update paths still run after clip mutations.
5. Confirm sensitive clips remain masked by default in UI.
6. Confirm no regressions in pause/resume and auto-copy flows.

## Manual test checklist
- Copy text on a page, verify it appears in popup list.
- Paste from popup into input/textarea and contenteditable targets.
- Toggle sensitive detection and verify masked rendering.
- Change history limit and verify trimming behavior.
- Enable/disable sync and verify no errors during chunk operations.
- Toggle address-bar polling and verify offscreen behavior remains stable.
