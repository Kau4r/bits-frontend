export type RoomType = 'CONSULTATION' | 'CONFERENCE' | 'LECTURE' | 'LAB' | 'OTHER';
export type LabType = 'WINDOWS' | 'MAC';
export type LabCategory = LabType | 'UNASSIGNED';
export type RoomStatus = 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'RESERVED' | 'CLOSED';

export const statusColors: Record<RoomStatus, string> = {
    AVAILABLE: 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100',
    IN_USE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100',
    MAINTENANCE: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
    RESERVED: 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100',
    CLOSED: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-100',
};

export const roomStatuses: RoomStatus[] = ['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'RESERVED', 'CLOSED'];
export const roomTypes: RoomType[] = ['CONSULTATION', 'CONFERENCE', 'LECTURE', 'LAB', 'OTHER'];

export interface RoomSchedule {
    Schedule_ID: number;
    Room_ID: number;
    Schedule_Type?: 'CLASS' | 'FACULTY_USE' | 'STUDENT_USE' | 'MAINTENANCE' | 'SPECIAL_EVENT';
    Days: string;       // Comma-separated day numbers, e.g., "1,2,3,4,5"
    Start_Time: string; // ISO datetime string
    End_Time: string;   // ISO datetime string
    Title?: string;     // Optional schedule title/description
}

export interface Room {
    Room_ID: number;
    Name: string;
    Capacity: number;
    Room_Type: RoomType;
    Status: RoomStatus;
    Lab_Type?: LabType | null;
    Schedule?: RoomSchedule[]; // Optional array of schedules for this room
}

export interface RoomSession {
    roomId: number;
    roomName: string;
    startTime: string; // ISO datetime
    endTime: string;   // ISO datetime
    status: 'pending' | 'approved' | 'rejected';
    purpose?: string;
    bookedByName?: string;
    userId?: number;
    id?: number;
    type: 'booking' | 'schedule';
}
