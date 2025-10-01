export type FormType = 'WRF' | 'RIS';
export type FormStatus = 'Pending' | 'Approved' | 'In Review' | 'Rejected' | 'Archived';

export interface FormRecord {
  id: string;
  formId: string;         
  type: FormType;
  status: FormStatus;
  department: string;   
  createdAt: string;     
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentType?: 'pdf' | 'image' | 'docx'| 'doc';
  isArchived: boolean;
  history?: Array<{ dept: string; at: string }>;
}
