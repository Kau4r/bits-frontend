import type { Borrowing, CreateBorrowingDTO, UpdateBorrowingStatusDTO } from "@/types/borrowing";
import api from "./api";

const API_BASE = "/borrowings";

export const getBorrowings = async (): Promise<Borrowing[]> => {
    const { data } = await api.get<Borrowing[]>(API_BASE);
    return data;
};

export const getBorrowingById = async (id: number): Promise<Borrowing> => {
    const { data } = await api.get<Borrowing>(`${API_BASE}/${id}`);
    return data;
};

export const createBorrowing = async (dto: CreateBorrowingDTO): Promise<Borrowing> => {
    const { data } = await api.post<Borrowing>(API_BASE, dto);
    return data;
};

export const updateBorrowing = async (
    id: number,
    dto: UpdateBorrowingStatusDTO
): Promise<Borrowing> => {
    const { data } = await api.patch<Borrowing>(`${API_BASE}/${id}`, dto);
    return data;
};

export const deleteBorrowing = async (id: number): Promise<void> => {
    await api.delete(`${API_BASE}/${id}`);
};
