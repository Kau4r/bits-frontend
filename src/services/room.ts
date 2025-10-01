import api from "./api";
import type { Room, RoomType, RoomStatus } from "@/types/room";


// Shape for creating a new room (exclude auto fields)
export type RoomCreateInput = {
    Name: string;
    Capacity: number;
    Room_Type: RoomType;
    Status: RoomStatus;
};

// Shape for updating a room (all optional except ID in URL)
export type RoomUpdateInput = Partial<RoomCreateInput>;
// Fetch all rooms
export const getRooms = async (): Promise<Room[]> => {
    const res = await api.get<Room[]>("/rooms"); // <-- generic here
    return res.data;
};

// Fetch room by ID
export const getRoomById = async (id: number): Promise<Room> => {
    const res = await api.get<Room>(`${"/rooms"}/${id}`); // <-- generic here
    return res.data;
};

// Create a new room
export const createRoom = async (room: Partial<Room> & { Created_By: number }): Promise<Room> => {
    const { Name, Capacity, Room_Type, Created_By } = room;
    const res = await api.post<Room>("/rooms", { Name, Capacity, Room_Type, Created_By });
    return res.data;
};

export const updateRoom = async (id: number, room: Partial<Room>): Promise<Room> => {
    console.log("updateRoom called:", id, room);
    const res = await api.put<{ message: string; room: Room }>(`${"/rooms"}/${id}`, room);
    console.log("updateRoom response:", res.data);
    return res.data.room; // <-- extract the Room object
};
