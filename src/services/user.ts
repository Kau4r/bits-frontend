import api from "./api";
import type { User } from "@/types/user"; // make sure you have a User type

// Fetch all users
export const fetchUsers = async (): Promise<User[]> => {
    const { data } = await api.get("/users");
    return data as User[];
};

// Fetch a single user by ID
export const fetchUserById = async (userId: string): Promise<User> => {
    const { data } = await api.get(`/users/${userId}`);
    return data as User;
};

// Add a new user
export const addUser = async (user: User): Promise<User> => {
    const { data } = await api.post("/users", user);
    return data as User;
};

export const updateUser = async (userId: number, user: User): Promise<User> => {
    const { data } = await api.put(`/users/${userId}`, user);
    return data as User;
};