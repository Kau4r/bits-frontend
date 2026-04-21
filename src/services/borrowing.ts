import type { Borrowing, CreateBorrowingDTO } from "@/types/borrowing";
import api from "@/services/api";
import toast from "react-hot-toast";

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
    toast.success("Borrow request submitted");
    return data;
};

// Approve a borrowing request (Lab Tech/Lab Head only)
export const approveBorrowing = async (id: number, assignedItemId?: number): Promise<Borrowing> => {
    const { data } = await api.patch<{ borrowing: Borrowing }>(`${API_BASE}/${id}/approve`, { assignedItemId });
    toast.success("Borrow approved");
    return data.borrowing;
};

// Reject a borrowing request (Lab Tech/Lab Head only)
export const rejectBorrowing = async (id: number, reason?: string): Promise<Borrowing> => {
    const { data } = await api.patch<{ borrowing: Borrowing }>(`${API_BASE}/${id}/reject`, { reason });
    toast.success("Borrow request rejected");
    return data.borrowing;
};

// Return a borrowed item
export const returnBorrowing = async (id: number, options?: {
    condition?: 'AVAILABLE' | 'DEFECTIVE';
    remarks?: string
}): Promise<void> => {
    await api.patch(`${API_BASE}/${id}/return`, options);
    toast.success("Item returned");
};

// Delete a borrowing record (if needed)
export const deleteBorrowing = async (id: number): Promise<void> => {
    await api.delete(`${API_BASE}/${id}`);
    toast.success("Borrowing record deleted");
};
