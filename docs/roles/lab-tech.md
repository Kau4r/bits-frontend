# Lab Technician

**Default landing:** `/` → `LabtechDashboard` (desktop) or `/labtech-mobile` → `InventoryMobile` (mobile)
**Backend modules touched:** dashboard, inventory, rooms, borrowing, forms, tickets, notifications, reports, computers, bookings, semesters

## Routes

| Path | Page | Purpose |
|---|---|---|
| `/` | `DashboardPage.tsx` | Summary dashboard: ticket/form/report counts + inventory pie charts + notifications panel |
| `/labtech-dashboard` | `DashboardPage.tsx` | Explicit alias for the dashboard (same component) |
| `/labtech-mobile` | `InventoryMobile.tsx` | Mobile-first inventory list with scan-to-audit shortcut |
| `/inventory` | `InventoryPage.tsx` | Full inventory table with bulk status/room/brand editing |
| `/inventory/item/:itemCode` | `InventoryItemInfoPage.tsx` | QR-code deep-link: detail view + inline edit for a single item |
| `/inventory-audit` | `InventoryAuditPage.tsx` | Semestral QR-scan audit: pick room, check items off via camera or manual tap |
| `/labtech/room` | `RoomPage.tsx` | Room grid + Computer Use Queue (daily and weekly swimlane views) |
| `/labtech/room/:roomId/print-qr` | `RoomQRPrintPage.tsx` | Printable QR sheet for one room's items and/or PCs |
| `/forms` | `FormsPage.tsx` | WRF/RIS form lifecycle: create, status update, department transfer, attachments |
| `/labtech/borrowing` | `BorrowingPage.tsx` | Borrowing request queue: approve, reject, walk-in create, mark returned |
| `/tickets` | `TicketsPage.tsx` | Ticket inbox: view, assign-to-self, resolve |
| `/notification` | `NotificationPage.tsx` | Notification centre |
| `/reports` | `ReportsPage.tsx` | Personal weekly activity reports: draft, submit, CSV export |
| `/monitoring` | redirect → `/` | Unused stub; redirects home |

## Components (`pages/labtech/components/`)

- `ActiveQueueDashboard.tsx` — live view of active student-use queue slots per lab category; supports overflow-room preset
- `AddFormDialog.tsx` — modal for creating a new WRF or RIS form with file upload
- `ApprovalModal.tsx` — confirm borrowing approval and assign a specific inventory item
- `DeptSelect.tsx` — dropdown that lists valid next-step departments for a form type
- `FileBadge.tsx` — small UI chip indicating file type (pdf/image/doc)
- `InlineTimeline.tsx` — horizontal form-workflow timeline showing current step + history
- `InventoryDashboard.tsx` — status/type summary cards for inventory; click-to-filter integration
- `InventoryItemCombobox.tsx` — searchable combobox for picking an existing inventory item
- `InventorySidePanel.tsx` — slide-in detail panel for a selected inventory item
- `InventoryStatCards.tsx` — stat tiles (available/borrowed/defective counts)
- `ItemComboBox.tsx` — combobox for item selection in borrowing flows
- `ItemModal.tsx` — view/edit/add modal for a single inventory item
- `QueueModal.tsx` — single-session or weekly-batch room queue booking dialog
- `RejectionModal.tsx` — confirm borrowing rejection with reason field
- `ReturnForRevisionModal.tsx` — send a form back to a prior department with reason
- `RoomCard.tsx` — card tile for one room (name, type, status, next schedule)
- `RoomDetailModal.tsx` — expanded room detail overlay with today's sessions
- `RoomExportButton.tsx` — triggers QR print-sheet navigation for a room
- `RowPreview.tsx` — single row in the schedule-import preview table (status badge + course/room/reason columns); imported by `ScheduleImportPage` in sysad
- `StatusSelect.tsx` — dropdown for selecting a form status (PENDING/IN_REVIEW/APPROVED/etc.)
- `SummaryStrip.tsx` — aggregate queue summary bar (total queued, open rooms, filled count)
- `TimeSlotGrid.tsx` — hour-grid slot picker used inside QueueModal
- `WalkinBorrowingModal.tsx` — create an immediate walk-in borrowing record without a prior request
- `WeeklyReportDialog.tsx` — dialog for composing/editing a weekly activity report
- `WeeklySwimlaneGrid.tsx` — 7-day swimlane grid of room sessions per lab category

## Services

- `services/dashboard.ts` → backend `dashboard/`
- `services/inventory.ts` → backend `inventory/`
- `services/room.ts` → backend `rooms/`
- `services/borrowing.ts` → backend `borrowing/`
- `services/forms.ts` → backend `forms/`
- `services/tickets.ts` → backend `tickets/`
- `services/notifications.ts` → backend `notifications/`
- `services/reports.ts` → backend `reports/`
- `services/computers.ts` → backend `computers/`
- `services/booking.ts` → backend `bookings/`
- `services/semesters.ts` → backend `semesters/`

## Workflows

1. **Inventory management** — browse `/inventory`, add/edit items, bulk-change status or room. On mobile, `/labtech-mobile` renders instead.
2. **Semestral audit** — open `/inventory-audit`, pick a room, scan item/PC QR codes or tap to check off; progress bar tracks completion per room per active semester.
3. **Room queue** — on `/labtech/room` switch to "Computer Use Queue" tab, use `QueueModal` to add single or weekly student-use slots; `ActiveQueueDashboard` shows live occupancy.
4. **Form lifecycle** — create WRF/RIS on `/forms`, attach file, advance through departments via `DeptSelect`, optionally return for revision.
5. **Borrowing approval** — on `/labtech/borrowing` approve (assign item via `ApprovalModal`) or reject (reason via `RejectionModal`); walk-in loans created via `WalkinBorrowingModal`.
6. **Weekly report** — on `/reports` create/edit a report draft, categorise tasks, submit; CSV export available.

## Permissions

- Can: view/add/edit/bulk-edit inventory items; run semestral QR audit; manage room queue; process borrowing requests; manage WRF/RIS forms through all non-head-only departments; view/self-assign tickets; send/read notifications; create/submit weekly reports
- Cannot: access admin user/room management; view other lab techs' reports (own reports only via `ReportsPage`); access lab-head-specific scheduling or labtech oversight pages

## Gotchas

- On mobile (`window.innerWidth < 768`), `InventoryPage` renders `InventoryMobile` in-place rather than navigating; the explicit `/labtech-mobile` route also serves the same component.
- At `/` on mobile, the router redirects a `LAB_TECH` user to `/labtech-mobile` instead of rendering the dashboard.
- `InventoryItemInfoPage` is a QR deep-link destination: it decodes `itemCode` from the URL param (URL-decoded), so QR codes must encode the `Item_Code` string directly.
- `RoomQRPrintPage` accepts a `?kind=items|pcs|all` query param; default is `items`. The print dialog is triggered automatically 300 ms after data loads.
- `FormsPage` treats `department === 'COMPLETED'` as a terminal state distinct from `status`; filters handle this specially so completed forms don't appear under status-based filters.
