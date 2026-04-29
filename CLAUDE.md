# BITS Frontend

## Stack
- React 19 + TypeScript + Vite
- Tailwind CSS v4 (`@import` syntax)
- UI primitives: shadcn/ui pattern (Radix UI + CVA) in `src/ui/`
- Icons: Lucide React (consolidated from 3 libraries)
- State: React Context (Auth, Notification, Heartbeat, Modal)
- Routing: React Router v7
- HTTP: Axios with auto-unwrapping interceptor

## Documentation map (READ FIRST when working role-specific code)

When the task touches a specific role's pages or components, read the matching role doc **before** editing:

- `docs/roles/_index.md` — overview table of all 6 roles + public surface
- `docs/roles/admin.md` — sysad pages
- `docs/roles/lab-tech.md` — lab tech pages (largest)
- `docs/roles/lab-head.md` — inherits from lab-tech, plus extras
- `docs/roles/student.md` — student session/PC/room views
- `docs/roles/faculty.md` — scheduling
- `docs/roles/secretary.md` — scheduling
- `docs/roles/public.md` — unauthenticated routes

Cross-cutting (anything spanning multiple roles):

- `docs/cross-cutting.md` — notifications, tickets, layout, auth gates, contexts, shared UI, monitoring (parked), scheduling primitives
- `docs/flows.md` — multi-role workflows (session lifecycle, borrowing, ticketing, schedule import, room booking, inventory audit)

For backend endpoints these pages call, see `../bits-backend/docs/roles-permissions.md`.

## Project Structure
```
src/
├── app/          # Entry points (App.tsx, main.tsx)
├── ui/           # shadcn/ui primitives (Button, Modal, Card, Badge, Search, etc.)
├── components/   # Global shared components
├── pages/        # Role-based — see docs/roles/_index.md
│   └── <role>/components/  # Role-specific components
├── services/     # Centralized API calls (auto-unwrapped envelope)
├── hooks/        # Custom hooks
├── context/      # React context providers
├── layout/       # Layout + Navbar
├── lib/          # Utilities (cn, constants, networkUtils)
├── types/        # TypeScript type definitions
└── styles/       # CSS files
```

## Conventions
- Path alias: `@/` maps to `src/`. Use `@/` everywhere — not relative paths between directories.
- UI primitives in `src/ui/` — use these instead of inline styling for buttons, modals, cards, badges.
- Status colors centralized in `src/lib/constants.ts`. Primary color: indigo-600.
- Desktop-first responsive design.
- API responses auto-unwrapped by axios interceptor — `response.data` is the payload directly.
- Service naming: `getX`, `createX`, `updateX`, `deleteX`.

## Commands
```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm test         # Run Vitest tests (unit/component)
npm run lint     # ESLint
```

## UI / End-to-end verification — use Playwright MCP

When verifying UI changes (the "test the feature in a browser" step) **prefer the Playwright MCP tools** over hand-rolled descriptions, screenshots the user has to take, or "please click X and tell me what happens" loops. Playwright tools drive a real Chromium and are far cheaper than asking the user to verify visually.

**Prerequisite:** dev server running. Start with `npm run dev` (default `http://localhost:5173`) in a background shell before driving the browser.

**Test credentials (dev seed):** username = role, password = `<role>123`. So:

| Role | Username | Password |
|---|---|---|
| Faculty | `faculty` | `faculty123` |
| Secretary | `secretary` | `secretary123` |
| Lab Head | `labhead` | `labhead123` |
| Lab Tech | `labtech` | `labtech123` |
| Student | `student` | `student123` |
| Admin / SysAd | `admin` | `admin123` |

Use these for `browser_fill_form` on `/login`. If a credential fails, the seed may have drifted — ask the user before guessing.

**Core tools** (prefix `mcp__plugin_playwright_playwright__`):
- `browser_navigate` — go to a URL (e.g. `http://localhost:5173/login`)
- `browser_snapshot` — accessibility tree + element refs (use this **before** clicking; it gives you the `ref` IDs to target)
- `browser_click` / `browser_type` / `browser_fill_form` / `browser_select_option` — interact
- `browser_press_key` — keyboard input (Tab, Enter, Escape, Arrow keys)
- `browser_wait_for` — wait for text/element/timeout
- `browser_console_messages` — pull console logs (catch React warnings, runtime errors)
- `browser_network_requests` — verify API calls fired with correct params
- `browser_take_screenshot` — when a visual diff matters; otherwise prefer `browser_snapshot`
- `browser_evaluate` — run JS in the page (read localStorage, inspect store state)
- `browser_resize` — exercise responsive behavior (mobile vs desktop layouts)

**Typical flow for a feature verification:**
1. Start dev server in background.
2. `browser_navigate` to login → `browser_fill_form` → submit → `browser_wait_for` redirect.
3. Navigate to the page under test → `browser_snapshot` to confirm structure.
4. Drive the interaction (`browser_click`, `browser_type`, etc.) → snapshot again to confirm state changed.
5. `browser_console_messages` + `browser_network_requests` to surface silent failures.
6. Close with `browser_close` when done so the next session starts fresh.

**Prefer this over Vitest for:** end-to-end booking flows, multi-component interactions, role-based redirects, modal/popover behavior, anything that depends on the FullCalendar / RoomCombobox / drag-and-drop runtime.

**Keep using Vitest for:** pure component logic, hooks, utility functions, anything that doesn't need the live API or DOM rendering pipeline.

**Do not** report a UI feature as "complete" without either a Playwright run or an explicit "I can't drive this with Playwright because…" — type-check + lint passing is necessary, not sufficient.

## Design Reference
- `InventoryPage` is the gold standard for spacing/layout.
- Spacing: `p-6`, `mb-6` between sections.
- Cards: `rounded-xl`, `border-gray-200`, `shadow-sm`.
- Buttons: `rounded-lg`, `font-semibold`.

## Update discipline (keep docs in sync)
When you change the codebase, update the matching doc in the **same commit**:

- Add/remove/rename a route → update `docs/roles/<role>.md` + `docs/roles/_index.md`
- Change a multi-role workflow → update `docs/flows.md`
- Add/remove a cross-cutting feature (notification, ticket, layout, context, shared UI) → update `docs/cross-cutting.md`
- Add a new role-specific component → update its role's component list in `docs/roles/<role>.md`

If a doc disagrees with the code, the code wins — fix the doc, don't trust stale guidance.
