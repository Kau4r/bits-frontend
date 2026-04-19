// Form types matching backend schema
export type FormType = 'WRF' | 'RIS';
export type FormStatus = 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'ARCHIVED';
export type FormDepartment =
  | 'REQUESTOR'
  | 'DEPARTMENT_HEAD'
  | 'DEAN_OFFICE'
  | 'TNS'
  | 'PURCHASING'
  | 'PPFO'
  | 'COMPLETED';

export type FormDocumentType =
  | 'INITIAL'
  | 'PURCHASE_ORDER'
  | 'DELIVERY_RECEIPT'
  | 'RECEIVING_REPORT'
  | 'SALES_INVOICE'
  | 'PROOF'
  | 'OTHER';

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
  REQUESTOR: 'Requestor',
  DEPARTMENT_HEAD: 'Department Head',
  DEAN_OFFICE: 'Dean Office',
  TNS: 'TNS',
  PURCHASING: 'Purchasing',
  PPFO: 'PPFO',
  COMPLETED: 'Completed',
};

export const formDocumentTypeLabels: Record<FormDocumentType, string> = {
  INITIAL: 'Initial',
  PURCHASE_ORDER: 'Purchase Order',
  DELIVERY_RECEIPT: 'Delivery Receipt',
  RECEIVING_REPORT: 'Receiving Report',
  SALES_INVOICE: 'Sales Invoice',
  PROOF: 'Proof',
  OTHER: 'Other',
};

export const risCompletionDocumentTypes: FormDocumentType[] = [
  'PURCHASE_ORDER',
  'DELIVERY_RECEIPT',
  'RECEIVING_REPORT',
  'SALES_INVOICE',
];

// Departments available per form type
export const risDepartments: FormDepartment[] = [
  'REQUESTOR',
  'DEPARTMENT_HEAD',
  'DEAN_OFFICE',
  'TNS',
  'PURCHASING',
  'COMPLETED',
];

export const wrfDepartments: FormDepartment[] = [
  'REQUESTOR',
  'DEPARTMENT_HEAD',
  'PPFO',
  'COMPLETED',
];

// Timeline steps per form type (display labels for the InlineTimeline)
export const risTimelineSteps = ['Requestor', 'Department Head', 'Dean Office', 'TNS', 'Purchasing', 'Completed'];
export const wrfTimelineSteps = ['Requestor', 'Department Head', 'PPFO', 'Completed'];

// Get departments for a given form type
export const getDepartmentsForType = (formType: FormType): FormDepartment[] => {
  return formType === 'RIS' ? risDepartments : wrfDepartments;
};

export const normalizeFormDepartment = (department?: string): FormDepartment | undefined => {
  if (!department) return undefined;

  const normalized = department.trim().toUpperCase().replace(/\s+/g, '_');
  const allDepartments = ['REQUESTOR', 'DEPARTMENT_HEAD', 'DEAN_OFFICE', 'TNS', 'PURCHASING', 'PPFO', 'COMPLETED'] as FormDepartment[];

  return allDepartments.includes(normalized as FormDepartment)
    ? normalized as FormDepartment
    : undefined;
};

const getVisitedWorkflowDepartments = (
  formType: FormType,
  currentDepartment: string,
  visitedDepartments: string[] = []
): { workflow: FormDepartment[]; visited: Set<FormDepartment>; nextRequiredDepartment?: FormDepartment } => {
  const workflow = getDepartmentsForType(formType);
  const visited = new Set<FormDepartment>();

  visitedDepartments.forEach((department) => {
    const normalized = normalizeFormDepartment(department);
    if (normalized && workflow.includes(normalized)) {
      visited.add(normalized);
    }
  });

  const normalizedCurrent = normalizeFormDepartment(currentDepartment);
  if (normalizedCurrent && workflow.includes(normalizedCurrent)) {
    visited.add(normalizedCurrent);
  }

  const nextRequiredDepartment = workflow.find(department => !visited.has(department));

  return { workflow, visited, nextRequiredDepartment };
};

export const getAvailableTransferDepartments = (
  formType: FormType,
  currentDepartment: string,
  visitedDepartments: string[] = []
): FormDepartment[] => {
  const { workflow, visited, nextRequiredDepartment } = getVisitedWorkflowDepartments(formType, currentDepartment, visitedDepartments);

  return workflow.filter(department =>
    visited.has(department) || department === nextRequiredDepartment
  );
};

export interface FormDepartmentOption {
  value: FormDepartment;
  disabled?: boolean;
}

export const getTransferDepartmentOptions = (
  formType: FormType,
  currentDepartment: string,
  visitedDepartments: string[] = []
): FormDepartmentOption[] => {
  const { workflow, visited, nextRequiredDepartment } = getVisitedWorkflowDepartments(formType, currentDepartment, visitedDepartments);

  return workflow.map(department => ({
    value: department,
    disabled: !(visited.has(department) || department === nextRequiredDepartment),
  }));
};

export const hasVisitedFormDepartment = (
  formType: FormType,
  currentDepartment: string,
  visitedDepartments: string[] = [],
  targetDepartment: FormDepartment
): boolean => {
  const { visited } = getVisitedWorkflowDepartments(formType, currentDepartment, visitedDepartments);
  return visited.has(targetDepartment);
};

export const getMissingRisCompletionDocumentTypes = (
  attachments: FormAttachmentRecord[] = []
): FormDocumentType[] => {
  const uploadedTypes = new Set(attachments.map(attachment => attachment.documentType).filter(Boolean));
  return risCompletionDocumentTypes.filter(documentType => !uploadedTypes.has(documentType));
};

export const canCompleteRisForm = (
  form: Pick<FormRecord, 'type' | 'isReceived' | 'attachments'>
): boolean => {
  if (form.type !== 'RIS') return true;
  return form.isReceived === true && getMissingRisCompletionDocumentTypes(form.attachments || []).length === 0;
};

// Get timeline steps for a given form type
export const getTimelineStepsForType = (formType: FormType): string[] => {
  return formType === 'RIS' ? risTimelineSteps : wrfTimelineSteps;
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

export interface FormAttachment {
  Attachment_ID: number;
  Form_ID: number;
  Department: FormDepartment;
  Document_Type?: FormDocumentType | null;
  File_Name: string;
  File_Type?: string | null;
  File_URL: string;
  Uploaded_By?: number | null;
  Uploaded_At: string;
  Notes?: string | null;
  Uploader?: FormUser | null;
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
  Is_Received?: boolean;
  Received_At?: string | null;
  Received_By?: number | null;
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
  Receiver?: FormUser | null;
  History?: FormHistory[];
  Attachments?: FormAttachment[];
  Requester_Name?: string | null;
  Remarks?: string | null;
}

export interface FormAttachmentRecord {
  id: string;
  department: FormDepartment;
  documentType?: FormDocumentType;
  fileName: string;
  fileUrl: string;
  fileType?: 'pdf' | 'image' | 'docx' | 'doc';
  uploadedAt: string;
  uploadedByName?: string;
  notes?: string;
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
  attachments?: FormAttachmentRecord[];
  isArchived: boolean;
  isReceived?: boolean;
  receivedAt?: string | null;
  receivedByName?: string;
  history?: Array<{ dept: string; at: string }>;
  requesterName?: string;
  remarks?: string;
}
