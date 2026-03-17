import api from "@/services/api";
import type { User, User_Role, ActivityLog } from "@/types/user";

// Fetch all users
export const fetchUsers = async (): Promise<User[]> => {
    const { data } = await api.get<User[]>("/users");
    return data;
};

// Fetch users by role (e.g., LAB_TECH, LAB_HEAD)
export const fetchUsersByRole = async (role: User_Role): Promise<User[]> => {
    const { data } = await api.get<User[]>("/users", { params: { role } });
    return data;
};

// Fetch user by ID
export const fetchUserById = async (userId: number): Promise<User> => {
    const { data } = await api.get<User>(`/users/${userId}`);
    return data;
};

// Add a new user
export const addUser = async (user: Omit<User, "User_ID">): Promise<User> => {
    const { data } = await api.post<User>("/users", user);
    return data;
};

// Update user
export const updateUser = async (userId: number, user: Partial<Omit<User, "User_ID">>): Promise<User> => {
    const { data } = await api.put<User>(`/users/${userId}`, user);
    return data;
};

// Fetch user activity history
export const fetchUserActivity = async (userId: number): Promise<ActivityLog[]> => {
    const { data } = await api.get<ActivityLog[]>(`/users/${userId}/history`);
    return data;
};
