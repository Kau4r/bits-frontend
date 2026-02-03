import type { Room } from "./room";
import type { User } from "./user";

// Booking status
export type BookingStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export const bookingStatusColors: Record<BookingStatus, string> = {
    PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100",
    APPROVED: "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100",
    REJECTED: "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100",
    CANCELLED: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100",
};

export const bookingStatuses: BookingStatus[] = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"];

// Booking interface
export interface Booking {
    Booked_Room_ID: number;
    User_ID: number;
    Room_ID: number;
    Start_Time: string;
    End_Time: string;
    Status: BookingStatus;
    Purpose?: string;
    Notes?: string;
    Created_At: string;
    Updated_At: string;

    User?: Pick<User, "First_Name" | "Last_Name" | "Email">;
    Room?: Room;
    Approver?: Pick<User, "First_Name" | "Last_Name" | "User_Role"> | null;

    Borrowed_Items?: number[]; // Array of item/computer IDs
}

// DTOs
export interface CreateBookingDTO {
    User_ID: number;
    Room_ID: number;
    Start_Time: string;
    End_Time: string;
    Purpose?: string;
    Borrowed_Items?: number[];
}

export interface UpdateBookingStatusDTO {
    status: "APPROVED" | "REJECTED" | "CANCELLED";
    approverId: number;
    notes?: string;
}
