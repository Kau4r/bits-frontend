import api from "./api";
import type { Room } from "@/types/room";

// Create / update shapes
export type RoomCreateInput = Omit<Room, "Room_ID"> & { Created_By: number };
export type RoomUpdateInput = Partial<Omit<Room, "Room_ID">>;

// Fetch all rooms
export const getRooms = async (): Promise<Room[]> => {
    const { data } = await api.get<Room[]>("/rooms");
    return data;
};

// Fetch room by ID
export const getRoomById = async (id: number): Promise<Room> => {
    const { data } = await api.get<Room>(`/rooms/${id}`);
    return data;
};

// Create new room
export const createRoom = async (room: RoomCreateInput): Promise<Room> => {
    const { data } = await api.post<Room>("/rooms", room);
    return data;
};

// Update room
export const updateRoom = async (id: number, room: RoomUpdateInput): Promise<Room> => {
    const { data } = await api.put<{ message: string; room: Room }>(`/rooms/${id}`, room);
    return data.room;
};
