# Student

**Default landing:** `/` → `StudentSession` (`/student-session`)
**Backend modules touched:** rooms, bookings, heartbeat, computers

## Routes

| Path | Page | Purpose |
|---|---|---|
| `/` | `SessionPage.tsx` | Home screen: BITS branding, Google/URL search bar, browser shortcuts, active session bar |
| `/student-session` | `SessionPage.tsx` | Explicit alias for the session home (same component) |
| `/student-pc-view` | `PCViewPage.tsx` | PC-centric view: shows the computer the student is assigned to |
| `/student-room-view` | `RoomViewPage.tsx` | Room view: opened lab cards and lecture room schedule blocks |

## Components (`pages/student/components/`)

- `AddShortcut.tsx` — dialog to add a custom browser shortcut tile
- `Computer.tsx` — single PC slot component (status, name, seated indicator)
- `ComputerSelector.tsx` — grid of PC slots for picking/viewing assignment in a room
- `LectureCard.tsx` — card for a lecture room showing today's schedule blocks
- `OpenedLabCard.tsx` — card for an opened lab room (capacity, schedule, opened-by)
- `PCview.tsx` — full PC view layout: shows the student's assigned computer details
- `ReportIssue.tsx` — modal for authenticated students to report a hardware/software issue (creates a ticket)
- `Room.tsx` — room layout component rendering the grid of PCs
- `SessionBar.tsx` — persistent top bar showing current session info (room, PC, time remaining)
- `Shortcuts.tsx` — browser shortcut grid with add/remove; persisted locally

## Services

- `services/room.ts` → backend `rooms/` — `getOpenedLabs`, `getOpenedLabRoom`
- `services/computers.ts` → backend `computers/` — fetches PC assignments
- `services/heartbeat.ts` → backend `heartbeat/` — session keepalive via `HeartbeatProvider`
- `services/booking.ts` → backend `bookings/` — read own bookings for session context
- `services/tickets.ts` → backend `tickets/` — `createTicket` via `ReportIssue` modal

## Workflows

1. **Session** — student lands on `SessionPage`; `SessionBar` shows their active room/PC assignment. They can search the web directly from the session home.
2. **PC navigation** — tap "Go to PC View" to reach `PCViewPage`; navigate back to room view via `RoomViewPage`.
3. **Room availability** — `RoomViewPage` shows all currently opened labs (polled every 60 s) and lecture rooms with today's schedule blocks.
4. **Report issue** — `ReportIssue` modal (accessible from PCViewPage context) creates a ticket tagged with room and PC number.

## Permissions

- Can: view own session, opened labs, lecture room schedules, search the web from the session page, report issues
- Cannot: access any staff or admin routes; borrowing requests from the student authenticated session are not exposed (faculty role handles borrowing)

## Gotchas

- Student accounts are blocked from `/student` (the public desktop route) which shows `StudentDesktopPlaceholder` — that route is for unauthenticated desktop visitors arriving at `/student`.
- `SessionBar` relies on `HeartbeatContext` to determine session status; if heartbeat fails the session may appear inactive even if the student is logged in.
- `RoomViewPage` converts backend `OpenedLabRoom` data to a local shape (`convertToLabRoom`) and separately fetches lecture rooms via raw `api.get('/rooms')` filtered by `Room_Type === 'LECTURE'`.
