# GitHub Copilot Setup for ClipHive

This folder configures repository-aware AI assistance for development.

## Files
- `copilot-instructions.md`: default rules and architecture context for Copilot in this repo.
- `prompts/add-feature.prompt.md`: scaffold for implementing new features safely.
- `prompts/fix-bug.prompt.md`: root-cause-first bug fixing prompt.
- `prompts/security-review.prompt.md`: focused security/privacy review prompt.

## How to use
- In GitHub or VS Code Copilot Chat, these instructions are applied as repo context.
- Use prompt files as reusable starting points when creating chat prompts.

## When to update
Update these files whenever you:
- add or remove extension modules,
- introduce new runtime message types,
- change storage schema/keys,
- change security-sensitive clip handling behavior.
