import api from "@/services/api";
import type { User, User_Role, ActivityLog } from "@/types/user";
import toast from 'react-hot-toast';

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
    toast.success('User created');
    return data;
};

// Update user
export const updateUser = async (userId: number, user: Partial<Omit<User, "User_ID">>): Promise<User> => {
    const { data } = await api.put<User>(`/users/${userId}`, user);
    toast.success('User updated');
    return data;
};

// Fetch user activity history
export const fetchUserActivity = async (userId: number): Promise<ActivityLog[]> => {
    const { data } = await api.get<ActivityLog[]>(`/users/${userId}/history`);
    return data;
};

// Role change — failsafe API
export interface RoleChangeBlocker {
    kind: string;
    message: string;
}

export interface RoleChangeImpact {
    user: { User_ID: number; First_Name: string; Last_Name: string; User_Role: User_Role; Is_Active: boolean };
    impact: {
        activeAssignedTickets: Array<{ Ticket_ID: number; Status: string; Priority: string | null; Report_Problem: string; Created_At: string }>;
        activeBorrowingsAsBorrower: Array<{ Borrow_Item_ID: number; Status: string; Return_Date: string | null; Item: { Item_Code: string; Item_Type: string } | null }>;
        pendingFormsAsApprover: Array<{ Form_ID: number; Form_Code: string; Status: string; Department: string }>;
        pendingBookingsAsApprover: Array<{ Booked_Room_ID: number; Status: string; Start_Time: string; Room: { Name: string } | null }>;
        futureBookingsAsRequester: Array<{ Booked_Room_ID: number; Status: string; Start_Time: string; Room: { Name: string } | null }>;
        counts: {
            tickets: number;
            borrowings: number;
            formsAsApprover: number;
            pendingBookingsAsApprover: number;
            futureBookingsAsRequester: number;
        };
        blockers: RoleChangeBlocker[];
    };
}

export const getRoleChangeImpact = async (userId: number): Promise<RoleChangeImpact> => {
    const { data } = await api.get<RoleChangeImpact>(`/users/${userId}/role-change-impact`);
    return data;
};

export interface ChangeUserRoleResult {
    message: string;
    userId: number;
    oldRole: User_Role;
    newRole: User_Role;
    tokenValidAfter: string;
    impactSnapshot: RoleChangeImpact['impact']['counts'];
}

export const changeUserRole = async (
    userId: number,
    payload: { newRole: User_Role; reason: string; force?: boolean }
): Promise<ChangeUserRoleResult> => {
    const { data } = await api.patch<ChangeUserRoleResult>(`/users/${userId}/role`, payload);
    toast.success('Role changed. The user will be required to log in again.');
    return data;
};
