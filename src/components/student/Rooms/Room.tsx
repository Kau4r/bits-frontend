// Define the Room type
export interface Room {
    id: number;
    name: string;
    roomCode: string;
    type: 'MAC' | 'Windows';
    capacity: number;
    isAvailable: boolean;
    schedule: string;  // Time the current room is open
    nextAvailable?: string;  // Room code of the next available room
}

//ALL JUST MOCK DATA

export const laboratoryRooms: Room[] = [
    {
        id: 1,
        name: "Mac Laboratory",
        roomCode: "LB601",
        type: 'MAC',
        capacity: 30,
        isAvailable: true,
        schedule: "9:00 AM - 12:00 PM",
        nextAvailable: "LB602"  // Next available room
    },
    {
        id: 2,
        name: "Windows Laboratory",
        roomCode: "LB602",
        type: 'Windows',
        capacity: 35,
        isAvailable: true,
        schedule: "1:00 PM - 4:00 PM",
        nextAvailable: "LB101"  // Next available room
    }
];

export const lectureRooms: Room[] = [
    { 
        id: 1, 
        name: "LB 101", 
        roomCode: "LB101",
        type: 'Windows',
        capacity: 50, 
        isAvailable: true, 
        schedule: "9:00 AM - 10:30 AM",
        nextAvailable: "LB102"
    },
    { 
        id: 2, 
        name: "LB 102", 
        roomCode: "LB102",
        type: 'Windows',
        capacity: 45, 
        isAvailable: true, 
        schedule: "10:30 AM - 12:00 PM",
        nextAvailable: "LB103"
    },
    { 
        id: 3, 
        name: "LB 103", 
        roomCode: "LB103",
        type: 'Windows',
        capacity: 40, 
        isAvailable: false, 
        schedule: "1:00 PM - 2:30 PM",
        nextAvailable: "LB104"
    },
    { 
        id: 4, 
        name: "LB 104", 
        roomCode: "LB104",
        type: 'Windows',
        capacity: 35, 
        isAvailable: true, 
        schedule: "2:30 PM - 4:00 PM",
        nextAvailable: "LB105"
    },
    { 
        id: 5, 
        name: "LB 105", 
        roomCode: "LB105",
        type: 'Windows',
        capacity: 30, 
        isAvailable: true, 
        schedule: "4:00 PM - 5:30 PM",
        nextAvailable: "LB601"  // Loops back to first lab
    }
];