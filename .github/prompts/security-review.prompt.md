---
mode: ask
description: Review security and privacy risks for ClipHive changes
---
Perform a focused security and privacy review for this ClipHive codebase or diff.

Scope:
${input:Paste a diff, list files, or describe the feature to review}

Review checklist:
- Sensitive content handling (detection, masking, expiry)
- Clipboard capture surface and unintended collection
- Export/import data exposure risks
- Sync data handling and quota-safe chunking behavior
- Message passing trust boundaries (content script, service worker, popup)
- Storage of secrets or user data in logs/errors
- Permission creep in `manifest.json`

Return:
- Findings ordered by severity (`high`, `medium`, `low`)
- For each finding: impacted file(s), risk, and recommended fix
- If no issues are found, explicitly say so and list what was checked
