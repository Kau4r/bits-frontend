import api from "@/services/api";
import type { Room } from "@/types/room";
import { sortRoomsForDisplay } from "@/utils/roomSort";

// Create / update shapes
export type RoomCreateInput = Omit<Room, "Room_ID"> & { Created_By: number };
export type RoomUpdateInput = Partial<Omit<Room, "Room_ID">>;

// Fetch all rooms
export const getRooms = async (): Promise<Room[]> => {
    const { data } = await api.get<Room[]>("/rooms");
    return sortRoomsForDisplay(data);
};

// Fetch room by ID
export const getRoomById = async (id: number): Promise<Room> => {
    const { data } = await api.get<Room>(`/rooms/${id}`);
    return data;
};

// Create new room
export const createRoom = async (room: RoomCreateInput): Promise<Room> => {
    const { data } = await api.post<Room>("/rooms", room);
    return data;
};

// Update room
export const updateRoom = async (id: number, room: RoomUpdateInput): Promise<Room> => {
    const { data } = await api.put<{ message: string; room: Room }>(`/rooms/${id}`, room);
    return data.room;
};

export interface StudentAvailabilityResponse {
    message: string;
    roomId: number;
    roomName: string;
    startTime: string;
    endTime: string;
    auditLogId?: number;
    bookingId: number;
    rejectedBookings?: Array<{
        id: number;
        userId: number;
        startTime: string;
        endTime: string;
    }>;
}

export interface StudentUsageBooking {
    Booked_Room_ID: number;
    Room_ID: number;
    User_ID: number;
    Start_Time: string;
    End_Time: string;
    Status: 'APPROVED';
    Purpose?: string | null;
    Created_At?: string;
    Updated_At?: string;
    User?: {
        User_ID: number;
        First_Name: string;
        Last_Name: string;
    } | null;
}

export interface OpenedLabRoom extends Room {
    Opened_At?: string | null;
    Opened_By_User?: {
        User_ID: number;
        First_Name: string;
        Last_Name: string;
    } | null;
    Booked_Rooms?: StudentUsageBooking[];
}

// Set room availability for students
export const setRoomStudentAvailability = async (id: number, data: { startTime: string; endTime: string; notes?: string }): Promise<StudentAvailabilityResponse> => {
    const response = await api.post<StudentAvailabilityResponse>(`/rooms/${id}/student-availability`, data);
    return response.data;
};

// Fetch current and future lab openings for student usage
export const getOpenedLabs = async (): Promise<OpenedLabRoom[]> => {
    const { data } = await api.get<OpenedLabRoom[]>("/rooms/opened-labs");
    return data;
};
