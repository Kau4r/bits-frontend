import api from './api';

// Types
export interface ComputerItem {
    Item_ID: number;
    Item_Code: string;
    Item_Type: string;
    Brand: string | null;
    Serial_Number: string | null;
    Status: 'AVAILABLE' | 'BORROWED' | 'DEFECTIVE' | 'LOST' | 'REPLACED';
}

export interface ComputerRoom {
    Room_ID: number;
    Name: string;
    Room_Type: string;
}

export interface Computer {
    Computer_ID: number;
    Name: string;
    Status: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'DECOMMISSIONED';
    Room_ID: number | null;
    Room: ComputerRoom | null;
    Items: ComputerItem[];
    Created_At: string;
    Updated_At: string;
}

export interface CreateComputerItem {
    itemType: 'KEYBOARD' | 'MOUSE' | 'MONITOR' | 'SYSTEM_UNIT';
    brand?: string;
    serialNumber?: string;
}

export interface CreateComputerPayload {
    name: string;
    roomId?: number;
    status?: Computer['Status'];
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
    items?: UpdateComputerItem[];
}

// API Functions
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
    return response.data;
};

export const updateComputer = async (id: number, data: UpdateComputerPayload): Promise<Computer> => {
    const response = await api.put<Computer>(`/computers/${id}`, data);
    return response.data;
};

export const deleteComputer = async (id: number): Promise<void> => {
    await api.delete(`/computers/${id}`);
};

