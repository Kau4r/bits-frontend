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

export const getCleanupPreview = async (): Promise<CleanupPreview> => {
  const { data } = await api.get<CleanupPreview>('/maintenance/cleanup-preview');
  return data;
};

export const runCleanup = async (confirmation: string): Promise<CleanupResult> => {
  const { data } = await api.post<CleanupResult>('/maintenance/cleanup', { confirmation });
  toast.success('Cleanup completed');
  return data;
};
