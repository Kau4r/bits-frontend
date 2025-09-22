export interface User {
    User_ID: number
    User_Role: User_Role
    First_Name: string
    Middle_Name?: string
    Last_Name: string
    Email: string
    Is_Active: boolean
    Created_At?: string
    Updated_At?: string
}

export const ROLES = {
    ADMIN: 'ADMIN',
    LAB_TECH: 'LAB_TECH',
    LAB_HEAD: 'LAB_HEAD',
    FACULTY: 'FACULTY',
    SECRETARY: 'SECRETARY',
    STUDENT: 'STUDENT',
} as const;

export type User_Role = typeof ROLES[keyof typeof ROLES];

export interface UserWithPassword extends User {
    password: string;
}




