export interface User {
    User_ID: number;
    Username?: string;
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
    SECRETARY: 'SECRETARY',
    LAB_HEAD: 'LAB_HEAD',
    LAB_TECH: 'LAB_TECH',
    FACULTY: 'FACULTY',
    STUDENT: 'STUDENT',
} as const;

export type User_Role = typeof ROLES[keyof typeof ROLES];

const ROLE_ALIASES: Record<string, User_Role> = {
    ADMIN: ROLES.ADMIN,
    LAB_TECH: ROLES.LAB_TECH,
    LABTECH: ROLES.LAB_TECH,
    LAB_HEAD: ROLES.LAB_HEAD,
    LABHEAD: ROLES.LAB_HEAD,
    FACULTY: ROLES.FACULTY,
    SECRETARY: ROLES.SECRETARY,
    STUDENT: ROLES.STUDENT,
};

export const normalizeUserRole = (role?: string | null): User_Role | null => {
    if (!role) return null;
    const normalized = role.trim().toUpperCase().replace(/[\s-]+/g, '_');
    return ROLE_ALIASES[normalized] ?? null;
};

export const normalizeUser = (user: User): User => {
    const normalizedRole = normalizeUserRole(user.User_Role);
    return normalizedRole ? { ...user, User_Role: normalizedRole } : user;
};

export const isLabStaffRole = (role?: string | null, includeAdmin = false) => {
    const normalizedRole = normalizeUserRole(role);
    return normalizedRole === ROLES.LAB_TECH ||
        normalizedRole === ROLES.LAB_HEAD ||
        (includeAdmin && normalizedRole === ROLES.ADMIN);
};

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
