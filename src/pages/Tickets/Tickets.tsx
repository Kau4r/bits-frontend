import { useEffect, useMemo, useState } from "react"
import { Eye } from 'lucide-react';
import Table from "@/components/Table"
import TableSearchInput from "@/components/Search"
import TicketingModal from "@/components/Ticketing/TicketingModal"
import { fetchTickets, archiveTicket, restoreTicket } from "@/services/tickets";
import type { Ticket } from "@/types/tickets";

export default function Tickets() {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('All');
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showArchived, setShowArchived] = useState(false);
    const [tickets, setTickets] = useState<Ticket[]>([]); // ✅ initialize as []

    const [loading, setLoading] = useState(true); // ✅ loading state

    useEffect(() => {
        const loadTickets = async () => {
            try {
                const data = await fetchTickets();
                setTickets(data);
            } catch (err) {
                console.error("Error loading tickets", err);
            } finally {
                setLoading(false); // ✅ stop loading
            }
        };
        loadTickets();
    }, []);

    const displayedTickets = useMemo(() => {
        return showArchived
            ? tickets.filter(ticket => ticket.Archived)
            : tickets.filter(ticket => !ticket.Archived);
    }, [tickets, showArchived]);

    const filteredTickets = useMemo(() => {
        return displayedTickets.filter(ticket => {
            const matchesSearch = Object.values(ticket).some(value =>
                value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
            );
            const matchesStatus =
                selectedStatus === 'All' || ticket.Status === selectedStatus;
            return matchesSearch && matchesStatus;
        });
    }, [displayedTickets, searchTerm, selectedStatus]);

    const statuses: string[] = ["All", "PENDING", "IN_PROGRESS", "RESOLVED"];

    const handleViewTicket = (ticket: Ticket) => {
        setSelectedTicket(ticket)
        setIsModalOpen(true)
    }

    const handleUpdateTicket = (updatedTicket: Ticket) => {
        setTickets(prevTickets => {
            // Check if this is an existing ticket
            const existingTicket = prevTickets.find(t => t.Ticket_ID === updatedTicket.Ticket_ID);

            if (existingTicket) {
                return prevTickets.map(t =>
                    t.Ticket_ID === updatedTicket.Ticket_ID
                        ? { ...updatedTicket, Archived: t.Archived }
                        : t
                );
            } else {
                return [...prevTickets, { ...updatedTicket, Archived: false }];
            }
        });
    }

    const handleArchiveTicket = async (ticketId: number) => {
        try {
            await archiveTicket(ticketId);
            setTickets(tickets.map(ticket =>
                ticket.Ticket_ID === ticketId
                    ? { ...ticket, Archived: true }
                    : ticket
            ));
        } catch (error) {
            console.error("Failed to archive ticket", error);
        }
    };

    const handleRestoreTicket = async (ticketId: number) => {
        try {
            await restoreTicket(ticketId);
            setTickets(tickets.map(ticket =>
                ticket.Ticket_ID === ticketId
                    ? { ...ticket, Archived: false }
                    : ticket
            ));
        } catch (error) {
            console.error("Failed to restore ticket", error);
        }
    };

    return (
        <div className="p-4 space-y-4">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Tickets</h1>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 items-center">
                <TableSearchInput
                    searchTerm={searchTerm}
                    onChange={setSearchTerm}
                    placeholder="Search tickets..."
                    showLabel={false}
                />
                <div className="w-full sm:w-48">
                    <select
                        id="status"
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    >
                        {statuses.map(status => (
                            <option key={status} value={status}>{status}</option>
                        ))}
                    </select>
                </div>

                {/* Toggle Switch */}
                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                    <button
                        onClick={() => setShowArchived(false)}
                        className={`flex-1 px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${!showArchived
                            ? 'bg-white text-gray-900 shadow dark:bg-gray-700 dark:text-white'
                            : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                            }`}
                    >
                        Active
                    </button>
                    <button
                        onClick={() => setShowArchived(true)}
                        className={`flex-1 px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${showArchived
                            ? 'bg-white text-gray-900 shadow dark:bg-gray-700 dark:text-white'
                            : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                            }`}
                    >
                        Archived
                    </button>
                </div>

                <button
                    onClick={() => {
                        setSelectedTicket(null)
                        setIsModalOpen(true)
                    }}
                    className="w-full sm:w-auto rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-indigo-700 dark:hover:bg-indigo-600"
                >
                    Report Issue
                </button>
            </div>
            <div className="mt-4">
                <Table headers={['Reported By', 'Location', 'Category', 'Status', 'Actions']}>
                    {loading ? (
                        <div className="col-span-full text-center py-4 text-gray-500 dark:text-gray-400">
                            Loading tickets...
                        </div>
                    ) : filteredTickets.length === 0 ? (
                        <div className="col-span-full text-center py-4 text-gray-500 dark:text-gray-400">
                            {showArchived ? 'No archived tickets found' : 'No active tickets found'}
                        </div>
                    ) : (
                        filteredTickets.map(ticket => (
                            <div
                                key={ticket.Ticket_ID}
                                className="px-6 py-4 items-center text-center hover:bg-gray-50 dark:hover:bg-gray-800"
                                style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '1rem' }}
                            >
                                <div className="text-left">
                                    <p className="font-medium">{ticket.Reported_By.First_Name}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {ticket.Reported_By.User_Role} • {new Date(ticket.Created_At).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="text-sm">{ticket.Location || ticket.Room?.Name || '-'}</div>
                                <div className="text-sm">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                        {ticket.Category || 'Uncategorized'}
                                    </span>
                                </div>
                                <div>
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${ticket.Status === 'PENDING'
                                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                        : ticket.Status === 'IN_PROGRESS'
                                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                            : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                        }`}>
                                        {ticket.Status}
                                    </span>
                                    {ticket.Technician?.User_ID && (
                                        <p className="text-xs text-gray-500 mt-1">Tech: {ticket.Technician.First_Name}</p>
                                    )}
                                </div>
                                <div className="flex items-center justify-center gap-2">
                                    <button
                                        onClick={() => handleViewTicket(ticket)}
                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-full transition-colors dark:text-blue-400 dark:hover:bg-blue-900/30"
                                        title="View Details"
                                    >
                                        <Eye className="w-5 h-5" />
                                    </button>
                                    {showArchived ? (
                                        <button
                                            onClick={() => handleRestoreTicket(ticket.Ticket_ID)}
                                            className="px-3 py-1 text-sm text-white bg-green-500 rounded hover:bg-green-600"
                                        >
                                            Restore
                                        </button>
                                    ) : ticket.Status === 'RESOLVED' ? (
                                        <button
                                            onClick={() => handleArchiveTicket(ticket.Ticket_ID)}
                                            className="px-3 py-1 text-sm text-white bg-gray-500 rounded hover:bg-gray-600"
                                        >
                                            Archive
                                        </button>
                                    ) : null}
                                </div>
                            </div>
                        ))
                    )}
                </Table>
            </div>

            {isModalOpen && (
                <TicketingModal
                    isOpen={isModalOpen}
                    onClose={() => {
                        setIsModalOpen(false)
                        setSelectedTicket(null)
                    }}
                    ticket={selectedTicket}
                    onUpdate={handleUpdateTicket}
                    isCreating={selectedTicket === null}
                />
            )}
        </div>
    )
}