import api from "@/services/api";
import type { WeeklyReport, ReportCreateInput, ReportUpdateInput, ReportStatus, AutoPopulateResponse } from "@/types/report";
import toast from 'react-hot-toast';

export interface ReportFilters {
  userId?: number;
  status?: ReportStatus;
}

export interface InventoryReportFilters {
  roomId?: number;
  status?: string;
  type?: string;
}

const downloadCsv = async (path: string, filename: string, params?: object) => {
  const response = await api.get<Blob>(path, {
    params,
    responseType: 'blob',
  });

  const blob = response.data instanceof Blob
    ? response.data
    : new Blob([response.data as unknown as BlobPart], { type: 'text/csv;charset=utf-8;' });

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
  toast.success('Report download started');
};

export const getReports = async (filters?: ReportFilters): Promise<WeeklyReport[]> => {
  const { data } = await api.get<WeeklyReport[]>("/reports", { params: filters });
  return data;
};

export const getReportById = async (id: number): Promise<WeeklyReport> => {
  const { data } = await api.get<WeeklyReport>(`/reports/${id}`);
  return data;
};

export const createReport = async (input: ReportCreateInput): Promise<WeeklyReport> => {
  const { data } = await api.post<WeeklyReport>("/reports", input);
  toast.success('Report saved');
  return data;
};

export const updateReport = async (id: number, input: ReportUpdateInput): Promise<WeeklyReport> => {
  const { data } = await api.put<WeeklyReport>(`/reports/${id}`, input);
  toast.success('Report updated');
  return data;
};

export const submitReport = async (id: number): Promise<WeeklyReport> => {
  const { data } = await api.patch<WeeklyReport>(`/reports/${id}/submit`);
  toast.success('Report submitted');
  return data;
};

export const deleteReport = async (id: number): Promise<void> => {
  await api.delete(`/reports/${id}`);
  toast.success('Draft deleted');
};

export const reviewReport = async (id: number): Promise<WeeklyReport> => {
  const { data } = await api.patch<WeeklyReport>(`/reports/${id}/review`);
  toast.success('Report reviewed');
  return data;
};

export const getAutoPopulateTickets = async (weekStart: string, weekEnd: string): Promise<AutoPopulateResponse> => {
  const { data } = await api.get<AutoPopulateResponse>("/reports/auto-populate", {
    params: { weekStart, weekEnd }
  });
  return data;
};

export const downloadDashboardSummaryCsv = () =>
  downloadCsv('/reports/summary.csv', 'dashboard-summary-report.csv');

export const downloadInventoryReportCsv = (filters?: InventoryReportFilters) =>
  downloadCsv('/reports/inventory.csv', filters?.roomId ? `inventory-room-${filters.roomId}-report.csv` : 'inventory-report.csv', filters);

export const downloadRoomReportCsv = () =>
  downloadCsv('/reports/rooms.csv', 'room-report.csv');

export const downloadWeeklyReportsCsv = (filters?: ReportFilters) =>
  downloadCsv('/reports/weekly.csv', 'weekly-reports.csv', filters);
