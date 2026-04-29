# Role Documentation Index

BITS has six authenticated user roles plus a public (unauthenticated) surface. Each role lands on a different default page and touches a distinct subset of backend modules. The role enum lives in `src/types/user.ts` as `UserRole`: `ADMIN`, `LAB_HEAD`, `LAB_TECH`, `FACULTY`, `STUDENT`, `SECRETARY`.

Route-to-role mapping is enforced in `src/app/App.tsx` via the `ProtectedRoute` wrapper and role-keyed conditional rendering at the `/` root. Unauthenticated visitors are handled by `AppContent`'s early-return branch.

## Role Summary

| Role | Default Route | Page Count | Backend Modules | Doc Link |
|---|---|---|---|---|
| `ADMIN` | `/` → `UserPage` | 5 pages | users, rooms, schedules, maintenance, upload | [admin.md](admin.md) |
| `LAB_HEAD` | `/` → `LabheadDashboard` | 4 unique + all lab-tech pages | dashboard, tickets, reports + all lab-tech modules | [lab-head.md](lab-head.md) |
| `LAB_TECH` | `/` → `LabtechDashboard` (mobile: `/labtech-mobile`) | 14 routes | dashboard, inventory, rooms, borrowing, forms, tickets, notifications, reports, computers, bookings, semesters | [lab-tech.md](lab-tech.md) |
| `FACULTY` | `/` → `FacultyScheduling` | 2 routes | bookings, schedules, inventory, borrowing, notifications, tickets, rooms | [faculty.md](faculty.md) |
| `STUDENT` | `/` → `StudentSession` | 4 routes | rooms, computers, heartbeat, bookings, tickets | [student.md](student.md) |
| `SECRETARY` | `/` → `SecretaryScheduling` | 2 routes | bookings, schedules, rooms | [secretary.md](secretary.md) |
| _(public)_ | `/` → `PublicLandingGate` | 4 routes (unauthenticated) | rooms (public), tickets (anonymous) | [public.md](public.md) |
