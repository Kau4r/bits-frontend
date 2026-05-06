import api from "@/services/api";
import type { OpenedLabRoom } from "@/services/room";

// ----- Types -----

export interface PublicLectureRoom {
    Room_ID: number;
    Name: string;
    Room_Type: 'LECTURE';
    Capacity: number;
    Status: string;
    Current_Use_Type?: string | null;
    // What's happening in the room "right now" — derived server-side from
    // the live schedule + approved bookings. Falls back to 'NONE' for older
    // backends that don't include this field.
    Current_Activity?: 'CLASS' | 'BOOKED' | 'NONE';
}

export type PublicScheduleSlotSource = {
    source: 'SCHEDULE' | 'BOOKING';
    title: string;
    type?: string | null;
};

export interface PublicScheduleSlot {
    startIso: string;
    endIso: string;
    hour: number; // local hour, 0-23
    sources: PublicScheduleSlotSource[];
}

export interface PublicScheduleDay {
    date: string; // YYYY-MM-DD (local)
    dayOfWeek: number; // 0=Sun … 6=Sat
    slots: PublicScheduleSlot[];
}

export interface PublicRoomSchedule {
    room: {
        Room_ID: number;
        Name: string;
        Room_Type: string;
        Capacity: number;
    };
    days: PublicScheduleDay[];
}

// ----- API calls -----

// GET /rooms/public/opened-labs — same shape as authenticated getOpenedLabs.
export const getPublicOpenedLabs = async (): Promise<OpenedLabRoom[]> => {
    const { data } = await api.get<OpenedLabRoom[]>("/rooms/public/opened-labs");
    return data;
};

// GET /rooms/public/lecture-rooms — safe projection only.
export const getPublicLectureRooms = async (): Promise<PublicLectureRoom[]> => {
    const { data } = await api.get<PublicLectureRoom[]>("/rooms/public/lecture-rooms");
    return data;
};

// GET /rooms/public/:roomId/schedule-7day
export const getPublicRoomSchedule = async (roomId: number): Promise<PublicRoomSchedule> => {
    const { data } = await api.get<PublicRoomSchedule>(`/rooms/public/${roomId}/schedule-7day`);
    return data;
};

// ----- Public rooms list (for issue report dropdown) -----

export interface PublicRoom {
    Room_ID: number;
    Name: string;
    Room_Type: string;
}

// GET /rooms/public — all rooms, narrow projection.
export const getPublicRooms = async (): Promise<PublicRoom[]> => {
    const { data } = await api.get<PublicRoom[]>('/rooms/public');
    return data;
};

// ----- Public ticket submission -----

export interface PublicTicketPayload {
    reporterIdentifier: string;
    roomId: number | null;
    issueType: 'HARDWARE' | 'SOFTWARE' | 'NETWORK' | 'OTHER';
    equipment?: 'MONITOR' | 'KEYBOARD' | 'MOUSE' | 'MINI_PC' | 'HEADSET' | 'OTHER';
    description: string;
    pcNumber?: string;
}

// POST /tickets/public
export const createPublicTicket = async (payload: PublicTicketPayload): Promise<{ Ticket_ID: number }> => {
    const { data } = await api.post<{ Ticket_ID: number }>('/tickets/public', payload);
    return data;
};
