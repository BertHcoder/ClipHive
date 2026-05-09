# Privacy Policy for ClipHive

**Last Updated:** May 9, 2026

## Overview
ClipHive is a clipboard history manager extension for Chrome. This privacy policy explains what data we collect, how it is used, and your rights.

## Data Collection and Storage

### Local Storage
- **Clipboard History**: ClipHive stores copied text on your device only, in your local browser storage (`chrome.storage.local`). This data never leaves your computer without your explicit action.
- **User Settings**: Preferences like history limit, themes, and pause state are stored locally.
- **Folders and Templates**: Custom organization data is stored locally only.

### Optional Sync
- If you enable cross-device sync, clips are stored in `chrome.storage.sync`, which is encrypted by Google and synced across your signed-in Chrome profiles.
- Sync is **opt-in only** and can be disabled at any time in settings.

### No Remote Transmission
- ClipHive does **not** transmit your clipboard data to any external server, third party, or service (unless you explicitly enable sync).
- We do not log, track, or monetize your clip content.

## Sensitive Content Handling

- ClipHive includes optional **sensitive content detection** that identifies patterns suggesting tokens, API keys, or passwords.
- Sensitive clips are:
  - Masked in the UI by default (require manual reveal)
  - Optionally auto-expiring
  - Still stored locally; never transmitted or shared
- Sensitive detection can be toggled or disabled in settings.

## Permissions

ClipHive requests the following Chrome permissions:

| Permission | Purpose |
|---|---|
| `clipboardRead` | Read copied text to build your history |
| `clipboardWrite` | Write to clipboard when you re-copy or paste |
| `storage` | Store clips and settings locally |
| `activeTab`, `tabs` | Enable pasting into the currently focused field on a web page |
| `offscreen` | (Optional) Capture clipboard events in browser UI contexts (e.g., address bar copy) |
| `alarms` | Clean up expired sensitive clips automatically |

## Export and Import

- **Export**: You can export your entire clipboard history as JSON or CSV at any time. This file is yours to keep or delete.
- **Import**: You control what data you import into ClipHive.
- Neither export nor import involves ClipHive servers; all data transfers occur on your device.

## User Rights

- **Access**: You can view all your clip data in the ClipHive popup at any time.
- **Deletion**: You can delete individual clips or clear all history with one click.
- **Portability**: You can export your entire history as JSON or CSV.
- **Control**: You can pause clip capture, disable sync, or uninstall the extension at any time.

## Third Parties

ClipHive does not share data with third parties. We do not use analytics, advertising networks, or tracking services.

## Changes to This Policy

We may update this privacy policy occasionally. Updates will be posted here, and the "Last Updated" date will change.

## Contact

For privacy concerns or questions, please open an issue on our GitHub repository at [https://github.com/DIRTYmasterchief/ClipHive](https://github.com/DIRTYmasterchief/ClipHive).

## Compliance

ClipHive complies with the Chrome Web Store policies and does not collect personal data beyond what is explicitly described above.
