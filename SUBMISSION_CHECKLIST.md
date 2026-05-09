# Chrome Web Store Submission Checklist

Complete this checklist before uploading ClipHive to the Chrome Web Store.

## ✅ Pre-Submission

### Code & Manifest
- [ ] Confirm `manifest.json` uses **Manifest V3**
- [ ] Verify all required files are present: `background/`, `content/`, `icons/`, `offscreen/`, `popup/`, `utils/`
- [ ] Check that permissions in manifest are **minimal** (only what's actually used)
- [ ] Verify extension name and version are correct

### Testing (Local)
- [ ] Load the extension unpacked in Chrome (`chrome://extensions`)
- [ ] Copy text on a web page → verify it appears in ClipHive popup
- [ ] Click a clip → verify it re-copies to clipboard
- [ ] Use the paste button → verify it pastes into a text field
- [ ] Search functionality → works correctly
- [ ] Settings → can modify and settings persist
- [ ] Pause/resume → functionality works
- [ ] Sensitive clip masking → displays correctly
- [ ] Export history → JSON/CSV export works
- [ ] Import history → can import previously exported data

### Assets
- [ ] Icon ready: `icons/icon128.png` (128×128 px) ✅ *Already have this*
- [ ] Screenshots created: at least 1 (recommended 2–5)
  - [ ] Screenshot 1: Main clipboard history (1280×800 or 640×400)
  - [ ] Screenshot 2: Paste functionality
  - [ ] Screenshot 3: (Optional) Folders/organization
  - [ ] Screenshot 4: (Optional) Sensitive content masking
  - [ ] Screenshot 5: (Optional) Settings

### Documentation
- [ ] Privacy Policy created or drafted (see `PRIVACY_POLICY.md`)
- [ ] Short description prepared (132 characters max) — ready in `STORE_LISTING.md`
- [ ] Full description prepared (4,000 characters max) — ready in `STORE_LISTING.md`
- [ ] Support URL/GitHub link ready

### Package
- [ ] `.zip` file created with correct structure
  - [ ] Verified manifest.json is at the **root level** of the zip (not nested)
  - [ ] All required files included
  - [ ] No unnecessary files (README.md, git files, etc. are OK but not required)

---

## 📋 Chrome Web Store Dashboard Setup

### Developer Account
- [ ] Registered as Chrome Web Store Developer (paid $5)
- [ ] Logged in to [https://chrome.google.com/webstore/devconsole](https://chrome.google.com/webstore/devconsole)

### Item Creation
- [ ] Click **"New Item"**
- [ ] Upload your `.zip` file

### Store Listing Form (Fill with content from `STORE_LISTING.md`)

#### Basic Info
- [ ] **Extension Name:** ClipHive
- [ ] **Description:** (use short description from `STORE_LISTING.md`)
- [ ] **Category:** Productivity
- [ ] **Website:** (optional, but recommended) https://github.com/your-org/ClipHive

#### Detailed Listing
- [ ] **Long Description:** (paste from `STORE_LISTING.md`)
- [ ] **Language:** English
- [ ] **Detailed Description in Other Languages:** (leave blank unless multilingual)

#### Graphics
- [ ] **Icon:** Upload `icons/icon128.png` (128×128 px)
- [ ] **Screenshots:** Upload at least 1 screenshot (1280×800 or 640×400 px each)
  - [ ] All screenshots are in the correct format and size
  - [ ] Screenshots accurately represent key features

#### Privacy & Permissions
- [ ] **Privacy Policy:** Link to or paste your privacy policy (see `PRIVACY_POLICY.md`)
- [ ] **Support URL:** https://github.com/your-org/ClipHive
- [ ] **Review manifest permissions:** Confirm all requested permissions are necessary and explained

#### Content Rating
- [ ] Complete content rating questionnaire (should be low-risk for a productivity tool)

#### Release Notes (Optional)
- [ ] **Version:** 1.0.0
- [ ] **Release Notes:** (e.g., "Initial release: Clipboard history, search, folders, templates, sensitive content detection, and optional cross-device sync.")

---

## 🔍 Final Review

### Before Clicking Submit:
- [ ] Read through the entire store listing as it will appear to users
- [ ] Verify all links are correct and functional
- [ ] Confirm screenshots are clear and representative
- [ ] Check that permissions are justified by your feature set
- [ ] Ensure privacy policy is complete and accessible

### Manifest Review:
- [ ] No permissions beyond:
  - `clipboardRead`, `clipboardWrite`
  - `storage`
  - `activeTab`, `tabs`
  - `offscreen`
  - `alarms`
- [ ] No suspicious or malicious code (should be obvious for your own code)
- [ ] Content scripts only run on necessary pages

---

## 🚀 Submission

- [ ] Click **"Submit for Review"** on the Chrome Web Store dashboard
- [ ] Confirm submission was received (you'll see a pending status)
- [ ] Wait for review (typically 1–3 hours, but can take up to 24–48 hours in some cases)
- [ ] Monitor your email for review results

---

## ✨ After Launch

- [ ] Extension is **Live** on the Chrome Web Store! 🎉
- [ ] Share the store link with users
- [ ] Monitor reviews and feedback
- [ ] Respond to user reviews and issues
- [ ] Plan future updates and improvements

---

## Common Rejection Reasons (Avoid These)

❌ **Manifest mismatches** — Make sure all entry points (action, service_worker, content_scripts) are correctly defined

❌ **Excessive permissions** — Only request what you use

❌ **Missing privacy policy** — Must be provided for extensions handling user data

❌ **Poor description** — Make it clear and accurate

❌ **Bad screenshots** — Should clearly show key features

❌ **Broken links** — Verify all URLs work

❌ **Placeholder content** — Use real, complete descriptions

---

## Questions?

- Chrome Web Store Policies: https://chrome.google.com/webstore/category/extensions
- Manifest V3 Guide: https://developer.chrome.com/docs/extensions/mv3/
- Submission Help: https://support.google.com/chrome/a?p=webstore_publish

Good luck! 🚀
