# myMIFFputer Desktop Workspace

A lightweight Vite + React + TypeScript workspace that renders the myMIFFputer desktop shell, complete with taskbar, draggable/resizable windows, and a preload of `/api/miff/content`.

## Core Apps

The desktop ships with three core apps tailored for MIFF operations:

- **Notes** – Markdown-first editor with autosave and quest/dialogue snippet seeding.
- **Lore Console** – Faux terminal that proxies to the content service for deterministic commands such as `list quests` and `inspect npc <id>`.
- **LLM Relay** – Chat UI with selectable system prompts, persistent history, snippet injection, and graceful fallback text when no backend credentials are configured.

## Getting started

```bash
npm run dev:miff-desktop      # Launch the Vite dev server
npm run build:miff-desktop    # Create a production build (static assets)
npm run preview:miff-desktop  # Preview the production build locally
```

The desktop is a static site. You can also open `apps/miff-desktop/index.html` directly in a browser or serve it with any HTTP server:

```bash
npx serve apps/miff-desktop
```

## Environment variables

| Name | Purpose |
| --- | --- |
| `VITE_MIFF_API_ORIGIN` | Absolute origin used when loading `/api/miff/content` (defaults to `window.location.origin`). |
| `VITE_MIFF_DESKTOP_BASE` | Custom base path for build outputs (useful for GitHub Pages). |
| `VITE_MIFF_DESKTOP_MOCKS` | Set to `true` to force mock content. You can also append `?mocks=1` to the URL for an ad-hoc Storybook-like mock view. |

## Mock / visual testing mode

When the API is unavailable, the provider automatically falls back to bundled mock data and surfaces a badge so you know you are not looking at live MIFF modules. Use mock mode to iterate on visuals without a backend.

The apps call `/api/miff/content` and `/api/miff/llm/chat` when available. If those endpoints are unreachable, the UI falls back to deterministic sample data (for the content service) and copyable prompts (for the LLM window). No additional configuration is required for local-only use.

## Keyboard hints

- Notes autosaves on every pause and supports snippet insertion from the drawer at the bottom of the window.
- Press `Tab` inside the Lore Console to autocomplete commands; use the arrow keys to walk history.
- The LLM Relay keeps the last 40 messages in `localStorage` so you can close/reopen the window without losing context.
