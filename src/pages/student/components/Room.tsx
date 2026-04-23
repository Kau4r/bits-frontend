// Define the Room type
export interface Room {
    id: number;
    name: string;
    type: 'MAC' | 'Windows' | 'Lecture';
    capacity: number;
    isAvailable: boolean;
    schedule: string;
    nextAvailable: string;
    scheduleBlocks?: Array<{
        id: number | string;
        title: string;
        time: string;
    }>;
    openedBy?: string;  // Lab tech name if opened
    openedAt?: string;  // Timestamp when opened
}
