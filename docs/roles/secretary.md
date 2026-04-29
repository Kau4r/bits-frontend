# Secretary

**Default landing:** `/` → `SecretaryScheduling` (`/secretary/scheduling`)
**Backend modules touched:** bookings, schedules, rooms

## Routes

| Path | Page | Purpose |
|---|---|---|
| `/` | `SchedulingPage.tsx` (secretary) | Scheduling calendar restricted to consultation and conference rooms only |
| `/secretary/scheduling` | `SchedulingPage.tsx` (secretary) | Explicit alias (same component) |

## Components (`pages/secretary/components/`)

_No role-specific components directory exists for secretary. The page uses only the shared `Scheduling` component and shared UI._

## Services

- `services/booking.ts` → backend `bookings/` — create/view bookings via the shared scheduling component
- `services/bookingSeries.ts` → backend `bookings/` — recurring booking series
- `services/room.ts` → backend `rooms/` — `getRooms` filtered to allowed types inside the shared component

## Workflows

1. **Room booking** — the secretary lands on the scheduling page and can browse, create, and manage room bookings. Only `CONSULTATION` and `CONFERENCE` room types are visible (enforced via `allowedRoomTypes` prop to the shared `Scheduling` component).
2. **Logout** — the only nav-bar action is a logout button (no notifications, no borrow, no report-issue).

## Permissions

- Can: create and manage bookings for consultation and conference rooms
- Cannot: access lab rooms, lecture rooms, any inventory or staff-facing pages, notifications bell, borrow equipment, or report issues

## Gotchas

- The room-type restriction (`CONSULTATION`, `CONFERENCE`) is applied via a prop (`allowedRoomTypes`) passed to the shared `Scheduling` component. The filtering happens inside `Scheduling`, not in the secretary page itself — so if the shared component's filter logic changes, secretary access scope changes too.
- The secretary page has no notification bell, no borrow button, and no report-issue button — the nav bar contains only the BITS logo, name greeting, and logout.
