import api from "./api";
import type { User } from "@/types/user";

// Fetch all users
export const fetchUsers = async (): Promise<User[]> => {
    const { data } = await api.get<User[]>("/users");
    return data;
};

// Fetch a single user by ID
export const fetchUserById = async (userId: string): Promise<User> => {
    const { data } = await api.get<User>(`/users/${userId}`);
    return data;
};

// Add a new user
export const addUser = async (user: User): Promise<User> => {
    const { data } = await api.post<User>("/users", user);
    return data;
};

// Update an existing user
export const updateUser = async (userId: number, user: User): Promise<User> => {
    const { data } = await api.put<User>(`/users/${userId}`, user);
    return data;
};
