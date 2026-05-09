---
mode: agent
description: Add a new ClipHive feature with minimal risk to capture, sync, and sensitive-data flows
---
Implement a new feature for ClipHive.

Context:
- Chrome MV3 extension
- Plain JS/HTML/CSS (no framework)
- Core modules: background service worker, content script, offscreen clipboard poller, popup UI

Task:
- Build the feature described below.
- Reuse existing architecture and message/storage patterns.
- Keep permissions minimal and avoid adding dependencies unless necessary.

Feature request:
${input:Describe the feature and expected UX}

Requirements:
- Provide a short implementation plan before edits.
- Make concrete code changes in the smallest sensible set of files.
- Preserve backward compatibility for existing clip data shape.
- If adding storage keys, use safe defaults and guard null/undefined cases.
- If adding runtime messages, include sender + receiver wiring.
- If UI changes are included, keep keyboard navigation and theme compatibility.

Validation:
- Run through a manual verification checklist specific to this feature.
- List edge cases considered.
- Summarize changed files and why each was touched.
