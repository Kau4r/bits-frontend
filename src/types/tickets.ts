import type { User } from "./user";

// Enums
export type TicketStatus = "PENDING" | "IN_PROGRESS" | "RESOLVED";
export type TicketPriority = "HIGH" | "MEDIUM" | "LOW";
export type TicketCategory = "HARDWARE" | "SOFTWARE" | "FACILITY" | "OTHER";

// Room type
export interface Room {
    Room_ID: number;
    Room_Name: string;
    Location: string;
}

// Item type
export interface Item {
    Item_ID: number;
    Item_Type: string;
    Item_Code: string;
    Room_ID?: number;
    Room?: Room;
}

// Ticket type
export interface Ticket {
    Ticket_ID: number;

    // Reporter info
    Reported_By_ID: number;
    Reported_By: User;

    // Optional linked item
    Item_ID?: number;
    Item?: Item;

    // Problem description
    Report_Problem: string;

    // Location info
    Room_ID?: number;
    Room?: Room;
    Location?: string;

    // Lifecycle
    Status: TicketStatus;
    Priority?: TicketPriority;
    Category?: TicketCategory;

    // Technician handling
    Technician_ID?: number;
    Technician?: User;

    // Metadata
    Created_At: string;
    Updated_At: string;
    Archived: boolean;
}

// New Ticket input for creation
export type NewTicketInput = {
    Reported_By_ID: number;       // always required (comes from AuthContext usually)
    Report_Problem: string;       // required description
    Location?: string;            // optional free-text location
    Item_ID?: number;             // optional link to an item
    Room_ID?: number;             // optional link to a room

    // Initial values (defaults handled by backend if omitted)
    Status?: TicketStatus;        // defaults to "PENDING"
    Priority?: TicketPriority;    // set only by LabTech / LabHead / Faculty
    Category?: TicketCategory;    // set only by LabTech / LabHead / Faculty
};
