export type ReportStatus = 'DRAFT' | 'SUBMITTED' | 'REVIEWED';

export type TaskStatus = 'completed' | 'pending' | 'inProgress';

export interface ReportTask {
  title: string;
  description: string;
  status: TaskStatus;
  category: string;
  timeSpent?: number;
  ticketId?: number;
}

export interface AutoPopulateResponse {
  completed: ReportTask[];
  inProgress: ReportTask[];
  pending: ReportTask[];
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

export const taskCategoryOptions = [
  'Maintenance', 'Tickets', 'Inventory', 'Borrowing', 'Forms', 'Other'
] as const;
