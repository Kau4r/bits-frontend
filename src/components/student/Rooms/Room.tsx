// Define the Room type
export interface Room {
    id: number;
    name: string;
    type: 'MAC' | 'Windows' | 'Lecture';
    capacity: number;
    isAvailable: boolean;
    schedule: string;
    nextAvailable: string;
    openedBy?: string;  // Lab tech name if opened
    openedAt?: string;  // Timestamp when opened
}

// Laboratory Rooms
export const laboratoryRooms: Room[] = [
    {
        id: 1,
        name: "Mac Laboratory",
        type: 'MAC',
        capacity: 30,
        isAvailable: true,
        schedule: "9:00 AM - 12:00 PM",
        nextAvailable: "LB602",
        openedBy: "John Doe",
        openedAt: "2023-08-25T08:30:00"
    },
    {
        id: 2,
        name: "Windows Laboratory",
        type: 'Windows',
        capacity: 35,
        isAvailable: true,
        schedule: "1:00 PM - 4:00 PM",
        nextAvailable: "LB101",
        openedBy: "Jane Smith",
        openedAt: "2023-08-25T08:45:00"
    }
];

// Lecture Rooms
export const lectureRooms: Room[] = [
    { 
        id: 1, 
        name: "LB 101", 
        type: 'Lecture',
        capacity: 50, 
        isAvailable: true, 
        schedule: "9:00 AM - 10:30 AM",
        nextAvailable: "10:30 AM"
    },
    { 
        id: 2, 
        name: "LB 102", 
        type: 'Lecture',
        capacity: 45, 
        isAvailable: true, 
        schedule: "10:30 AM - 12:00 PM",
        nextAvailable: "12:00 PM"
    },
    { 
        id: 3, 
        name: "LB 103", 
        type: 'Lecture',
        capacity: 40, 
        isAvailable: false, 
        schedule: "1:00 PM - 2:30 PM",
        nextAvailable: "2:30 PM"
    },
    { 
        id: 4, 
        name: "LB 104", 
        type: 'Lecture',
        capacity: 35, 
        isAvailable: true, 
        schedule: "2:30 PM - 4:00 PM",
        nextAvailable: "4:00 PM"
    },
    { 
        id: 5, 
        name: "LB 105", 
        type: 'Lecture',
        capacity: 30, 
        isAvailable: true, 
        schedule: "4:00 PM - 5:30 PM",
        nextAvailable: "5:30 PM"
    }
];