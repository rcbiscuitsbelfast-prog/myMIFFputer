# MIFF Desktop Apps

A lightweight windowed desktop that ships with three core apps tailored for MIFF operations:

- **Notes** – Markdown-first editor with autosave and quest/dialogue snippet seeding.
- **Lore Console** – Faux terminal that proxies to the content service for deterministic commands such as `list quests` and `inspect npc <id>`.
- **LLM Relay** – Chat UI with selectable system prompts, persistent history, snippet injection, and graceful fallback text when no backend credentials are configured.

## Getting started

The desktop is a static site. You can open `apps/miff-desktop/index.html` directly in a browser or serve it with any HTTP server:

```bash
npx serve apps/miff-desktop
```

The apps call `/api/miff/content` and `/api/miff/llm/chat` when available. If those endpoints are unreachable, the UI falls back to deterministic sample data (for the content service) and copyable prompts (for the LLM window). No additional configuration is required for local-only use.

## Keyboard hints

- Notes autosaves on every pause and supports snippet insertion from the drawer at the bottom of the window.
- Press `Tab` inside the Lore Console to autocomplete commands; use the arrow keys to walk history.
- The LLM Relay keeps the last 40 messages in `localStorage` so you can close/reopen the window without losing context.
