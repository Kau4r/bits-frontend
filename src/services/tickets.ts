import api from "./api";
import type { Ticket, NewTicketInput, TicketStatus, TicketPriority, TicketCategory } from "@/types/tickets";

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
    return data;
};

// Update ticket
export const updateTicket = async (ticketId: number, data: { Status?: TicketStatus; Priority?: TicketPriority; Category?: TicketCategory; Technician_ID?: number | null; Archived?: boolean }): Promise<Ticket> => {
    const { data: updated } = await api.put<Ticket>(`${"/tickets"}/${ticketId}`, data);
    return updated;
};

// Archive ticket
export const archiveTicket = async (ticketId: number): Promise<Ticket> => {
    const { data } = await api.put<Ticket>(`${"/tickets"}/${ticketId}`, { Archived: true });
    return data;
};

// Restore (Unarchive) ticket
export const restoreTicket = async (ticketId: number): Promise<Ticket> => {
    const { data } = await api.put<Ticket>(`${"/tickets"}/${ticketId}`, { Archived: false });
    return data;
};

// Assign or reassign ticket to a technician
export const assignTicket = async (ticketId: number, technicianId: number): Promise<Ticket> => {
    return updateTicket(ticketId, { Technician_ID: technicianId });
};

// Delete ticket
export const deleteTicket = async (id: number): Promise<void> => {
    await api.delete(`${"/tickets"}/${id}`);
};
