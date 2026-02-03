import api from './api';

export interface Computer {
    Computer_ID: number;
    Name: string;
    Mac_Address: string | null;
    Status: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'DECOMMISSIONED';
    Room_ID: number | null;
    Created_At: string;
    Updated_At: string;
    Room?: {
        Room_ID: number;
        Name: string;
        Room_Type: string;
    };
    Items?: Array<{
        Item_ID: number;
        Item_Code: string;
        Item_Type: string;
        Brand: string | null;
        Serial_Number: string | null;
        Status: string;
    }>;
}

export interface CreateComputerData {
    name: string;
    macAddress?: string;
    roomId?: number;
    status?: string;
    items?: Array<{
        itemType: string;
        brand?: string;
        serialNumber?: string;
    }>;
}

export interface UpdateComputerData {
    name?: string;
    macAddress?: string;
    roomId?: number;
    status?: string;
    items?: Array<{
        itemId?: number;
        itemType: string;
        brand?: string;
        serialNumber?: string;
        status?: string;
    }>;
}

/**
 * Get all computers, optionally filtered by room
 */
export const getComputers = async (roomId?: number): Promise<Computer[]> => {
    const params = roomId ? { roomId } : {};
    const response = await api.get('/computers', { params });
    return response.data;
};

/**
 * Get a single computer by ID
 */
export const getComputerById = async (id: number): Promise<Computer> => {
    const response = await api.get(`/computers/${id}`);
    return response.data;
};

/**
 * Get a computer by MAC address
 */
export const getComputerByMac = async (macAddress: string): Promise<Computer> => {
    const response = await api.get(`/computers/by-mac/${macAddress}`);
    return response.data;
};

/**
 * Create a new computer
 */
export const createComputer = async (data: CreateComputerData): Promise<Computer> => {
    const response = await api.post('/computers', data);
    return response.data;
};

/**
 * Update an existing computer
 */
export const updateComputer = async (id: number, data: UpdateComputerData): Promise<Computer> => {
    const response = await api.put(`/computers/${id}`, data);
    return response.data;
};

/**
 * Delete a computer
 */
export const deleteComputer = async (id: number): Promise<void> => {
    await api.delete(`/computers/${id}`);
};

/**
 * Detect the current computer's MAC address (browser limitation - may not work)
 * This is a placeholder - actual MAC detection requires native code or special permissions
 */
export const detectMacAddress = async (): Promise<string | null> => {
    // Note: Browsers cannot directly access MAC addresses for security reasons
    // This would need to be implemented via:
    // 1. A browser extension
    // 2. A local agent/service running on the computer
    // 3. Server-side detection when the computer makes a request

    console.warn('MAC address detection not available in browser');
    return null;
};
