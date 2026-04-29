# BITS Frontend — Multi-Role Workflows

> Claude-first reference. Each flow has an anchor heading for direct linking.
> Steps use WHO / WHERE / WHAT / BACKEND / NEXT format.
> "uncertain — verify" marks steps not directly traceable from source files.

---

## Session Lifecycle {#session-lifecycle}

**Roles involved:** Student (active), Lab Tech / Lab Head (passive — receive tickets if issues reported)

**Entry point:** Student authenticates via mobile `StudentPublicLanding` or is redirected to `/student-session`.

1. **Student logs in (mobile)**
   - WHO: Student
   - WHERE: `pages/public/StudentPublicLanding.tsx` (mobile) or `pages/Login.tsx` (desktop blocked for students)
   - WHAT: Submits credentials
   - BACKEND: `POST /auth/login` → returns `{ token, user }`
   - NEXT: `AuthContext` stores token in localStorage; `HeartbeatContext` mounts and begins auto-detection

2. **Computer auto-detection**
   - WHO: Student (automatic on mount)
   - WHERE: `context/HeartbeatContext.tsx` — `detectComputer()` effect
   - WHAT: Calls `getLocalIP()` (`lib/networkUtils`) to read client IP, then registers with backend
   - BACKEND: `POST /heartbeat/register` with `{ client_ip }` → backend module: `heartbeat`
   - NEXT: Success → `computer` + `sessionId` (crypto.randomUUID) stored in context, `isActive = true`. Failure → `detectionFailed = true`

3. **Manual computer selection (fallback)**
   - WHO: Student
   - WHERE: `pages/student/components/ComputerSelector.tsx` (rendered when `detectionFailed === true`)
   - WHAT: Fetches computer list, student picks their PC, clicks "Start Session"
   - BACKEND: `GET /computers` → module: `computers`
   - NEXT: `startHeartbeat(computer, sessionId)` called on `HeartbeatContext` → `isActive = true`

4. **Session dashboard displayed**
   - WHO: Student
   - WHERE: `pages/student/SessionPage.tsx`
   - WHAT: `SessionBar` renders current computer/room info + lab usage window (from `getOpenedLabs()`). Student sees search bar and shortcuts.
   - BACKEND: `GET /rooms/opened-labs` (via `services/room.getOpenedLabs`) → module: `rooms`
   - NEXT: Heartbeat interval begins (via `useHeartbeatInterval` hook)

5. **Heartbeat pulses**
   - WHO: Student (automatic, interval-driven)
   - WHERE: `hooks/useHeartbeat.ts` (interval hook used inside `SessionBar`)
   - WHAT: Sends periodic heartbeat to keep session alive
   - BACKEND: `POST /heartbeat` with `{ sessionId, computerId, ... }` → module: `heartbeat`
   - NEXT: Session stays active; backend can mark computer as `IN_USE`

6. **Student browses PC / Room view**
   - WHO: Student
   - WHERE: `pages/student/PCViewPage.tsx` → `components/PCview.tsx` | `pages/student/RoomViewPage.tsx` → `components/Room.tsx`
   - WHAT: Views computers in their room; sees availability status
   - BACKEND: `GET /computers?roomId=X` → module: `computers`
   - NEXT: Optional — report issue

7. **Student reports an issue**
   - WHO: Student
   - WHERE: `pages/student/components/SessionBar.tsx` → `ReportIssueModal` (`components/ReportIssue.tsx`)
   - WHAT: Submits issue description, type, equipment, PC number; `handleReportIssue` maps issue type to ticket category
   - BACKEND: `POST /tickets` with `{ Reported_By_ID, Report_Problem, Location, Room_ID, Category, Status: 'PENDING' }` → module: `tickets`
   - NEXT: Lab Tech receives notification via WebSocket; ticket appears in `/tickets`

8. **Student ends session**
   - WHO: Student
   - WHERE: `pages/student/components/SessionBar.tsx` — "End Session" button
   - WHAT: Calls `endSession(sessionId)` then `stopHeartbeat()`; if no `onEndSession` prop, calls `logout()` and navigates to `/login`
   - BACKEND: `DELETE /heartbeat/session/:sessionId` → module: `heartbeat`; then `POST /auth/logout` → module: `auth`
   - NEXT: Session closed; computer status updated to available by backend

---

## Borrowing {#borrowing}

**Roles involved:** Faculty or Student (requestor), Lab Tech / Lab Head (approver)

1. **Requestor submits borrow request**
   - WHO: Faculty (from `pages/scheduling/SchedulingPage.tsx` sidebar `CalendarSidebar`) or Student (uncertain — verify page; no dedicated student borrowing page found in routes)
   - WHERE: Faculty — `CalendarSidebar` borrowing request section (sidebar of `SchedulingPage`); `getBorrowings({ role: 'borrower' })` loads their own requests
   - WHAT: Creates a borrowing request for an item type with return date and purpose
   - BACKEND: `POST /borrowing` with `{ borrowerIdentifier, itemId or requestedItemType, returnDate, purpose }` → module: `borrowing`
   - NEXT: Record created with `Status: PENDING`; backend fires notification to Lab Tech via WebSocket / notification module

2. **Lab Tech sees pending request**
   - WHO: Lab Tech
   - WHERE: `pages/labtech/BorrowingPage.tsx` — "Pending Review" tab (`activeTab === 'pending'`)
   - WHAT: Page loads on mount + subscribes to real-time updates via `useBorrowingEvents()` hook; stat tile shows pending count
   - BACKEND: `GET /borrowing` → module: `borrowing`; also `GET /inventory` + `GET /rooms` to populate approval picklist
   - NEXT: Lab Tech opens `ApprovalModal` or `RejectionModal`

3. **Lab Tech approves request**
   - WHO: Lab Tech
   - WHERE: `pages/labtech/BorrowingPage.tsx` → `components/ApprovalModal.tsx`
   - WHAT: Optionally assigns a specific inventory item (filtered by requested type; OTHER items always included); confirms approval
   - BACKEND: `PATCH /borrowing/:id/approve` with `{ assignedItemId? }` → module: `borrowing`
   - NEXT: Status → `APPROVED`; inventory item status → `BORROWED`; backend fires notification to requestor

4. **Lab Tech rejects request**
   - WHO: Lab Tech
   - WHERE: `pages/labtech/BorrowingPage.tsx` → `components/RejectionModal.tsx`
   - WHAT: Enters rejection reason
   - BACKEND: `PATCH /borrowing/:id/reject` with `{ reason }` → module: `borrowing`
   - NEXT: Status → `REJECTED`; requestor notified via WebSocket notification

5. **Walk-in borrowing (Lab Tech only)**
   - WHO: Lab Tech
   - WHERE: `pages/labtech/BorrowingPage.tsx` → "New Borrowing" button → `WalkinBorrowingModal.tsx`
   - WHAT: Creates a `BORROWED` record directly (bypasses PENDING) for in-person requests
   - BACKEND: `POST /borrowing/walkin` with `{ borrowerIdentifier, itemId, returnDate, purpose?, roomId? }` → module: `borrowing`
   - NEXT: Item immediately moves to `BORROWED` status in inventory

6. **Item returned**
   - WHO: Lab Tech
   - WHERE: `pages/labtech/BorrowingPage.tsx` — "Active" tab → `RequestCard` → "Mark Returned" action
   - WHAT: Lab Tech confirms physical return; optionally records condition
   - BACKEND: `PATCH /borrowing/:id/return` with `{ condition: 'AVAILABLE'|'DEFECTIVE', remarks }` → module: `borrowing`
   - NEXT: Status → `RETURNED`; inventory item status → `AVAILABLE` (or `DEFECTIVE`); requestor notified

---

## Ticketing {#ticketing}

**Roles involved:** Anyone (reporter), Lab Tech / Lab Head (resolver)

1. **Reporter submits ticket**
   - WHO: Student (via `SessionBar` ReportIssueModal) or Lab Tech / Lab Head (via `TicketsPage` "Report Issue" button)
   - WHERE: Students — `pages/student/components/SessionBar.tsx` → `components/ReportIssue.tsx`; Staff — `pages/tickets/TicketsPage.tsx` → `components/TicketingModal.tsx` (isCreating=true)
   - WHAT: Fills description, category (HARDWARE / SOFTWARE / FACILITY / OTHER), location (room + PC/equipment), optional item/room ID
   - BACKEND: `POST /tickets` with `{ Reported_By_ID, Report_Problem, Location, Room_ID?, Item_ID?, Category, Status: 'PENDING' }` → module: `tickets`
   - NEXT: Ticket created; backend fires notification → Lab Tech WebSocket receives TICKET event

2. **Lab Tech sees ticket in list**
   - WHO: Lab Tech or Lab Head
   - WHERE: `pages/tickets/TicketsPage.tsx` — default "Active" view (non-RESOLVED, non-Archived)
   - WHAT: Page auto-reloads when `NotificationContext` registers a new TICKET notification (ref-guarded dedup). `pendingTicketCount` in `NotificationContext` also updates.
   - BACKEND: `GET /tickets` → module: `tickets`
   - NEXT: Lab Tech opens ticket detail via row click or eye icon

3. **Lab Tech opens ticket detail**
   - WHO: Lab Tech or Lab Head
   - WHERE: `pages/tickets/TicketsPage.tsx` → `TicketingModal.tsx` (isCreating=false)
   - WHAT: Views reporter, description, location, category, status, current assignee, audit log timestamps
   - BACKEND: (data already loaded; modal uses local state from table row)
   - NEXT: Lab Tech assigns ticket to themselves or another tech

4. **Lab Tech assigns ticket**
   - WHO: Lab Tech or Lab Head
   - WHERE: `pages/tickets/components/TicketingModal.tsx`
   - WHAT: Selects technician from dropdown; triggers `assignTicket()`
   - BACKEND: `PUT /tickets/:id` with `{ Technician_ID, Status: 'IN_PROGRESS' }` → module: `tickets`
   - NEXT: Status → `IN_PROGRESS`; assignee now visible in ticket list; notification fires (uncertain — verify backend behavior)

5. **Lab Tech resolves ticket**
   - WHO: Lab Tech (assigned technician)
   - WHERE: `pages/tickets/components/TicketingModal.tsx`
   - WHAT: Updates status to RESOLVED
   - BACKEND: `PUT /tickets/:id` with `{ Status: 'RESOLVED' }` → module: `tickets`; backend logs `TICKET_RESOLVED` in `AuditLogs`
   - NEXT: Ticket moves out of active list; "Archive" button appears on resolved row; notification fires to reporter (uncertain — verify)

6. **Lab Tech archives resolved ticket**
   - WHO: Lab Tech or Lab Head
   - WHERE: `pages/tickets/TicketsPage.tsx` — Archive button on RESOLVED rows
   - WHAT: Calls `archiveTicket(id)` → sets `Archived: true`
   - BACKEND: `PUT /tickets/:id` with `{ Archived: true }` → module: `tickets`
   - NEXT: Ticket moves to "Archived" view; restorable via Restore button

---

## Schedule Import {#schedule-import}

**Roles involved:** Admin (SysAd) only

**Entry point:** Route `/schedule-import` — `ProtectedRoute roles={[ROLES.ADMIN]}`.

1. **Admin opens import page**
   - WHO: Admin
   - WHERE: `pages/sysad/ScheduleImportPage.tsx`
   - WHAT: Page renders file upload zone + import options (sheet selection, approvedOnly, skipDissolved, anchorDate)
   - BACKEND: (no backend call on page load)
   - NEXT: Admin selects `.xlsx` file

2. **Admin configures options**
   - WHO: Admin
   - WHERE: `pages/sysad/ScheduleImportPage.tsx` — options panel
   - WHAT: Chooses sheets (`Offered Course`, `Requested Course`, `Requested Course by Other Dept.`); toggles `approvedOnly` + `skipDissolved`; sets `anchorDate` (time-of-day anchor for recurring schedules); `timezoneOffsetMinutes` hard-coded to 480 (UTC+8)
   - BACKEND: (none yet)
   - NEXT: Admin clicks "Preview"

3. **Admin previews import**
   - WHO: Admin
   - WHERE: `pages/sysad/ScheduleImportPage.tsx` — Preview button
   - WHAT: Sends file + options as `multipart/form-data`; receives per-row status (`valid`, `invalid`, `conflict`, `duplicate`, `unknown_room`, `ambiguous_room`, `skipped`) + summary counts. Results displayed in two tables (Ready / Needs Attention). No data written.
   - BACKEND: `POST /schedules/import-offered-courses/preview` → module: `schedules`
   - NEXT: Admin reviews problem rows; may adjust options and re-preview, or proceed to import

4. **Admin confirms and imports**
   - WHO: Admin
   - WHERE: `pages/sysad/ScheduleImportPage.tsx` — "Import Valid Rows" button (disabled if `summary.valid === 0`)
   - WHAT: `ModalContext.showConfirm` prompts; on confirm, sends same file + options again (commit path)
   - BACKEND: `POST /schedules/import-offered-courses` → module: `schedules`; backend writes `Schedule` rows linked to rooms
   - NEXT: `ScheduleImportResult` returned; `summary.imported` count shown in success toast. Schedules now visible as pink read-only blocks on the booking calendar for all roles.

5. **Schedules visible to other roles**
   - WHO: Faculty, Secretary, Lab Head (read-only)
   - WHERE: `pages/scheduling/SchedulingPage.tsx` — `scheduleEvents` useMemo
   - WHAT: Booking calendar fetches rooms (which include `room.Schedule[]`); schedule events are expanded client-side from the `Days` + `Start_Time` / `End_Time` stored on each schedule row; rendered as pink FullCalendar events with `editable: false`
   - BACKEND: `GET /rooms` (includes nested `Schedule[]`) → module: `rooms`
   - NEXT: Users see class occupancy when creating bookings; conflict check probes these schedule events

---

## Room Booking {#room-booking}

**Roles involved:** Faculty (LAB/LECTURE rooms), Secretary (CONFERENCE/CONSULTATION rooms), Lab Head (all bookable rooms — can approve/reject)

1. **User opens scheduling page**
   - WHO: Faculty → `/faculty/scheduling`; Secretary → `/secretary/scheduling`; Lab Head → `/labhead-scheduling`
   - WHERE: All three route to the shared `pages/scheduling/SchedulingPage.tsx`
   - WHAT: Loads bookable rooms (`GET /rooms` filtered by `Is_Bookable !== false`) and all non-CANCELLED bookings
   - BACKEND: `GET /rooms` → module: `rooms`; `GET /bookings` → module: `bookings`
   - NEXT: FullCalendar renders existing bookings + class schedules; room sidebar shown.
     Event tint is derived per viewer by `lib/bookingDisplayColor.ts`: viewer's own bookings = whitish green, other users' bookings = whitish gray, scheduled classes = reddish white. Status (approved/pending) remains a separate corner dot.

2. **User selects time slot**
   - WHO: Faculty or Secretary
   - WHERE: `pages/scheduling/SchedulingPage.tsx` — FullCalendar `select` handler (`handleDateSelect`)
   - WHAT: Drags to select time range. Client-side `checkOverlap()` checks for existing APPROVED or PENDING bookings in selected room. If overlap found → `WarningModal` shown, flow stops. If clear → `BookingPopover` opens.
   - BACKEND: (client-side only at this stage)
   - NEXT: `BookingPopover` opens with pre-filled start/end times

3. **User fills booking details and submits**
   - WHO: Faculty or Secretary
   - WHERE: `BookingPopover` component (`components/BookingPopover.tsx`)
   - WHAT: Enters title, room (pre-selected), optional notes. Optional recurrence (RRULE). Client-side `checkSlotConflict()` probes both bookings and schedule events before submit.
   - BACKEND: Single booking → `POST /bookings`; recurring series → `POST /bookings/series` → module: `bookings`. On 409 conflict → error modal.
   - NEXT: Booking created with `Status: PENDING`. Calendar updates. Notification fires to approver (Lab Head for LAB rooms, Secretary for CONFERENCE rooms — uncertain — verify backend notification targets).

4. **Lab Head / Secretary approves or rejects**
   - WHO: Lab Head (for LAB/LECTURE rooms) or Secretary (for CONFERENCE/CONSULTATION rooms)
   - WHERE: `pages/scheduling/SchedulingPage.tsx` — click PENDING event → `BookingPopover` with `canApprove=true`
   - WHAT: Lab Head or Secretary clicks Approve or Reject. `applyToSeries` checkbox available for recurring bookings.
   - BACKEND: Single booking → `PATCH /bookings/:id/status` with `{ status, approverId }`; recurring series → `POST /bookings/series/:id/decision` with `{ status, applyToSeries, Original_Start }` → module: `bookings`
   - NEXT: Status → APPROVED (green) or REJECTED (hidden from calendar). Notification fires to requestor (uncertain — verify).

5. **User reschedules booking (drag)**
   - WHO: Booking owner (faculty/secretary who created it)
   - WHERE: `pages/scheduling/SchedulingPage.tsx` — FullCalendar `eventDrop` → `handleEventDrop`
   - WHAT: Drags event to new slot. Client-side overlap check. `ConfirmModal` asks user to confirm. On confirm, calls update.
   - BACKEND: Single booking → `PATCH /bookings/:id` with new times; recurring instance → `POST /bookings/series/:id/overrides` → module: `bookings`
   - NEXT: Calendar reflects new time; status reset to PENDING (uncertain — verify backend behavior on reschedule)

6. **User cancels booking**
   - WHO: Booking owner
   - WHERE: `BookingPopover` — Remove action
   - WHAT: Sets status to CANCELLED (single) or excludes date / deletes series (recurring)
   - BACKEND: `PATCH /bookings/:id/status` `{ status: 'CANCELLED' }`; or `POST /bookings/series/:id/exclude`; or `DELETE /bookings/series/:id` → module: `bookings`
   - NEXT: Booking removed from calendar

---

## Inventory Audit {#inventory-audit}

**Roles involved:** Lab Tech, Lab Head

**Entry point:** Route `/inventory-audit` — `ProtectedRoute roles={[ROLES.LAB_TECH, ROLES.LAB_HEAD]}`.

1. **Lab Tech opens audit page**
   - WHO: Lab Tech or Lab Head
   - WHERE: `pages/labtech/InventoryAuditPage.tsx`
   - WHAT: Loads all rooms and active semester on mount
   - BACKEND: `GET /rooms` → module: `rooms`; `GET /semesters/active` (via `services/semesters.getActiveSemester`) → module: `semesters`
   - NEXT: Lab Tech picks a room from the FloatingSelect dropdown

2. **Lab Tech selects a room**
   - WHO: Lab Tech
   - WHERE: `pages/labtech/InventoryAuditPage.tsx` — room picker
   - WHAT: Triggers `refreshRoomAudit(roomId)`: loads all inventory filtered to selected room + room audit status
   - BACKEND: `GET /inventory` → module: `inventory`; `GET /rooms/:id/audit-status` (via `services/room.getRoomAuditStatus`) → module: `rooms`
   - NEXT: Progress bar and item list rendered; PC groups panel shown if PCs have associated items

3. **Lab Tech checks items manually**
   - WHO: Lab Tech
   - WHERE: `pages/labtech/InventoryAuditPage.tsx` — item list (tap/click item row)
   - WHAT: Tapping an unchecked item calls `checkInventoryItem(itemId)`; tapping a checked item calls `uncheckInventoryItem(itemId)`. "Check PC" button calls `markAllOnPc(pcName)` which iterates unchecked items on that PC and checks each sequentially.
   - BACKEND: `POST /inventory/:id/check` (check) or `DELETE /inventory/:id/check` (uncheck) → module: `inventory`
   - NEXT: Item's `Last_Checked_At` updated; progress bar advances

4. **Lab Tech scans QR codes**
   - WHO: Lab Tech (mobile)
   - WHERE: `pages/labtech/InventoryAuditPage.tsx` — "Scan Item or PC QR" button → camera overlay (`@zxing/browser`)
   - WHAT: Camera decodes QR value. If matches `Item_Code` → checks that item. If matches a PC name → checks all items on that PC via `markAllOnPc()`. 2-second cooldown prevents double-scan.
   - BACKEND: `POST /inventory/:id/check` → module: `inventory`
   - NEXT: Item checked; toast confirms. Progress bar advances.

5. **Audit complete**
   - WHO: Lab Tech
   - WHERE: `pages/labtech/InventoryAuditPage.tsx` — progress bar reaches 100%
   - WHAT: Banner appears: "Room audit complete — you can now export this room's report." `auditStatus.allChecked === true`.
   - BACKEND: (no explicit submit; progress tracked via `Last_Checked_At` fields)
   - NEXT: Lab Tech navigates to Reports page to export

6. **Lab Tech exports inventory report**
   - WHO: Lab Tech
   - WHERE: `pages/labtech/ReportsPage.tsx`
   - WHAT: Triggers CSV download for the audited room or full inventory
   - BACKEND: `GET /reports/inventory.csv?roomId=X` → module: `reports` (via `services/reports.downloadInventoryReportCsv`)
   - NEXT: CSV file downloaded to browser; audit evidence preserved
