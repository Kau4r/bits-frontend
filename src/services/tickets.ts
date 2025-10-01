import api from "./api";
import type { Ticket, NewTicketInput, TicketStatus, TicketPriority, TicketCategory } from "@/types/tickets";

// Fetch all tickets
export const fetchTickets = async (status?: TicketStatus): Promise<Ticket[]> => {
    const { data } = await api.get<Ticket[]>("/tickets", { params: { status } });
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
export const updateTicket = async (ticketId: number, data: { Status: TicketStatus; Priority?: TicketPriority; Category?: TicketCategory }): Promise<Ticket> => {
    const { data: updated } = await api.put<Ticket>(`${"/tickets"}/${ticketId}`, data);
    return updated;
};

// Archive ticket
export const archiveTicket = async (ticketId: number): Promise<Ticket> => {
    const { data } = await api.put<Ticket>(`${"/tickets"}/${ticketId}`, { Archived: true });
    return data;
};

// Delete ticket
export const deleteTicket = async (id: number): Promise<void> => {
    await api.delete(`${"/tickets"}/${id}`);
};
