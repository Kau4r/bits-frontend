import api from "@/services/api";
import type { Ticket, NewTicketInput, TicketStatus, TicketPriority, TicketCategory } from "@/types/tickets";
import toast from "react-hot-toast";

// Filter types
export interface TicketFilters {
    status?: TicketStatus;
    technicianId?: number;
    excludeStatus?: TicketStatus;
    unassigned?: boolean;
}

// Fetch all tickets with optional filters
export const fetchTickets = async (filters?: TicketStatus | TicketFilters): Promise<Ticket[]> => {
    // Handle backward compatibility where argument implies status
    const params = typeof filters === 'string' ? { status: filters } : filters;
    const { data } = await api.get<Ticket[]>("/tickets", { params });
    return data;
};

// Fetch ticket by ID
export const fetchTicketById = async (id: number): Promise<Ticket> => {
    const { data } = await api.get<Ticket>(`${"/tickets"}/${id}`);
    return data;
};

// Create ticket
export const createTicket = async (ticket: NewTicketInput): Promise<Ticket> => {
    const { data } = await api.post<Ticket>("/tickets", ticket);
    toast.success("Ticket created");
    return data;
};

export type TicketUpdateInput = {
    Status?: TicketStatus;
    Priority?: TicketPriority | null;
    Category?: TicketCategory | null;
    Technician_ID?: number | null;
    Archived?: boolean;
    Report_Problem?: string;
    Location?: string | null;
    Item_ID?: number | null;
    Room_ID?: number | null;
};

const cleanTicketPayload = <T extends Record<string, unknown>>(data: T): Partial<T> => {
    return Object.fromEntries(
        Object.entries(data).filter(([, value]) => value !== undefined)
    ) as Partial<T>;
};

// Update ticket
export const updateTicket = async (ticketId: number, data: TicketUpdateInput): Promise<Ticket> => {
    const { data: updated } = await api.put<Ticket>(`${"/tickets"}/${ticketId}`, cleanTicketPayload(data));
    toast.success("Ticket updated");
    return updated;
};

// Archive ticket
export const archiveTicket = async (ticketId: number): Promise<Ticket> => {
    return updateTicket(ticketId, { Archived: true });
};

// Restore (Unarchive) ticket
export const restoreTicket = async (ticketId: number): Promise<Ticket> => {
    return updateTicket(ticketId, { Archived: false });
};

// Assign or reassign ticket to a technician
export const assignTicket = async (ticketId: number, technicianId: number): Promise<Ticket> => {
    return updateTicket(ticketId, { Technician_ID: technicianId, Status: 'IN_PROGRESS' });
};

// Delete ticket
export const deleteTicket = async (id: number): Promise<void> => {
    await api.delete(`${"/tickets"}/${id}`);
    toast.success("Ticket deleted");
};
