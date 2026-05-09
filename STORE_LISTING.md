# Chrome Web Store Listing — ClipHive

Use the following text for your store submission. Copy and paste each section into the corresponding Chrome Web Store dashboard field.

---

## 📋 Extension Metadata

**Extension Name:** ClipHive

**Version:** 1.0.0

**Category:** Productivity

---

## 🎯 Short Description (132 characters max)
*(Appears in search results and top of store listing)*

```
Clipboard history manager — capture, browse, and re-paste your clips instantly.
```

**Character count:** 81 ✓

---

## 📝 Full Description (4,000 characters max)
*(Appears on the full store listing page)*

```
ClipHive is a fast, privacy-first clipboard history manager for Chrome.

Copy text on any web page, and ClipHive automatically captures and stores it. Access your entire clipboard history with one click, search for old clips, and re-paste them instantly.

## Key Features

✓ **Clipboard History** — Automatic capture with searchable history (default 500 clips, configurable)
✓ **One-Click Re-Copy** — Instantly re-copy any previous clip with a single click
✓ **Smart Paste** — Paste directly into focused text fields, textareas, and contenteditable elements on any page
✓ **Rich Text Support** — Stores optional HTML fragments; preserves formatting when pasting
✓ **Pin Important Clips** — Pin clips to keep them at the top of your list
✓ **Organize with Folders** — Create folders to group related clips by topic or project
✓ **Text Templates** — Save reusable text snippets for quick insertion
✓ **Search** — Fast full-text search across your entire history
✓ **Sensitive Content Detection** — Automatically mask clips that may contain tokens, passwords, or API keys
✓ **Auto-Expiry** — Optional automatic deletion of sensitive clips after a set time
✓ **Pause/Resume** — Temporarily stop capturing clips without losing history
✓ **Keyboard Shortcut** — Open ClipHive instantly with Ctrl+Shift+V (Cmd+Shift+V on Mac)
✓ **Export & Import** — Backup and restore your history as JSON or CSV
✓ **Cross-Device Sync** — Optional opt-in sync of clips across your Chrome profiles (using Chrome's encrypted sync)
✓ **No Ads, No Tracking** — Privacy-first design with no telemetry, analytics, or third-party services

## Why ClipHive?

• **Privacy by Default** — Your clips stay on your device unless you explicitly enable sync
• **Simple & Fast** — No bloat, no ads, no tracking — just a clean clipboard manager
• **Developer-Friendly** — Built with plain JavaScript, no frameworks; easy to inspect and modify
• **Fully Open Source** — Transparent code you can review and trust

## How to Use

1. Copy text on any web page (Ctrl+C / Cmd+C)
2. Click the ClipHive icon in your toolbar (or press Ctrl+Shift+V / Cmd+Shift+V)
3. See your clip history instantly
4. Click any clip to re-copy it, or use the paste button to insert into the focused field
5. Use Advanced settings for folders, templates, export/import, and sensitive content handling

## Permissions Explained

ClipHive requests only the permissions it needs:
• **Clipboard** — To read and write your clipboard
• **Storage** — To keep your clips safe on your device
• **Tabs** — To enable pasting into web pages
• **Offscreen** — (Optional) To capture clipboard events in browser UI contexts
• **Alarms** — To clean up expired sensitive clips

Your data is yours. We don't collect it, track it, or send it anywhere without your consent.

## Keyboard Shortcut

Press `Ctrl+Shift+V` (or `Cmd+Shift+V` on Mac) to open ClipHive instantly.

## Questions or Issues?

Report bugs or request features on our GitHub: [https://github.com/your-org/ClipHive](https://github.com/your-org/ClipHive)
```

**Character count:** ~2,100 ✓

---

## 🌐 Category

**Primary Category:** Productivity

---

## 🔗 Links

**Support Website/URL:** https://github.com/your-org/ClipHive

**Privacy Policy URL:** Paste the content of PRIVACY_POLICY.md on your website, or upload it as a separate page and link it here.

---

## 📸 Screenshots & Images

### 1. Extension Icon (128×128 px) — ✅ Ready
**File:** `icons/icon128.png`
**Status:** Already prepared

### 2. Screenshots (Required: at least 1; Recommended: 2–5)
**Size:** 1280×800 px (recommended) or 640×400 px (minimum)

**What to capture:**

1. **Main Clipboard History**
   - Show the popup with several clips in the history
   - Include the search bar at the top
   - Show clip cards with timestamps
   - Caption: "Browse and search your clipboard history"

2. **Quick Paste Feature**
   - Show a web page with a text field
   - Show the paste button being clicked
   - Caption: "Paste directly into any web page with one click"

3. **Folders & Organization**
   - Show the Advanced tab with folders
   - Display organized clips by folder
   - Caption: "Organize clips into custom folders"

4. **Sensitive Content Masking**
   - Show a clip marked as sensitive/masked
   - Show the reveal button
   - Caption: "Protect sensitive tokens and API keys"

5. **Settings & Customization**
   - Show the Settings tab
   - Display options like history limit, auto-copy, sync
   - Caption: "Fine-tune ClipHive to your workflow"

**How to create screenshots:**

On Windows/Mac:
- Use the extension normally to build up some history
- Open the popup and use a screenshot tool (Snagit, Lightshot, or built-in tools)
- Crop to exactly 1280×800 px (or 640×400 px)
- Save as PNG
- Upload in the Chrome Web Store dashboard under "Screenshots"

---

## ⭐ Ratings & Reviews

You cannot control ratings, but encourage early users to leave honest reviews:
- Respond professionally to feedback
- Fix bugs quickly and release updates
- Maintain an active GitHub presence for support

---

## 📋 Checklist for Chrome Web Store Submission

- [ ] Create `.zip` package of extension files (see below)
- [ ] Confirm all files are at the root of the .zip (manifest.json should be in the zip root, not nested)
- [ ] Test the extension locally (load unpacked) to verify it works
- [ ] Prepare or link to a Privacy Policy
- [ ] Create at least 1 screenshot (1280×800 px)
- [ ] Fill in store listing with the text above
- [ ] Review manifest.json for any permissions you don't need (minimize permissions)
- [ ] Ensure all icons are properly sized (16, 32, 48, 128 px)
- [ ] Submit for review via Chrome Web Store dashboard

---

## 🔧 How to Create the .zip Package

### Option 1: Windows (File Explorer)

1. Open File Explorer and navigate to your ClipHive folder
2. Select all files and folders:
   - manifest.json
   - background/
   - content/
   - icons/
   - offscreen/
   - popup/
   - utils/
3. Right-click → **Send to** → **Compressed (zipped) folder**
4. Name it `cliphive-v1.0.0.zip`
5. This will create the zip in the same folder

### Option 2: Windows PowerShell (Recommended for Automation)

```powershell
# Navigate to the parent of ClipHive folder
cd e:\repos

# Create the zip
Compress-Archive -Path ClipHive -DestinationPath ClipHive-v1.0.0.zip -Force

# Verify the zip
Get-Item ClipHive-v1.0.0.zip
```

This creates `e:\repos\ClipHive-v1.0.0.zip`.

### Option 3: Command Line (7-Zip or similar)

```bash
7z a cliphive-v1.0.0.zip manifest.json background/ content/ icons/ offscreen/ popup/ utils/
```

---

## ✅ Final Verification Before Upload

1. Extract your .zip in a test folder
2. Verify the structure:
   ```
   manifest.json  ← Should be at root, not nested
   background/
   content/
   icons/
   offscreen/
   popup/
   utils/
   ```
3. Go to `chrome://extensions` → **Load unpacked** → select the extracted folder
4. Test core functionality:
   - Copy text on a web page
   - Verify it appears in the popup
   - Test paste functionality
   - Check search works
   - Verify settings save
5. If everything works, your .zip is ready to upload!

---

## 🚀 Submit to Chrome Web Store

1. Log in to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Click **New Item**
3. Upload your `cliphive-v1.0.0.zip`
4. Fill in the store listing using the text above
5. Upload screenshots
6. Add Privacy Policy link or text
7. Review permissions and confirm they're minimal
8. Submit for review (usually takes 1–3 hours)
9. Once approved, your extension will be live on the Chrome Web Store!

---

**Good luck with your launch! 🚀**
