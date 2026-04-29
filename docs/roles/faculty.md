# Faculty

**Default landing:** `/` → `FacultyScheduling` (`/faculty/scheduling`)
**Backend modules touched:** bookings, schedules, inventory, borrowing, notifications, tickets, rooms

## Routes

| Path | Page | Purpose |
|---|---|---|
| `/` | `SchedulingPage.tsx` (faculty) | Scheduling calendar + borrowing request modal + report-issue modal; own notification bell |
| `/faculty/scheduling` | `SchedulingPage.tsx` (faculty) | Explicit alias (same component) |

## Components (`pages/faculty/components/`)

- `MyBorrowingRequests.tsx` — inline panel listing the faculty member's own borrowing requests (pending + active loans with countdown timer); calls `getBorrowings({ role: 'borrower' })`

## Services

- `services/booking.ts` → backend `bookings/` — fetch/create bookings shown in the shared scheduling page
- `services/bookingSeries.ts` → backend `bookings/` — recurring booking series (used by shared `Scheduling` component)
- `services/inventory.ts` → backend `inventory/` — `getInventory` to populate borrowable item types in the borrow modal
- `services/borrowing.ts` → backend `borrowing/` — `createBorrowing`, `getBorrowings({ role: 'borrower' })`
- `services/notifications.ts` → backend `notifications/` — `getNotifications`, `markAsRead` for the bell dropdown
- `services/tickets.ts` → backend `tickets/` — `createTicket` for the Report Issue flow
- `services/room.ts` → backend `rooms/` — `getRooms` for room picker in the borrow modal; `getBookings` for active-room context in the issue report

## Workflows

1. **Scheduling** — the full-width `Scheduling` component is rendered with `showRejectedMyBookings` flag; faculty can create, view, and manage their own room bookings.
2. **Borrow a device** — click the "Borrow" button in the nav bar to open the inline borrow modal: pick item type (available count shown), select room, set borrow/return window, enter purpose, submit. A lab tech will assign the specific item.
3. **My borrowing requests** — `MyBorrowingRequests` component (rendered as part of the page, not in the nav) shows pending and active loans with a live countdown to the return deadline.
4. **Report issue** — click "Report Issue" in the nav bar; modal pre-populates the room from the faculty's current active booking; creates a ticket via `createTicket`.
5. **Notifications** — bell icon in the nav bar; dropdown lists the last 10 notifications from `NotificationContext`; real-time updates via `useBorrowingEvents`.

## Permissions

- Can: create/manage own room bookings (all room types); submit equipment borrowing requests; report issues; receive notifications
- Cannot: access inventory management, ticket queue, forms, borrowing approval, admin pages, or any lab-staff-only routes

## Gotchas

- The borrow modal submits a request with only `itemType` (no specific item ID); a lab tech must approve and assign the actual item. The available-count badge reflects only `Status === 'AVAILABLE' && IsBorrowable !== false` items.
- Room context for "Report Issue" is derived from the faculty's currently active approved booking (`Status === 'APPROVED'` with time overlap); if no active booking exists, the room defaults to `'General Facility'`.
- `FacultyScheduling` has its own notification dropdown implementation (not the shared `NotificationsCard`) — it renders a plain dropdown menu rather than the card used by lab staff.
