export type RoomStatus = 'Available' | 'In Use' | 'Maintenance' | 'Occupied' | 'Reserved';

export const statusColors: Record<RoomStatus, string> = {
    Available: 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100',
    'In Use': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100',
    Maintenance: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
    Occupied: 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100',
    Reserved: 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100',
};

export const roomStatuses: RoomStatus[] = [
    'Available',
    'In Use',
    'Maintenance',
    'Occupied',
    'Reserved',
];

export type Room = {
    code: string
    type: string
    status: RoomStatus
}
