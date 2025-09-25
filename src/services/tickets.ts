import api from "@/services/api"; // Axios instance
import type { Ticket, TicketCategory, TicketPriority, TicketStatus, NewTicketInput } from "@/types/tickets";

const TICKETS_URL = "/tickets";

// Fetch all tickets, optionally filtered by status
export const fetchTickets = async (status?: string): Promise<Ticket[]> => {
    const { data } = await api.get<Ticket[]>(TICKETS_URL, { params: { status } });
    return data;
};

// Fetch single ticket by ID
export const fetchTicketById = async (id: number): Promise<Ticket> => {
    const { data } = await api.get<Ticket>(`${TICKETS_URL}/${id}`);
    return data;
};

// Create a new ticket
export const createTicket = async (ticket: NewTicketInput): Promise<Ticket> => {
    const { data } = await api.post<Ticket>(TICKETS_URL, ticket);
    return data;
};

// Update ticket (status, priority, category)
export const updateTicket = async (
    ticketId: number,
    data: { Status: TicketStatus; Priority?: TicketPriority; Category?: TicketCategory }
): Promise<Ticket> => {
    const { data: updated } = await api.put<Ticket>(`${TICKETS_URL}/${ticketId}`, data);
    return updated;
};

// Archive ticket
export const archiveTicket = async (ticketId: number): Promise<Ticket> => {
    const res = await api.put<Ticket>(`${TICKETS_URL}/${ticketId}`, { Archived: true });
    return res.data;
};

// Delete ticket
export const deleteTicket = async (id: number): Promise<void> => {
    await api.delete(`${TICKETS_URL}/${id}`);
};