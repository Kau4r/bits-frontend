import api from "@/services/api";
import toast from 'react-hot-toast';
import type { Room } from "@/types/room";
import type { RoomAuditStatus } from "@/types/semester";
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

export type QueueStatus = 'OPEN' | 'NEAR_FULL' | 'FULL';

export interface StudentUsageBooking {
    Booked_Room_ID: number;
    Room_ID: number;
    User_ID: number;
    Start_Time: string;
    End_Time: string;
    Status: 'APPROVED';
    Purpose?: string | null;
    Queue_Status?: QueueStatus;
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
    Queue_Status?: QueueStatus;
}

export interface ActiveQueueItem {
    Booked_Room_ID: number;
    Room_ID: number;
    User_ID: number;
    Start_Time: string;
    End_Time: string;
    Status: string;
    Purpose?: string | null;
    Queue_Status: QueueStatus;
    Room: {
        Room_ID: number;
        Name: string;
        Lab_Type: 'WINDOWS' | 'MAC' | null;
        Capacity: number;
        Room_Type: string;
    };
    User?: {
        User_ID: number;
        First_Name: string;
        Last_Name: string;
    } | null;
}

// Set room availability for students
export const setRoomStudentAvailability = async (id: number, data: { startTime: string; endTime: string; notes?: string }): Promise<StudentAvailabilityResponse> => {
    const response = await api.post<StudentAvailabilityResponse>(`/rooms/${id}/student-availability`, data);
    toast.success('Availability updated');
    return response.data;
};

// Fetch current and future lab openings for student usage
export const getOpenedLabs = async (): Promise<OpenedLabRoom[]> => {
    const { data } = await api.get<OpenedLabRoom[]>("/rooms/opened-labs");
    return data;
};

// Inventory audit completeness for a room in the active semester
export const getRoomAuditStatus = async (roomId: number): Promise<RoomAuditStatus> => {
    const { data } = await api.get<RoomAuditStatus>(`/rooms/${roomId}/audit-status`);
    return data;
};

// Update the queue occupancy status of an active Student-Usage booking.
export const updateQueueOccupancyStatus = async (
    bookingId: number,
    status: QueueStatus
): Promise<{ Booked_Room_ID: number; Queue_Status: QueueStatus }> => {
    const { data } = await api.patch<{ Booked_Room_ID: number; Queue_Status: QueueStatus }>(
        `/bookings/${bookingId}/occupancy-status`,
        { status }
    );
    return data;
};

// Fetch all currently-active Student-Usage queued sessions.
export const getActiveQueues = async (): Promise<ActiveQueueItem[]> => {
    const { data } = await api.get<ActiveQueueItem[]>('/bookings/active-queues');
    return data;
};
