import type { Borrowing, CreateBorrowingDTO } from "@/types/borrowing";
import api from "./api";

const API_BASE = "/borrowing";

// Get all borrowings with optional filters
export const getBorrowings = async (params?: {
    status?: string;
    role?: 'borrower' | 'approver'
}): Promise<Borrowing[]> => {
    const { data } = await api.get<Borrowing[]>(API_BASE, { params });
    return data;
};

// Get pending borrowing count (for Lab Tech dashboard)
export const getPendingBorrowingCount = async (): Promise<number> => {
    const { data } = await api.get<{ count: number }>(`${API_BASE}/pending/count`);
    return data.count;
};

// Get a single borrowing by ID
export const getBorrowingById = async (id: number): Promise<Borrowing> => {
    const { data } = await api.get<Borrowing>(`${API_BASE}/${id}`);
    return data;
};

// Create a new borrowing request (status: PENDING)
export const createBorrowing = async (dto: CreateBorrowingDTO): Promise<any> => {
    const { data } = await api.post(API_BASE, dto);
    return data;
};

// Approve a borrowing request (Lab Tech/Lab Head only)
export const approveBorrowing = async (id: number): Promise<Borrowing> => {
    const { data } = await api.patch<{ borrowing: Borrowing }>(`${API_BASE}/${id}/approve`);
    return data.borrowing;
};

// Reject a borrowing request (Lab Tech/Lab Head only)
export const rejectBorrowing = async (id: number, reason?: string): Promise<Borrowing> => {
    const { data } = await api.patch<{ borrowing: Borrowing }>(`${API_BASE}/${id}/reject`, { reason });
    return data.borrowing;
};

// Return a borrowed item
export const returnBorrowing = async (id: number, options?: {
    condition?: 'AVAILABLE' | 'DEFECTIVE';
    remarks?: string
}): Promise<void> => {
    await api.patch(`${API_BASE}/${id}/return`, options);
};

// Delete a borrowing record (if needed)
export const deleteBorrowing = async (id: number): Promise<void> => {
    await api.delete(`${API_BASE}/${id}`);
};
