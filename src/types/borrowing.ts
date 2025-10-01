import type { Item, Computer } from "./inventory";

// Borrowing status
export type BorrowingStatus = "PENDING" | "APPROVED" | "REJECTED" | "BORROWED" | "RETURNED" | "OVERDUE";

export const borrowingStatusColors: Record<BorrowingStatus, string> = {
    PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100",
    APPROVED: "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100",
    REJECTED: "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100",
    BORROWED: "bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100",
    RETURNED: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100",
    OVERDUE: "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100",
};

export const borrowingStatuses: BorrowingStatus[] = ["PENDING", "APPROVED", "REJECTED", "BORROWED", "RETURNED", "OVERDUE"];

// Borrowing interface
export interface Borrowing {
    Borrow_Item_ID: number;
    Borrower_ID: number;
    Borrowee_ID: number;
    Item?: Item;
    Computer?: Computer;
    Borrow_Date: string;
    Return_Date?: string;
    Status: BorrowingStatus;
}

// DTOs
export interface CreateBorrowingDTO {
    User_ID: number;
    Item_ID?: number;
    Computer_ID?: number;
    Start_Time: string | Date;
    End_Time: string | Date;
}

export interface UpdateBorrowingStatusDTO {
    status: BorrowingStatus;
    approverId?: number;
}
