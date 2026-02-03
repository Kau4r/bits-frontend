// Form types matching backend schema
export type FormType = 'WRF' | 'RIS';
export type FormStatus = 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'ARCHIVED';
export type FormDepartment = 'REGISTRAR' | 'FINANCE' | 'DCISM' | 'LABORATORY';

// Display labels for UI
export const formTypeLabels: Record<FormType, string> = {
  WRF: 'Work Request Form',
  RIS: 'Requisition and Issue Slip',
};

export const formStatusLabels: Record<FormStatus, string> = {
  PENDING: 'Pending',
  IN_REVIEW: 'In Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  ARCHIVED: 'Archived',
};

export const formDepartmentLabels: Record<FormDepartment, string> = {
  REGISTRAR: 'Registrar',
  FINANCE: 'Finance',
  DCISM: 'DCISM',
  LABORATORY: 'Laboratory',
};

// Status chip colors
export const formStatusColors: Record<FormStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  IN_REVIEW: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  ARCHIVED: 'bg-gray-200 text-gray-800 dark:bg-gray-700/30 dark:text-gray-300',
};

// Form history entry for tracking department transfers
export interface FormHistory {
  History_ID: number;
  Form_ID: number;
  Department: FormDepartment;
  Changed_At: string;
  Notes?: string;
}

// User summary for creator/approver
export interface FormUser {
  User_ID: number;
  First_Name: string;
  Last_Name: string;
  Email: string;
}

// Main Form interface matching backend
export interface Form {
  Form_ID: number;
  Form_Code: string;
  Creator_ID: number;
  Approver_ID?: number | null;
  Form_Type: FormType;
  Status: FormStatus;
  Department: FormDepartment;
  Title?: string | null;
  Content?: string | null;
  File_Name?: string | null;
  File_URL?: string | null;
  File_Type?: string | null;
  Is_Archived: boolean;
  Created_At: string;
  Updated_At: string;
  Creator?: FormUser;
  Approver?: FormUser | null;
  History?: FormHistory[];
}

// Legacy type for backward compatibility during migration
export interface FormRecord {
  id: string;
  formId: string;
  type: FormType;
  status: FormStatus;
  department: string;
  createdAt: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentType?: 'pdf' | 'image' | 'docx' | 'doc';
  isArchived: boolean;
  history?: Array<{ dept: string; at: string }>;
}
