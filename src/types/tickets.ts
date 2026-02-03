import type { User } from "./user";
import type { Room } from "./room";
import type { Item } from "./inventory";

export type TicketStatus = "PENDING" | "IN_PROGRESS" | "RESOLVED";
export type TicketPriority = "HIGH" | "MEDIUM" | "LOW";
export type TicketCategory = "HARDWARE" | "SOFTWARE" | "FACILITY" | "OTHER";

export interface Ticket {
    Ticket_ID: number;
    Reported_By_ID: number;
    Reported_By: User;
    Item_ID?: number;
    Item?: Item;
    Report_Problem: string;
    Room_ID?: number;
    Room?: Room;
    Location?: string;
    Status: TicketStatus;
    Priority?: TicketPriority;
    Category?: TicketCategory;
    Technician_ID?: number;
    Technician?: User;
    Created_At: string;
    Updated_At: string;
    Archived: boolean;
}

export interface NewTicketInput {
    Reported_By_ID: number;
    Report_Problem: string;
    Location?: string;
    Item_ID?: number;
    Room_ID?: number;
    Status?: TicketStatus;
    Priority?: TicketPriority;
    Category?: TicketCategory;
}
