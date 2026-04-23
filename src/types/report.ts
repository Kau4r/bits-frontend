export type ReportStatus = 'DRAFT' | 'SUBMITTED' | 'REVIEWED';

export type TaskStatus = 'completed' | 'pending' | 'inProgress';

export interface ReportTask {
  title: string;
  description: string;
  status: TaskStatus;
  category: string;
  timeSpent?: number;
  ticketId?: number;
  // Set when a task was produced from an Audit_Log entry. Used as a merge key
  // so real-time re-polls replace matching generated tasks rather than
  // duplicating them. Manual tasks (user-added in the dialog) have no id.
  auditLogId?: number;
  // True once the user has edited this audit-derived task in the dialog.
  // When set, the polling merge will NOT overwrite it with the backend's
  // regenerated version, so manual annotations survive real-time refreshes.
  userEdited?: boolean;
}

export interface AutoPopulateResponse {
  completed: ReportTask[];
  inProgress: ReportTask[];
  pending: ReportTask[];
  // Per-category activity counts for Lab Head auditing. Not rendered yet but
  // returned by the backend so UIs can surface it later.
  counts?: Record<string, number>;
}

export interface ReportTasks {
  completed: ReportTask[];
  pending: ReportTask[];
  inProgress: ReportTask[];
}

export interface WeeklyReport {
  Report_ID: number;
  User_ID: number;
  Week_Start: string;
  Week_End: string;
  Tasks: ReportTasks;
  Issues_Reported: number;
  Notes?: string | null;
  Status: ReportStatus;
  Reviewed_By?: number | null;
  Reviewed_At?: string | null;
  Created_At: string;
  Updated_At: string;
  User?: { User_ID: number; First_Name: string; Last_Name: string; Email: string };
  Reviewer?: { User_ID: number; First_Name: string; Last_Name: string } | null;
}

export interface ReportCreateInput {
  weekStart: string;
  weekEnd: string;
  tasks: ReportTasks;
  notes?: string;
  status?: 'DRAFT' | 'SUBMITTED';
}

export interface ReportUpdateInput {
  weekStart?: string;
  weekEnd?: string;
  tasks?: ReportTasks;
  notes?: string;
}

export const reportStatusLabels: Record<ReportStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  REVIEWED: 'Reviewed',
};

export const reportStatusColors: Record<ReportStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-700/30 dark:text-gray-300',
  SUBMITTED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  REVIEWED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
};

// Categories align with labtech module work so Lab Heads can audit activity
// by area of responsibility. Update `taskCategoryDescriptions` together.
export const taskCategoryOptions = [
  'Tickets',
  'Inventory',
  'Borrowing',
  'Forms',
  'Rooms',
  'Scheduling',
  'Computers',
  'Maintenance',
  'Other',
] as const;

export type TaskCategory = typeof taskCategoryOptions[number];

// Short description of what each category covers — surfaced as a tooltip in
// the weekly report dialog so techs pick the right one.
export const taskCategoryDescriptions: Record<TaskCategory, string> = {
  Tickets: 'Resolving reported issues (hardware, software, facility)',
  Inventory: 'Adding, editing, auditing, or moving items',
  Borrowing: 'Lending/returning equipment to borrowers',
  Forms: 'Processing WRF / RIS requests (creating, approving, transferring)',
  Rooms: 'Opening or closing labs, room setup, student-usage sessions',
  Scheduling: 'Managing class schedules and room bookings',
  Computers: 'PC monitoring, heartbeat checks, computer-level repairs',
  Maintenance: 'General cleaning, cable management, preventive upkeep',
  Other: 'Anything not covered by the categories above',
};
