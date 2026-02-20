import api from "./api";
import type { WeeklyReport, ReportCreateInput, ReportUpdateInput, ReportStatus, AutoPopulateResponse } from "@/types/report";

export interface ReportFilters {
  userId?: number;
  status?: ReportStatus;
}

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
  return data;
};

export const updateReport = async (id: number, input: ReportUpdateInput): Promise<WeeklyReport> => {
  const { data } = await api.put<WeeklyReport>(`/reports/${id}`, input);
  return data;
};

export const submitReport = async (id: number): Promise<WeeklyReport> => {
  const { data } = await api.patch<WeeklyReport>(`/reports/${id}/submit`);
  return data;
};

export const reviewReport = async (id: number): Promise<WeeklyReport> => {
  const { data } = await api.patch<WeeklyReport>(`/reports/${id}/review`);
  return data;
};

export const getAutoPopulateTickets = async (weekStart: string, weekEnd: string): Promise<AutoPopulateResponse> => {
  const { data } = await api.get<AutoPopulateResponse>("/reports/auto-populate", {
    params: { weekStart, weekEnd }
  });
  return data;
};
