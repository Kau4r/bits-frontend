import type { User } from "@/types/user";
import type { Room } from "@/types/room";
import type { Item } from "@/types/inventory";

export type TicketStatus = "PENDING" | "IN_PROGRESS" | "RESOLVED";
export type TicketPriority = "HIGH" | "MEDIUM" | "LOW";
export type TicketCategory = "HARDWARE" | "SOFTWARE" | "FACILITY" | "OTHER";

export interface Ticket {
    Ticket_ID: number;
    Reported_By_ID: number;
    Reported_By: User;
    Reporter_Identifier?: string | null;
    Item_ID?: number | null;
    Item?: Item | null;
    Report_Problem: string;
    Room_ID?: number | null;
    Room?: Room | null;
    Location?: string | null;
    Status: TicketStatus;
    Priority?: TicketPriority | null;
    Category?: TicketCategory | null;
    Technician_ID?: number | null;
    Technician?: User | null;
    Created_At: string;
    Updated_At: string;
    Archived: boolean;
    AuditLogs?: {
        Log_ID: number;
        Action: string;
        Timestamp: string;
    }[];
}

export interface NewTicketInput {
    Reported_By_ID: number;
    Report_Problem: string;
    Location?: string;
    Item_ID?: number;
    Room_ID?: number | null;
    Status?: TicketStatus;
    Priority?: TicketPriority | null;
    Category?: TicketCategory | null;
}
