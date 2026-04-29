# BITS Frontend — Cross-Cutting Concerns

> Claude-first reference. Each section is a discrete lookup target.
> All paths are relative to `src/` unless otherwise noted.

---

## Notifications

**Pages**
- `pages/notifications/NotificationPage.tsx` — primary inbox; three views (Inbox / Read / Archived) toggled via tab state (`all` | `read` | `archived`). Filters by search term and by notification type (`System`, `Issue Report`, `Asset Request`, `Form Update`). Supports cursor-based infinite scroll via `loadMore`.
- `pages/notifications/ReadNotifPage.tsx` — stub file (1 line), not currently used.
- `pages/notifications/ArchivedNotifPage.tsx` — stub file (1 line), not currently used. Archive view is handled inside `NotificationPage` via `activeView === 'archived'`.

**Components** (`pages/notifications/components/`)
- `Archive.tsx` — icon button; toggles between archive (ArchiveIcon) and restore (RotateCcw) actions. Calls `onClick` prop; stops event propagation so parent row click is not triggered.
- `MarkAsRead.tsx` — (present in directory; not deeply read, assumed to be a similar icon button).

**WebSocket connection**
- Established inside `NotificationProvider` (`context/NotificationContext.tsx`).
- URL constructed at runtime: `ws[s]://<VITE_API_URL host>/ws/notifications?token=<JWT>`.
  Default: `ws://localhost:3000/ws/notifications?token=<JWT>`.
- Ignored message types: `CONNECTED`, `PING`.
- On any message containing `TICKET` in `type`, `fetchTicketCount()` is re-invoked.
- Reconnect: 5-second delay on non-normal closure (`code !== 1000`).
- Deduplication: `processedIdsRef` (Set of string IDs) prevents double-toast on reconnect overlap.
- Toast rendered via `react-hot-toast` on every new incoming notification.

**REST endpoints used** (`services/notifications.ts`)
| Function | Method | Endpoint |
|---|---|---|
| `getNotifications` | GET | `/notifications` (params: `limit`, `cursor`, `unreadOnly`) |
| `getUnreadCount` | GET | `/notifications/unread-count` |
| `markNotificationRead` | PATCH | `/notifications/:id/read` |
| `markNotificationUnread` | PATCH | `/notifications/:id/unread` |
| `markAllNotificationsRead` | POST | `/notifications/mark-all-read` |
| `archiveNotification` | PATCH | `/notifications/:id/archive` |
| `restoreNotification` | PATCH | `/notifications/:id/restore` |

Pagination: `nextCursor` is returned in `x-meta` response header as JSON `{ nextCursor: number | null }`.

**Provider** `context/NotificationContext.tsx`
- Exposed via `useNotifications()`.
- Interface: `{ notifications, unreadCount, pendingTicketCount, loading, loadingMore, hasMore, loadMore, markAsRead, markAsUnread, markAllAsRead, archiveNotification, restoreNotification }`.
- All mutations use optimistic updates with revert-on-error.
- `pendingTicketCount` — fetched from `GET /tickets/count?status=PENDING`; only populated for lab-staff roles (`isLabStaffRole`).

**Available to:** All authenticated roles (LAB_TECH, LAB_HEAD, STUDENT — notifications dropdown in `Layout.tsx`; dedicated page route `/notification` restricted to LAB_TECH and LAB_HEAD via `ProtectedRoute`).

---

## Tickets

**Files**
- `pages/tickets/TicketsPage.tsx` — full CRUD table. Active/Archived toggle. Status filter (PENDING / IN_PROGRESS / RESOLVED). Search across all ticket fields. "Report Issue" button opens `TicketingModal` in create mode; row click opens it in view/edit mode.
- `pages/tickets/components/TicketingModal.tsx` — modal for creating and updating tickets. Props: `isOpen`, `onClose`, `ticket` (null for new), `onUpdate`, `isCreating`.

**Ticket statuses:** `PENDING` → `IN_PROGRESS` → `RESOLVED`. Archived is a separate boolean (`Archived`).

**Auto-reload on WS notification:** `TicketsPage` watches `NotificationContext.notifications` for any entry whose title/message/eventType contains `TICKET`, and calls `loadTickets()` when a new one arrives (ref-guarded to avoid reload on mount).

**REST endpoints** (`services/tickets.ts`)
| Function | Endpoint |
|---|---|
| `fetchTickets` | GET `/tickets` |
| `fetchTicketById` | GET `/tickets/:id` |
| `createTicket` | POST `/tickets` |
| `updateTicket` | PUT `/tickets/:id` |
| `assignTicket` | PUT `/tickets/:id` (sets `Technician_ID` + `Status: IN_PROGRESS`) |
| `archiveTicket` | PUT `/tickets/:id` (`Archived: true`) |
| `restoreTicket` | PUT `/tickets/:id` (`Archived: false`) |
| `deleteTicket` | DELETE `/tickets/:id` |

**Available to:** `LAB_TECH`, `LAB_HEAD` (route `/tickets`, `App.tsx:138`). Students can *create* tickets via `SessionBar` → `ReportIssueModal` → `createTicket()`.

---

## Layout & Auth Gates

**Files**
- `layout/Layout.tsx` — root shell for all authenticated routes. Renders `<Navbar>` (sidebar) for staff roles; hides it for STUDENT, FACULTY, SECRETARY (`noSidebarRoles`). Provides mobile top-bar with bell icon + profile dropdown. Mounts `<Toaster>` (react-hot-toast). Renders `<Outlet>` as main content.
- `layout/Navbar.tsx` — collapsible sidebar navigation. Role-aware nav items.

**`ProtectedRoute`** (`app/App.tsx:49–59`)
```
ProtectedRoute({ children, roles })
  if loading → null
  if !isAuthenticated → <Navigate to="/login" state={{ from: location }} />
  if role not in roles → <Navigate to="/unauthorized" />
  return children
```
- Uses `normalizeUserRole()` from `types/user` to canonicalize role strings before comparison.
- `ROLES` constants: `ADMIN`, `LAB_TECH`, `LAB_HEAD`, `STUDENT`, `FACULTY`, `SECRETARY`.

**`PublicLandingGate`** (`app/App.tsx:42–46`)
- Only active when unauthenticated.
- Mobile (`useIsMobile()`) → renders `pages/public/StudentPublicLanding`.
- Desktop → `<Navigate to="/login" />`.

**`LoginRedirect`** (`app/App.tsx:65–68`)
- Catch-all for unauthenticated deep links: redirects to `/` (which hits `PublicLandingGate`) preserving `state.from` so Login can bounce back post-auth.

**`Logout`** (`app/App.tsx:71–83`)
- Calls `AuthContext.logout()` exactly once (ref-guarded), then `<Navigate to="/login">`.
- `logout()` calls `POST /auth/logout`, then clears `localStorage` (`token`, `userId`).

**Root `/` redirect by role:**
| Role | Destination |
|---|---|
| ADMIN | `SysAdDash` (`pages/sysad/UserPage`) |
| LAB_TECH (desktop) | `LabtechDashboard` |
| LAB_TECH (mobile) | `/labtech-mobile` (`InventoryMobile`) |
| LAB_HEAD | `LabheadDashboard` |
| STUDENT | `StudentSession` |
| FACULTY | `FacultyScheduling` |
| SECRETARY | `SecretaryScheduling` |

---

## Contexts

Provider nesting order in `App.tsx` (outermost → innermost):
```
AuthProvider
  ModalProvider
    NotificationProvider
      HeartbeatProvider
        AppContent
```

**`AuthContext`** (`context/AuthContext.tsx`)
- State: `user`, `token`, `isAuthenticated`, `userRole`, `loading`.
- Session restore: on mount, reads `localStorage.token` → `GET /users/me`; 401 clears token.
- `login()`: `POST /auth/login` → stores token + userId in localStorage. Blocks STUDENT role login (desktop login page is staff-only).
- `logout()`: `POST /auth/logout` → clears localStorage.
- Hook: `useAuth()`.

**`ModalContext`** (`context/ModalContext.tsx`)
- Provides a programmatic modal system (no JSX at call site).
- API: `showAlert`, `showConfirm`, `showError`, `showSuccess`, `showChoice<T>`.
- All return Promises. `showConfirm` resolves `boolean`. `showChoice<T>` resolves `T | null`.
- Renders a single global modal at `z-[9999]` with 150ms fade transition.
- Hook: `useModal()`.

**`NotificationContext`** — see Notifications section above.

**`HeartbeatContext`** (`context/HeartbeatContext.tsx`)
- Only activates for `STUDENT` role.
- On mount: calls `getLocalIP()` → `POST /heartbeat/register` with `{ client_ip }`.
  - Success: stores `Computer`, generates `sessionId` (crypto.randomUUID), sets `isActive = true`.
  - Failure: `detectionFailed = true` → UI shows `ComputerSelector` for manual fallback.
- `startHeartbeat(computer, sessionId)` — called by `ComputerSelector` on manual selection.
- `stopHeartbeat()` — clears `isActive` and `sessionId`; called by `SessionBar` on end-session.
- Hook: `useHeartbeat()`.
- Heartbeat interval itself is driven by `useHeartbeatInterval()` hook (separate file).

---

## Shared UI Primitives (`src/ui/`)

All primitives follow the shadcn/ui pattern: Radix UI primitives + CVA variant classes + Tailwind. Import from `@/ui`.

| File | Export | Purpose |
|---|---|---|
| `Badge.tsx` | `Badge` | Status chip with CVA variants (`default`, `success`, `warning`, `danger`, etc.) |
| `Button.tsx` | `Button` | CVA button with size + variant props |
| `Card.tsx` | `Card`, `CardHeader`, `CardContent`, `CardFooter` | Container with `rounded-xl border shadow-sm` base |
| `ConfirmModal.tsx` | `ConfirmModal` | Standalone confirm dialog (separate from ModalContext) |
| `EmptyState.tsx` | `EmptyState` | Centered empty-state illustration + message |
| `FloatingCombobox.tsx` | `FloatingCombobox` | Searchable combobox with floating label |
| `FloatingSelect.tsx` | `FloatingSelect` | Dropdown select with floating label |
| `LoadingSkeleton.tsx` | `LoadingSkeleton`, `Skeleton` | Skeleton placeholders; `type` prop: `'card'`, `'page'`, `'dashboard'`, `'request-cards'` |
| `Modal.tsx` | `Modal` | Generic modal shell (portal + backdrop) |
| `Search.tsx` | `Search` | Search input with optional label |

Status colors are centralized in `lib/constants.ts` (`TICKET_STATUS_VARIANT`, `VARIANT_DOT_CLASS`).

---

## Monitoring (PARKED)

**Files present** (`pages/monitoring/`):
- `MonitoringDashboard.tsx`
- `components/StatusGrid.tsx`
- `components/ComputerDetailModal.tsx`
- `components/FilterBar.tsx`
- `components/LoadingSkeleton.tsx`

**Route status:** `/monitoring` redirects to `/` — `App.tsx:140`:
```tsx
<Route path="/monitoring" element={<Navigate to="/" replace />} />
```

**Service:** `services/monitoring.ts` exists (not deeply read but present in services directory).

**Status: PARKED** — code retained for future re-wire. Do not delete these files. The backend `computers` module likely supports the data needs.

---

## Scheduling

**Shared component:** `pages/scheduling/SchedulingPage.tsx` — a single `Scheduling` component used by three roles with different props:

| Route | Import | `allowedRoomTypes` prop | `showRejectedMyBookings` |
|---|---|---|---|
| `/faculty/scheduling` | `pages/faculty/SchedulingPage.tsx` | uncertain — verify | `true` (likely) |
| `/secretary/scheduling` | `pages/secretary/SchedulingPage.tsx` | `['CONFERENCE', 'CONSULTATION']` (uncertain — verify) | uncertain |
| `/labhead-scheduling` | `pages/labhead/SchedulingPage.tsx` | uncertain — verify |  uncertain |

The `SchedulingPage.tsx` in `pages/scheduling/` is the shared implementation. Role-specific pages in `pages/faculty/`, `pages/secretary/`, `pages/labhead/` re-export or wrap it with role-appropriate props.

**Calendar:** FullCalendar (`@fullcalendar/react`) with `dayGrid`, `timeGrid`, `list`, `interaction` plugins. Views: Day, Week, Month, List.

**Bookings vs. Schedules overlay:** The calendar renders two event layers:
1. Booking events (from `GET /bookings`) — status dot colors: green=APPROVED, yellow=PENDING, rose=REJECTED. REJECTED bookings are filtered out of the calendar grid except for their owner (so a user can still see what slot they were rejected for). Container tint is per-viewer via `lib/bookingDisplayColor.ts`: own=blue, others=gray, classes=rose.
2. Schedule events (from room's `Schedule[]` field) — rendered as pink read-only blocks labeled "Class".

**Conflict detection:** Two layers. (1) Hard block at selection / drag time: `checkClassConflict()` in `SchedulingPage.tsx` aborts before the popover opens / reverts a drop if the slot overlaps a class period — bookings can never coexist with a class. (2) Pre-submit probe: `checkSlotConflict()` in the popover walks both classes and APPROVED bookings to surface inline warnings. Backend enforces with HTTP 409.

**Recurring bookings:** Handled via `services/bookingSeries.ts` — `POST /bookings/series`. RRULE stored server-side; occurrences are virtually expanded on read. Single-occurrence overrides via `POST /bookings/series/:id/overrides`.

**Approve/Reject:** Lab Head and Lab Tech can approve/reject bookings for LAB/LECTURE rooms. Secretary can approve/reject CONFERENCE/CONSULTATION rooms. Logic in `BookingPopover` → `onApprove` / `onReject` callbacks.

**Components** (`pages/scheduling/components/`):
- `ConfirmModal.tsx` — drag-reschedule confirmation.
- `WarningModal.tsx` — time-conflict / permission-denied warning.
- `RoomCombobox.tsx` — searchable room selector for the booking form. Locks to a single room when the sidebar filter has exactly one bookable room selected (`lockedRoomId` only forwarded in create mode).

**Calendar sidebar** (`components/CalendarSidebar.tsx`):
- Mini-calendar (react-calendar) with full-week-row highlight on the selected date (rendered via `tileClassName` — week is Sunday-anchored to match the en-US locale default).
- "My Schedules" section listing the viewer's own bookings (across all rooms — not filtered by active room, so the user can jump between rooms).
- Three counter cards (Requested / Approved / Rejected) double as toggleable status filters: clicking a card filters the list to that status and bolds the card; clicking the active card again clears. The Rejected card is always visible regardless of the parent's `showRejectedBookings` prop, so rejections are always reachable.
- Clicking a booking card jumps the whole schedule context to that booking: switches `activeRoomId` to the booking's room, navigates FullCalendar to its date, syncs `selectedDate` (so the week-row highlight follows), then opens the popover.
- Scroll is scoped to the booking list only (`min-h-0 flex-1 overflow-y-auto`); the create button, mini-calendar, and counter row stay pinned.

**REST endpoints used** (from `services/booking.ts`, `services/bookingSeries.ts`):
| Action | Endpoint |
|---|---|
| List bookings | GET `/bookings` |
| Create booking | POST `/bookings` |
| Update booking | PATCH `/bookings/:id` |
| Update status | PATCH `/bookings/:id/status` |
| Available rooms | GET `/bookings/available` |
| Create series | POST `/bookings/series` |
| Update series | PATCH `/bookings/series/:id` |
| Delete series | DELETE `/bookings/series/:id` |
| Series decision | POST `/bookings/series/:id/decision` |
| Override occurrence | POST `/bookings/series/:id/overrides` |
| Exclude date | POST `/bookings/series/:id/exclude` |
