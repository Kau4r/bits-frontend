import api from '@/services/api';
import toast from 'react-hot-toast';
import type { Semester } from '@/types/semester';

export const getSemesters = async (): Promise<Semester[]> => {
    const { data } = await api.get<Semester[]>('/semesters');
    return data;
};

export const getActiveSemester = async (): Promise<Semester | null> => {
    const { data } = await api.get<Semester | null>('/semesters/active');
    return data ?? null;
};

export interface CreateSemesterInput {
    name: string;
    startDate: string;
    endDate: string;
    activate?: boolean;
}

export const createSemester = async (input: CreateSemesterInput): Promise<Semester> => {
    const { data } = await api.post<Semester>('/semesters', input);
    toast.success('Semester created');
    return data;
};

export const activateSemester = async (id: number): Promise<Semester> => {
    const { data } = await api.patch<Semester>(`/semesters/${id}/activate`);
    toast.success('Semester activated');
    return data;
};
