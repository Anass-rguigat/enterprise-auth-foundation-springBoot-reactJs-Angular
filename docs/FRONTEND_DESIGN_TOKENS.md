# Frontend design tokens (Phase 18)

Shared visual contract for **Angular** and **React**. Each SPA implements these tokens in its own CSS — no shared runtime package (keeps apps independently copyable).

SPA guides: [ANGULAR.md](ANGULAR.md) · [REACT.md](REACT.md).

## Direction

Enterprise administration UI: cool slate neutrals, teal accent, clear hierarchy. Light and dark themes. Not purple-gradient, not cream/terracotta broadsheet.

## Typography

| Role | Family | Notes |
|---|---|---|
| UI / body | `"IBM Plex Sans", "Segoe UI", sans-serif` | Forms, tables, nav |
| Display / brand | `"IBM Plex Serif", Georgia, serif` | Product name, page titles sparingly |

Load via each app’s `index.html` (Google Fonts or self-hosted later).

## Color tokens (CSS variables)

```css
:root {
  --color-bg: #f4f6f8;
  --color-surface: #ffffff;
  --color-surface-muted: #e8eef2;
  --color-border: #c5d0d8;
  --color-text: #14212b;
  --color-text-muted: #5a6b78;
  --color-accent: #0d7a6f;
  --color-accent-hover: #0a635a;
  --color-accent-contrast: #ffffff;
  --color-danger: #b42318;
  --color-success: #1b7a3d;
  --color-warning: #a15c00;
  --shadow-sm: 0 1px 2px rgb(20 33 43 / 8%);
  --radius-sm: 4px;
  --radius-md: 8px;
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --font-sans: "IBM Plex Sans", "Segoe UI", sans-serif;
  --font-display: "IBM Plex Serif", Georgia, serif;
  --sidebar-width: 15rem;
}

[data-theme="dark"] {
  --color-bg: #0f161c;
  --color-surface: #1a242c;
  --color-surface-muted: #243039;
  --color-border: #334552;
  --color-text: #e8eef2;
  --color-text-muted: #9aabb8;
  --color-accent: #2bb5a8;
  --color-accent-hover: #3fc9bc;
  --color-accent-contrast: #0f161c;
  --color-danger: #f97066;
  --color-success: #47cd89;
  --color-warning: #fdb022;
  --shadow-sm: 0 1px 2px rgb(0 0 0 / 40%);
}
```

## Component inventory (implement in Phases 19 / 23)

Button (primary/secondary/danger), text input, select, checkbox, form field + error, table, pagination, dialog, toast, empty/loading/error states, sidebar, topbar, page header.

**Angular (Phase 19):** implemented under `frontend/angular-app/src/app/shared/ui/` + shell layout.  
**React (Phase 23+):** implemented under `frontend/react-app/src/shared/ui/` + shell layout. Auth pages (Phase 24) reuse `AuthCard` / form kit.

## Accessibility

Visible focus rings using `--color-accent`; label every control; do not rely on color alone for errors.
