import api from "./api";
import type { Booking, CreateBookingDTO, UpdateBookingStatusDTO } from "@/types/booking";
import type { Room } from "@/types/room";

// Fetch bookings with optional filters
export const getBookings = async (filters?: {
    status?: Booking["Status"];
    roomId?: number;
    userId?: number;
}): Promise<Booking[]> => {
    const { data } = await api.get<Booking[]>("/bookings", { params: filters });
    return data;
};

// Create a new booking
export const createBooking = async (dto: CreateBookingDTO): Promise<Booking> => {
    const { data } = await api.post<Booking>("/bookings", dto);
    return data;
};

// Update booking status
export const updateBookingStatus = async (
    id: number,
    dto: UpdateBookingStatusDTO
): Promise<Booking> => {
    const { data } = await api.patch<Booking>(`/bookings/${id}/status`, dto);
    return data;
};

// Update booking details
export const updateBooking = async (
    id: number,
    dto: Partial<CreateBookingDTO>
): Promise<Booking> => {
    const { data } = await api.patch<Booking>(`/bookings/${id}`, dto);
    return data;
};

// Get available rooms
export const fetchAvailableRooms = async (params: {
    startTime: string | Date;
    endTime: string | Date;
    capacity?: number;
}): Promise<Room[]> => {
    const { data } = await api.get<Room[]>("/bookings/available", { params });
    return data;
};
