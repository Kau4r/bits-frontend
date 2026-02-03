export interface User {
    User_ID: number;
    User_Role: User_Role;
    First_Name: string;
    Middle_Name?: string;
    Last_Name: string;
    Email: string;
    Is_Active: boolean;
    Created_At?: string;
    Updated_At?: string;
}

export const ROLES = {
    ADMIN: 'ADMIN',
    LAB_TECH: 'LAB_TECH',
    LAB_HEAD: 'LAB_HEAD',
    FACULTY: 'FACULTY',
    SECRETARY: 'SECRETARY',
    STUDENT: 'STUDENT',
} as const;

export type User_Role = typeof ROLES[keyof typeof ROLES];

export interface UserWithPassword extends User {
    password: string;
}

export const LOG_TYPES = {
    TICKET: 'TICKET',
    SCHEDULE: 'SCHEDULE',
    BORROWING: 'BORROWING',
    SYSTEM: 'SYSTEM',
    AUTH: 'AUTH',
    BOOKING: 'BOOKING',
    FORM: 'FORM',
    ROOM: 'ROOM',
    INVENTORY: 'INVENTORY',
} as const;

export type LogType = typeof LOG_TYPES[keyof typeof LOG_TYPES];

export interface ActivityLog {
    Log_ID: number;
    Action: string;
    Timestamp: string;
    Details: string | null;
    Log_Type?: LogType;
}
