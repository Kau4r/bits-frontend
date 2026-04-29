# Lab Head

Lab Head inherits all Lab Tech access — see `lab-tech.md` for shared routes/components.
Below is what's UNIQUE to Lab Head.

**Default landing:** `/` → `LabheadDashboard`
**Additional backend modules touched:** dashboard (labhead variant), tickets (assign), reports (review/download)

## Routes

| Path | Page | Purpose |
|---|---|---|
| `/` | `DashboardPage.tsx` (labhead) | Overview: ticket/form/report summary tiles + `BookingCard` + notifications panel |
| `/labhead-dashboard` | `DashboardPage.tsx` (labhead) | Explicit alias (same component) |
| `/labtechview` | `LabTechOverviewPage.tsx` | Staff oversight: tech list + detail panel + unassigned ticket queue |
| `/labhead-scheduling` | `SchedulingPage.tsx` (labhead) | Full scheduling page (wraps shared `Scheduling` component) |

Note: Lab Head also has access to all lab-tech routes (`/labtech-mobile`, `/inventory`, `/inventory-audit`, `/labtech/room`, `/forms`, `/labtech/borrowing`, `/tickets`, `/notification`) but **not** `/reports` (that route is `LAB_TECH`-only in `App.tsx`).

## Components (`pages/labhead/components/`)

- `AssignTicketDropdown.tsx` — portal-rendered dropdown that fetches active LAB_TECH users and calls `assignTicket`; supports keyboard navigation; used in `LabTechOverviewPage` unassigned-ticket table
- `LabTechActivities.tsx` — three-column completed/pending/in-progress activity card grid for a selected tech
- `LabTechDetailPanel.tsx` — tabbed panel (Tickets, Reports) for the selected lab tech: shows assigned tickets with reassign control, and submitted weekly reports with review action
- `LabTechList.tsx` — sidebar list of all active LAB_TECH users with ticket progress bar; fetches via `fetchUsersByRole('LAB_TECH')` + `fetchTickets`
- `LabTechProgress.tsx` — thin progress bar component (completed/total tasks ratio)

## Services (labhead-specific usage)

- `services/tickets.ts` → `assignTicket`, `fetchTickets({ unassigned: true })` — assign unassigned tickets to a lab tech
- `services/reports.ts` → `reviewReport`, `downloadWeeklyReportsCsv` — review submitted reports from the detail panel

## Workflows

1. **Staff oversight** — on `/labtechview`, browse the tech list, click a tech to see their open tickets and submitted reports in `LabTechDetailPanel`; reassign tickets via `AssignTicketDropdown`; assign unassigned tickets from the lower panel.
2. **Scheduling** — `/labhead-scheduling` provides the same scheduling interface as other booking roles (wraps shared `Scheduling` component with no room-type restrictions).
3. **Dashboard review** — `LabheadDashboard` shows aggregate counts and `BookingCard` (upcoming bookings); differs from lab-tech dashboard which shows inventory pie charts instead.

## Permissions

- Can: everything a Lab Tech can, plus assign/reassign tickets to lab techs, review lab tech reports, access the scheduling page, view the labtech overview
- Cannot: access admin user management (`/user/:email`, `/room`, `/schedule-import`, `/maintenance`); submit own weekly reports (route is LAB_TECH-only)

## Gotchas

- `LabheadDashboard` shows `metrics.summaries.tickets.completed` (total completed, all techs) while `LabtechDashboard` shows `metrics.summaries.tickets.completedByMe` (self only). Both call the same `getDashboardMetrics` endpoint but render different fields.
- `LabTechOverviewPage` has a resizable split pane between the detail panel and unassigned-tickets table (drag handle at center); min 36%, max 74%.
