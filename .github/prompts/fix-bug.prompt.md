---
mode: agent
description: Diagnose and fix a ClipHive bug with root-cause-first reasoning
---
Diagnose and fix a bug in ClipHive.

Bug report:
${input:Describe the bug, repro steps, and expected behavior}

Process:
1. Identify likely root causes in the current codebase.
2. Propose the most targeted fix with minimal side effects.
3. Implement the fix.
4. Verify behavior with clear repro/validation steps.

Constraints:
- Keep existing architecture and naming patterns.
- Preserve sensitive-content safeguards.
- Do not add broad refactors unless required by the fix.
- If there are multiple valid fixes, choose the least risky and explain tradeoffs briefly.

Output format:
- Root cause
- Files changed
- What was fixed
- How to verify
- Residual risks (if any)
