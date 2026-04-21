# BITS System Manual

## Overview

BITS is a school laboratory management system for room scheduling, inventory, ticketing, borrowing, forms, reports, and operational cleanup.

Primary roles:

- Admin: manages users, maintenance cleanup, and system-level settings.
- Lab Head: oversees lab technicians, dashboards, tickets, forms, reports, rooms, and inventory.
- Lab Tech: manages tickets, room assets, computers, inventory, borrowing, room queues, and weekly reports.
- Faculty: books rooms, reports issues, borrows items, and receives notifications.
- Secretary: manages scheduling with conference priority rules.
- Student: views student-usage room availability and can use student-facing shortcuts.

## Inventory

Inventory stores laboratory assets with item code, type, brand, serial number, status, room assignment, location, borrowable flag, and update date.

Supported item statuses:

- AVAILABLE
- BORROWED
- DEFECTIVE
- LOST
- REPLACED
- DISPOSED

Operational rules:

- Item Code is the canonical unique identifier.
- Location can describe storage area or room placement when room name alone is not enough.
- Disposed items remain in the system for audit/reporting and are included in dashboard statistics.
- QR codes open the authenticated item-info page for Lab Tech and Lab Head users.
- Computer components are inventory items assigned to a computer record.

Import rules:

- Inventory imports support CSV for inventory items.
- Room asset imports support CSV.
- Computer imports support CSV and XLSX.
- Import rows are validated for missing fields, duplicate item codes, invalid statuses, and unknown rooms where supported by the import flow.

Exports:

- Inventory list CSV is available from the Inventory page.
- Inventory exports can be filtered by item status and item type.
- Per-room inventory CSV is available from the Room Assets tab.

## Forms

Forms support RIS and WRF workflows.

Visible status flow:

- Pending
- In Review
- Approved
- Cancelled
- Archived only through the archive action

Workflow rules:

- "Rejected" is replaced by "Cancelled" for form-facing UI and form status.
- Archived is not part of the normal status dropdown.
- Completed forms cannot move backward or forward.
- Cancelled and archived forms are read-only except for allowed archive actions.
- Department movement is sequential. A form cannot jump to a later workflow step before visiting the previous step.
- Approval requires an uploaded file for the current workflow step.
- Forward transfer requires approval and the required uploaded file.

RIS completion rules:

- RIS forms require Purchase Order, Delivery Receipt, Receiving Report, and Sales Invoice attachments before completion.
- RIS forms must be marked received before transfer to Completed.
- WRF completion behavior stays separate from RIS procurement requirements.

Archiving rules:

- Forms can be archived only after Completed or Cancelled terminal state.
- Archived forms are excluded from normal active workflows.
- Uploaded files remain stored as uploaded in the current version.
- File compression for uploaded form files is not enabled in this phase. The school-year archive output is compressed as JSON gzip.

## Cleanup

Cleanup is intended to preserve master data and archive operational data.

Preserved data:

- Users
- Rooms
- Inventory items
- Computers

Operational data:

- Forms
- Form attachments
- Form history
- Tickets
- Bookings
- Schedules
- Borrowing records
- Weekly reports
- Notifications and audit logs
- Computer heartbeat sessions

School-year archive behavior:

- Archive preview counts records for a selected school year.
- Archive output is generated as a compressed `.json.gz` file.
- After confirmation, operational records in the selected school year can be removed from active tables.
- Schedules are archived with the same school-year scope. Whether schedules should be permanently cleared or regenerated is a policy decision that should be confirmed before production cleanup.

Admin safety:

- Cleanup actions are Admin-only.
- Dangerous cleanup requires exact typed confirmation.
- Cleanup should be run only after database backup.

## Dashboard

Dashboards summarize operational data for review.

Included dashboard areas:

- Tickets
- Forms
- Inventory
- Rooms
- Bookings
- Weekly reports

Lab Head dashboard:

- Inventory by item type pie chart.
- Inventory by status pie chart.
- Completed tickets count.
- Unassigned tickets count.
- Submitted reports count.
- Rooms under maintenance count.
- Defective and disposed item counts.
- Pending, in-review, and approved forms counts.
- Dashboard summary CSV export.

Lab Tech dashboard:

- Assigned tickets.
- Completed tickets.
- Pending tickets.
- Unassigned tickets.
- Rooms in maintenance.
- Hardware tasks.
- Draft and submitted weekly reports.
- Inventory totals including available, defective, borrowed, and disposed.
- Dashboard summary CSV export.

## Lab Head

Main responsibilities:

- Review dashboard status.
- Monitor lab technicians.
- Review submitted weekly reports.
- Assign and monitor tickets.
- Review inventory and room health.
- Review forms and workflow progression.
- Export dashboard, inventory, and room reports when needed.

Suggested review flow:

- Start with dashboard summary.
- Check unassigned tickets.
- Check rooms under maintenance.
- Check defective and disposed inventory.
- Review submitted reports.
- Export CSV reports for documentation or client review.

## Lab Tech

Main responsibilities:

- Resolve and update tickets.
- Manage room computers and assets.
- Import room assets and computers.
- Maintain inventory status.
- Manage borrowing requests.
- Open rooms for student usage.
- Upload weekly reports.
- Export inventory and weekly report CSVs.

Suggested daily flow:

- Check dashboard summary.
- Handle unassigned or assigned tickets.
- Check borrowing requests.
- Update inventory and room assets.
- Submit weekly report before review period.

## Room Reports

Room report CSV includes:

- Room name
- Room type
- Lab type
- Capacity
- Room status
- Current use
- Computer totals by status
- Item totals and available/disposed counts
- Active ticket count
- Active schedule count
- Pending booking count
- Updated date

How to export:

- Open a room detail modal.
- Click Export All Rooms.

Use cases:

- Client review.
- Lab capacity checks.
- Maintenance planning.
- Room inventory audit.

## Inventory Reports

Inventory report CSV includes:

- Item code
- Type
- Brand
- Serial number
- Status
- Location
- Room
- PC assignment
- Borrowable flag
- Created by
- Created date
- Last updated date

How to export:

- Open Inventory Management and click Export CSV for the current inventory filters.
- Open a room, go to Assets, and click Export This Room CSV for a room-specific inventory report.

Use cases:

- Per-room asset audit.
- Full inventory review.
- Disposed item tracking.
- Borrowable equipment review.

## Reports

Weekly reports are submitted by Lab Tech users and reviewed by Lab Head users.

Weekly report CSV includes:

- Report ID
- Lab technician
- Week start and end
- Status
- Issues reported
- Completed task count
- In-progress task count
- Pending task count
- Reviewer
- Review date
- Notes

How to export:

- Open Weekly Reports.
- Click Export CSV.

## Storage And Compression

Current storage policy:

- Uploaded operational files remain in the uploads directory in their original format.
- School-year archive data is compressed into `.json.gz`.
- The current phase does not compress uploaded files because PDF/image/document compression can damage files or remove metadata if done without a clear policy.

Recommended future file-compression policy:

- Compress only after file-type review.
- Preserve original files until compressed copies are verified.
- Track original size, compressed size, checksum, compression method, and compression date.
- Do not compress active workflow files before approval/completion.

## Verification Checklist

Use this checklist after deployment:

- Inventory page downloads CSV.
- Inventory filters are reflected in exported CSV.
- Room Assets tab downloads per-room inventory CSV.
- Room detail modal downloads all-room report CSV.
- Weekly Reports page downloads CSV.
- Lab Tech dashboard downloads summary CSV.
- Lab Head dashboard downloads summary CSV.
- Forms approval still requires current-step upload.
- Completed and Cancelled forms remain locked.
- School-year archive preview still loads.
