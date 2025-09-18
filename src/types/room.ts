// Matches your Prisma enum RoomType
export type RoomType = 'CONSULTATION' | 'LECTURE' | 'LAB';

// Matches your Prisma enum RoomStatus
export type RoomStatus = 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'OCCUPIED' | 'RESERVED';

// Color mapping for UI (camelCase or readable labels for frontend use)
export const statusColors: Record<RoomStatus, string> = {
    AVAILABLE: 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100',
    IN_USE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100',
    MAINTENANCE: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
    OCCUPIED: 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100',
    RESERVED: 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100',
};

export const roomStatuses: RoomStatus[] = [
    'AVAILABLE',
    'IN_USE',
    'MAINTENANCE',
    'OCCUPIED',
    'RESERVED',
];

// Room type options for UI dropdowns, etc.
export const roomTypes: RoomType[] = ['CONSULTATION', 'LECTURE', 'LAB'];

// Room interface (matches Prisma schema)
export type Room = {
    Room_ID: number;
    Name: string;
    Capacity: number;
    Room_Type: RoomType;
    Status: RoomStatus;
};
