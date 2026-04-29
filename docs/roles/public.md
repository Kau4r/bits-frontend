# Public (Unauthenticated)

**Default landing:** `/` → `PublicLandingGate` (mobile: `StudentPublicLanding`; desktop: redirect to `/login`)
**Backend modules touched:** rooms (public endpoints), tickets (anonymous submit)

## Routes

| Path | Page | Purpose |
|---|---|---|
| `/` | `PublicLandingGate` (inline) | Device check: mobile → `StudentPublicLanding`; desktop → redirect to `/login` |
| `/login` | `Login.tsx` | Credential login form |
| `/student` | `StudentDesktopPlaceholder.tsx` | Desktop notice telling students to use the mobile page |
| `*` | `LoginRedirect` (inline) | Any unknown path redirects to `/` preserving `state.from` |

## Components (`pages/public/components/`)

- `MobileOpenedLabCard.tsx` — card showing an opened lab (name, type, capacity, schedule window, opened-by, queue status badge OPEN/NEAR_FULL/FULL)
- `MobileLectureCard.tsx` — tappable card for a lecture room (name, capacity, availability badge); tap opens the 7-day schedule drawer
- `PublicReportIssueModal.tsx` — anonymous issue report form: reporter identifier (name/ID), room picker, issue type, equipment (hardware only), PC number (optional), description; rate-limited server-side (HTTP 429)
- `RoomSchedule7DayDrawer.tsx` — bottom sheet showing today's schedule for a lecture room as a timeline (7 AM–9 PM, 44 px/hr); distinguishes class schedules (red) from bookings (blue)

## Services

- `services/publicRooms.ts` → backend `rooms/` public endpoints — `getPublicOpenedLabs`, `getPublicLectureRooms`, `getPublicRoomSchedule`, `getPublicRooms`, `createPublicTicket`

## Workflows

1. **Mobile public landing** — unauthenticated mobile visitor arrives at `/`; sees `StudentPublicLanding` with opened labs (polled every 60 s) and lecture rooms; can tap a lecture room to open `RoomSchedule7DayDrawer` showing today's schedule.
2. **Report issue (anonymous)** — floating red FAB on `StudentPublicLanding` opens `PublicReportIssueModal`; no account required; reporter provides a name/student-ID string; submits via `createPublicTicket`; auto-closes 2 s after success.
3. **Desktop** — desktop visitors at `/` are redirected to `/login`; navigating to `/student` shows `StudentDesktopPlaceholder` with a message directing students to use the mobile page.
4. **Login** — `/login` renders `Login.tsx`; on success, Auth context redirects to `state.from` or the role-appropriate default landing.

## Permissions

- Can: view opened labs, lecture rooms, today's room schedule; submit anonymous issue reports
- Cannot: access any authenticated route; the `*` catch-all redirects all unknown paths back to `/` (which goes to login for desktop)

## Gotchas

- `PublicLandingGate` uses `useIsMobile` (from `@/hooks/useIsMobile`) to branch; the hook checks `window.innerWidth`. On desktop, even visiting `/` immediately redirects to `/login` — there is no public landing page for desktop users.
- `RoomSchedule7DayDrawer` fetches a 7-day window from the backend but only renders today's date (`todayStr` filter client-side).
- `PublicReportIssueModal` has a `reporterIdentifier` field (not tied to any user account) — this is the only unauthenticated ticket-creation path in the system.
- The `MobileOpenedLabCard` shows a `Queue_Status` badge (`OPEN`/`NEAR_FULL`/`FULL`) sourced from `lab.Queue_Status || booking?.Queue_Status`; older API responses that omit this field default to `OPEN`.
