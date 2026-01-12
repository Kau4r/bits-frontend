import api from "./api";
import type { Form, FormType, FormStatus, FormDepartment } from "@/types/formtypes";

// Input types for creating/updating forms
export interface FormCreateInput {
    creatorId: number;
    formType: FormType;
    title?: string;
    content?: string;
    fileName?: string;
    fileUrl?: string;
    fileType?: string;
    department?: FormDepartment;
}

export interface FormUpdateInput {
    status?: FormStatus;
    approverId?: number | null;
    title?: string;
    content?: string;
}

export interface FormFilters {
    type?: FormType | 'All';
    status?: FormStatus | 'All';
    department?: FormDepartment | 'All';
    archived?: boolean;
    search?: string;
}

// Fetch all forms with optional filters
export const getForms = async (filters?: FormFilters): Promise<Form[]> => {
    const { data } = await api.get<Form[]>("/forms", { params: filters });
    return data;
};

// Fetch form by ID
export const getFormById = async (id: number): Promise<Form> => {
    const { data } = await api.get<Form>(`/forms/${id}`);
    return data;
};

// Create new form
export const createForm = async (input: FormCreateInput): Promise<Form> => {
    const { data } = await api.post<Form>("/forms", input);
    return data;
};

// Update form (status, approver, etc.)
export const updateForm = async (id: number, input: FormUpdateInput): Promise<Form> => {
    const { data } = await api.patch<Form>(`/forms/${id}`, input);
    return data;
};

// Archive form
export const archiveForm = async (id: number): Promise<Form> => {
    const { data } = await api.patch<Form>(`/forms/${id}/archive`);
    return data;
};

// Transfer form to department
export const transferForm = async (id: number, department: FormDepartment, notes?: string): Promise<Form> => {
    const { data } = await api.post<Form>(`/forms/${id}/transfer`, { department, notes });
    return data;
};

// Delete form
export const deleteForm = async (id: number): Promise<void> => {
    await api.delete(`/forms/${id}`);
};
