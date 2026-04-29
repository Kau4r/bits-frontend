# Admin (SysAd)

**Default landing:** `/` → `UserPage` (SysAdDash)
**Backend modules touched:** users, rooms, schedules, maintenance, upload

## Routes

| Path | Page | Purpose |
|---|---|---|
| `/` | `UserPage.tsx` | User account management: filterable/sortable table of all users |
| `/room` | `RoomPage.tsx` | Room CRUD: create, view, edit rooms with status/type/capacity |
| `/schedule-import` | `ScheduleImportPage.tsx` | Bulk import class schedules from an `.xlsx` offered-courses workbook |
| `/maintenance` | `MaintenancePage.tsx` | School-year archive and operational data cleanup |
| `/user/:email` | `UserDetailsPage.tsx` | Individual user detail: role/status edit + activity log |

## Components (`pages/sysad/components/`)

- `AddUserModal.tsx` — modal for creating a new user account
- `ConfirmModal.tsx` — generic confirmation dialog used in sysad flows
- `DeleteRoomConfirmModal.tsx` — failsafe modal for room deletion: requires the SysAd to type the room name exactly before the Delete button is enabled; surfaces server-side rejection (e.g. active/future bookings) inline
- `RoleChangeConfirmModal.tsx` — failsafe modal for role changes: shows in-flight items for the user, requires a written reason, invalidates their auth token server-side
- `RoomCard.tsx` — card tile for one room (sysad variant with edit/view actions)
- `RoomModal.tsx` — view/add/edit modal for a room (name, capacity, type, bookable flag, lab type); the view/edit footer also exposes a Delete action that opens `DeleteRoomConfirmModal`
- `SysAdPageShell.tsx` — layout shell with eyebrow label, title, description, and optional action slot; used by all sysad pages

## Services

- `services/user.ts` → backend `users/` — `fetchUsers`, `fetchUsersByRole`, `updateUser`, `fetchUserActivity`
- `services/room.ts` → backend `rooms/` — `getRooms`, `createRoom`, `updateRoom`, `deleteRoom`
- `services/scheduleImport.ts` → backend `upload/` — `previewOfferedCourseImport`, `importOfferedCourseSchedules`
- `services/maintenance.ts` → backend `maintenance/` — `getCleanupPreview`, `runCleanup`, `getSchoolYearArchivePreview`, `runSchoolYearArchiveCleanup`

## Workflows

1. **User management** — browse `/`, search/filter by name, email, or role; click a row to navigate to `/user/:email` where role and active status can be edited; role changes go through `RoleChangeConfirmModal` which forces re-authentication.
2. **Room management** — on `/room`, add new rooms (type, capacity, bookable flag, lab type for LAB rooms), view or edit existing rooms; rooms are sorted via `sortRoomsForDisplay` utility.
   - **Delete a room** — open the room (View Details), click **Delete** in the footer of `RoomModal`, then in `DeleteRoomConfirmModal` type the room's exact name to enable the Delete button. The backend rejects the call when the room has any active or future non-cancelled bookings; the modal renders that error inline so it can be remediated (cancel/move bookings) before retrying. On success the room (and its recurring schedules + historical bookings) are removed in a single Prisma transaction and the row is dropped from the page list.
3. **Schedule import** — on `/schedule-import`, upload an `.xlsx` workbook, select sheets and options, click Preview to see parsed rows with status (valid/invalid/unknown_room/conflict/duplicate), then click Import Valid Rows to write to the database.
4. **Maintenance/archive** — on `/maintenance`, preview what would be deleted or archived; enter the school year (e.g. `2025-2026`), preview, type the exact confirmation phrase, then run archive-and-cleanup or emergency cleanup separately.

## Permissions

- Can: full user CRUD (role changes, active toggle, password reset trigger); full room CRUD including deletion (ADMIN-only — `LAB_HEAD` can create/edit but not delete); bulk schedule import; school-year archive and database cleanup
- Cannot: access lab-specific operational routes (inventory, borrowing, forms, tickets, room queue); those pages redirect to `/unauthorized` for ADMIN role

## Gotchas

- `UserDetailsPage` receives the `User` object via React Router `state.from` (passed by `UserPage` on row click). Navigating directly to `/user/:email` without state causes an immediate "Loading…" / redirect-back scenario.
- `RoleChangeConfirmModal` calls a backend endpoint that bumps `Token_Valid_After`, forcing the changed user to re-login; this is intentional and non-negotiable for security.
- `ScheduleImportPage` only reads three specific sheet names from the workbook: `Offered Course`, `Requested Course`, `Requested Course by Other Dept.`; any other sheets are ignored.
- `MaintenancePage` has two independent flows (school-year archive and emergency reset) with separate confirmation texts; they must not be confused.
- Room deletion is destructive: it cascades `Schedule` rows and historical `Booked_Room` rows for the room in a single transaction. The server's only guardrail is "no active or future non-cancelled bookings" — there is no soft-delete or undo, so the type-the-room-name confirmation in `DeleteRoomConfirmModal` is the last line of defense. Past bookings tied to the room are also lost; if you need them for reporting, run a school-year archive first.
