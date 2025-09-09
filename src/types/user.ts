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

export type User_Role =
    | 'System Admin'
    | 'Lab Tech'
    | 'Lab Head'
    | 'Faculty'
    | 'Secretary'
    | 'Student';

export interface UserWithPassword extends User {
    password: string;
}