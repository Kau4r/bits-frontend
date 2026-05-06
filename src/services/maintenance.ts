import api from '@/services/api';
import toast from 'react-hot-toast';

export interface CleanupPreview {
  confirmationText: string;
  willDelete: Record<string, number>;
  willPreserve: Record<string, number>;
}

export interface CleanupResult {
  message: string;
  before: CleanupPreview;
  result: {
    deleted: Record<string, number>;
    reset: Record<string, number>;
  };
}

export interface SchoolYearArchivePreview {
  confirmationText: string;
  schoolYear: string;
  archiveName: string;
  dateRange: {
    start: string;
    end: string;
  };
  willArchive: Record<string, number>;
  willDelete: Record<string, number>;
  willPreserve: Record<string, number>;
  excludedFromArchive: Record<string, number>;
}

export interface SchoolYearArchiveResult {
  message: string;
  archiveName: string;
  downloadUrl: string;
  preview: SchoolYearArchivePreview;
  before: CleanupPreview;
  result: {
    deleted: Record<string, number>;
    reset: Record<string, number>;
  };
}

export interface April25DemoTargetForm {
  formCode: string;
  expectedTitle: string;
  found: boolean;
  formId: number | null;
  title: string | null;
  status: string | null;
  department: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface April25DemoLog {
  Log_ID: number;
  Timestamp?: string;
  Action?: string;
  Log_Type?: string;
  Is_Notification?: boolean;
  Details?: string | null;
}

export interface April25DemoCleanupPreview {
  confirmationText: string;
  label: string;
  dateRange: {
    start: string;
    endExclusive: string;
  };
  targetForms: April25DemoTargetForm[];
  missingFormCodes: string[];
  notificationLogs: April25DemoLog[];
  auditLogs: April25DemoLog[];
  willDelete: Record<string, number>;
  willPreserve: Record<string, number>;
  excludedFromCleanup: Record<string, number>;
  masterDataCreatedInRange: Record<string, number>;
  safetyWarnings: string[];
  canRun: boolean;
}

export interface April25DemoCleanupResult {
  message: string;
  before: April25DemoCleanupPreview;
  result: {
    deleted: Record<string, number>;
    reset: Record<string, number>;
  };
}

export interface ArchiveFile {
  fileName: string;
  sizeBytes: number;
  createdAt: string;
  modifiedAt: string;
  downloadUrl: string;
}

export interface MaintenanceHistoryEntry {
  id: number;
  action: string;
  details: string;
  timestamp: string;
  user: {
    firstName?: string;
    lastName?: string;
    username?: string;
  } | null;
}

export const getCleanupPreview = async (): Promise<CleanupPreview> => {
  const { data } = await api.get<CleanupPreview>('/maintenance/cleanup-preview');
  return data;
};

export const getSchoolYearArchivePreview = async (schoolYear: string): Promise<SchoolYearArchivePreview> => {
  const { data } = await api.get<SchoolYearArchivePreview>('/maintenance/school-year-archive-preview', {
    params: { schoolYear },
  });
  return data;
};

export const getApril25DemoCleanupPreview = async (): Promise<April25DemoCleanupPreview> => {
  const { data } = await api.get<April25DemoCleanupPreview>('/maintenance/april-25-demo-preview');
  return data;
};

export const getArchiveFiles = async (): Promise<ArchiveFile[]> => {
  const { data } = await api.get<ArchiveFile[]>('/maintenance/archives');
  return data;
};

export const getMaintenanceHistory = async (): Promise<MaintenanceHistoryEntry[]> => {
  const { data } = await api.get<MaintenanceHistoryEntry[]>('/maintenance/history');
  return data;
};

export const runCleanup = async (confirmation: string): Promise<CleanupResult> => {
  const { data } = await api.post<CleanupResult>('/maintenance/cleanup', { confirmation });
  toast.success('Cleanup completed');
  return data;
};

export const runSchoolYearArchiveCleanup = async (
  schoolYear: string,
  confirmation: string
): Promise<SchoolYearArchiveResult> => {
  const { data } = await api.post<SchoolYearArchiveResult>('/maintenance/school-year-archive-cleanup', {
    schoolYear,
    confirmation,
  });
  toast.success('School year archived and cleanup completed');
  return data;
};

export const runApril25DemoCleanup = async (confirmation: string): Promise<April25DemoCleanupResult> => {
  const { data } = await api.post<April25DemoCleanupResult>('/maintenance/april-25-demo-cleanup', {
    confirmation,
  });
  toast.success('April 25 demo cleanup completed');
  return data;
};
