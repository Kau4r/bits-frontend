import api from '@/services/api';
import toast from 'react-hot-toast';

export interface CleanupPreview {
  confirmationText: string;
  willDelete: Record<string, number>;
  willReset: Record<string, number>;
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
  willReset: Record<string, number>;
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
