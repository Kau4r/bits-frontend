import api from "@/services/api";
import type { Form, FormType, FormStatus, FormDepartment } from "@/types/formtypes";
import { getApiBaseUrl, getAppBaseUrl } from "@/utils/apiBaseUrl";

interface ResolveFormFileUrlOptions {
    download?: boolean;
    fileName?: string | null;
}

const uploadPathPrefixes = [
    '/api/upload/files/',
    '/upload/files/',
    '/api/uploads/',
    '/uploads/',
];

const getUploadedFileName = (url: string): string | undefined => {
    try {
        const parsedUrl = new URL(url, `${getAppBaseUrl()}/`);
        const prefix = uploadPathPrefixes.find(pathPrefix => parsedUrl.pathname.startsWith(pathPrefix));
        if (!prefix) return undefined;

        const fileName = parsedUrl.pathname.slice(prefix.length).split('/').pop();
        return fileName ? decodeURIComponent(fileName) : undefined;
    } catch {
        return undefined;
    }
};

const buildUploadFileUrl = (storedFileName: string, options: ResolveFormFileUrlOptions = {}) => {
    const params = new URLSearchParams();
    if (options.download) params.set('download', '1');
    if (options.download && options.fileName) params.set('name', options.fileName);

    const query = params.toString();
    return `${getApiBaseUrl()}/upload/files/${encodeURIComponent(storedFileName)}${query ? `?${query}` : ''}`;
};

export const resolveFormFileUrl = (url?: string | null, options: ResolveFormFileUrlOptions = {}): string | undefined => {
    if (!url) return undefined;

    const trimmedUrl = url.trim();
    if (!trimmedUrl) return undefined;

    const storedFileName = getUploadedFileName(trimmedUrl);
    if (storedFileName) {
        return buildUploadFileUrl(storedFileName, options);
    }

    return trimmedUrl;
};

// Input types for creating/updating forms
export interface FormCreateInput {
    creatorId: number;
    formType: FormType;
    title?: string;
    content?: string;
    fileName?: string;
    fileUrl?: string;
    fileType?: string;
    attachments?: FormAttachmentInput[];
    department?: FormDepartment;
    requesterName?: string;
    remarks?: string;
}

export interface FormUpdateInput {
    status?: FormStatus;
    approverId?: number | null;
    title?: string;
    content?: string;
    fileName?: string | null;
    fileUrl?: string | null;
    fileType?: string | null;
    requesterName?: string;
    remarks?: string;
}

export interface FormAttachmentInput {
    fileName: string;
    fileUrl: string;
    fileType?: string | null;
    department?: FormDepartment;
    notes?: string | null;
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

// Add proof/supporting attachment to a form
export const addFormAttachment = async (id: number, input: FormAttachmentInput): Promise<Form> => {
    const { data } = await api.post<Form>(`/forms/${id}/attachments`, input);
    return data;
};

// Delete form
export const deleteForm = async (id: number): Promise<void> => {
    await api.delete(`/forms/${id}`);
};

// Upload file
export const uploadFile = async (file: File): Promise<{ url: string; filename: string; mimetype: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post<{ url: string; filename: string; mimetype: string; storedFilename: string; size: number }>('/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });

    return {
        ...data,
        url: resolveFormFileUrl(data.url) || data.url
    };
};
