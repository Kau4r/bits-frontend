import api from '@/services/api';
import type { CsvImportResult } from '@/services/inventory';
import toast from 'react-hot-toast';

// Types
export interface ComputerItem {
    Item_ID: number;
    Item_Code: string;
    Item_Type: string;
    Brand: string | null;
    Serial_Number: string | null;
    Status: 'AVAILABLE' | 'BORROWED' | 'DEFECTIVE' | 'LOST' | 'REPLACED' | 'DISPOSED';
}

export interface ComputerRoom {
    Room_ID: number;
    Name: string;
    Room_Type: string;
}

export interface Computer {
    Computer_ID: number;
    Name: string;
    Display_Name?: string;
    Display_Number?: number;
    Mac_Address: string | null;
    Status: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'DECOMMISSIONED';
    Is_Teacher?: boolean;
    Room_ID: number | null;
    Room: ComputerRoom | null;
    Item: ComputerItem[];
    Created_At: string;
    Updated_At: string;
}

// Free-form — types are data-driven (pulled from inventory at runtime). Kept
// as a string alias rather than a union so new types added to inventory work
// without a code change.
export type ComputerComponentType = string;

export interface CreateComputerItem {
    itemType: string;
    itemId?: number; // Existing item ID to link
    brand?: string; // For creating new items (deprecated - use itemId instead)
    serialNumber?: string; // For creating new items (deprecated - use itemId instead)
}

export interface CreateComputerPayload {
    name: string;
    roomId?: number;
    status?: Computer['Status'];
    isTeacher?: boolean;
    items?: CreateComputerItem[];
}

export interface UpdateComputerItem {
    itemId?: number; // Existing item ID, if updating
    itemType: string;
    brand?: string;
    serialNumber?: string;
    status?: ComputerItem['Status'];
}

export interface UpdateComputerPayload {
    name?: string;
    roomId?: number | null;
    status?: Computer['Status'];
    isTeacher?: boolean;
    items?: UpdateComputerItem[];
}

// API Functions

/** Alias for fetchComputers — used by student-facing components */
export const getComputers = async (roomId?: number): Promise<Computer[]> => {
    const params = roomId ? { roomId } : {};
    const response = await api.get<Computer[]>('/computers', { params });
    return response.data;
};

export const fetchComputers = async (roomId?: number): Promise<Computer[]> => {
    const params = roomId ? { roomId } : {};
    const response = await api.get<Computer[]>('/computers', { params });
    return response.data;
};

export const fetchComputerById = async (id: number): Promise<Computer> => {
    const response = await api.get<Computer>(`/computers/${id}`);
    return response.data;
};

export const createComputer = async (data: CreateComputerPayload): Promise<Computer> => {
    const response = await api.post<Computer>('/computers', data);
    toast.success('Computer added');
    return response.data;
};

export const updateComputer = async (id: number, data: UpdateComputerPayload): Promise<Computer> => {
    const response = await api.put<Computer>(`/computers/${id}`, data);
    toast.success('Computer updated');
    return response.data;
};

export const deleteComputer = async (id: number): Promise<void> => {
    await api.delete(`/computers/${id}`);
    toast.success('Computer deleted');
};

export const importComputersCsv = async (file: File, roomId: number): Promise<CsvImportResult> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('roomId', String(roomId));

    const response = await api.post<CsvImportResult>('/computers/import-csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
};

