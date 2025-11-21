# myMIFFputer Desktop Workspace

A lightweight Vite + React + TypeScript workspace that renders the myMIFFputer desktop shell, complete with taskbar, draggable/resizable windows, and a preload of `/api/miff/content`.

## Getting started

```bash
npm run dev:miff-desktop      # Launch the Vite dev server
npm run build:miff-desktop    # Create a production build (static assets)
npm run preview:miff-desktop  # Preview the production build locally
```

## Environment variables

| Name | Purpose |
| --- | --- |
| `VITE_MIFF_API_ORIGIN` | Absolute origin used when loading `/api/miff/content` (defaults to `window.location.origin`). |
| `VITE_MIFF_DESKTOP_BASE` | Custom base path for build outputs (useful for GitHub Pages). |
| `VITE_MIFF_DESKTOP_MOCKS` | Set to `true` to force mock content. You can also append `?mocks=1` to the URL for an ad-hoc Storybook-like mock view. |

## Mock / visual testing mode

When the API is unavailable, the provider automatically falls back to bundled mock data and surfaces a badge so you know you are not looking at live MIFF modules. Use mock mode to iterate on visuals without a backend.
