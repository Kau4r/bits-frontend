import { useEffect, useMemo, useState } from "react"
import Table from "@/components/Table"
import TableSearchInput from "@/components/Search"
import TicketingModal from "@/components/Ticketing/TicketingModal"
import { fetchTickets } from "@/services/tickets";
import type { Ticket, TicketStatus } from "@/types/tickets";

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

    const statuses: TicketStatus[] = ["PENDING", "IN_PROGRESS", "RESOLVED"];

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

    const handleArchiveTicket = (ticketId: number) => {
        setTickets(tickets.map(ticket =>
            ticket.Ticket_ID === ticketId
                ? { ...ticket, isArchived: true }
                : ticket
        ));
    };

    const handleRestoreTicket = (ticketId: number) => {
        setTickets(tickets.map(ticket =>
            ticket.Ticket_ID === ticketId
                ? { ...ticket, isArchived: false }
                : ticket
        ));
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
                <div className="flex items-center h-10 bg-slate-100 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
                    <button
                        onClick={() => setShowArchived(false)}
                        className={`h-full px-4 flex items-center justify-center ${!showArchived
                            ? 'bg-slate-700 text-white rounded-r-lg'
                            : 'text-slate-600 hover:bg-gray-50 dark:text-gray-900'
                            }`}
                    >
                        <span className="text-sm font-medium">
                            Active
                        </span>
                    </button>
                    <button
                        onClick={() => setShowArchived(true)}
                        className={`h-full px-4 flex items-center justify-center ${showArchived
                            ? 'bg-slate-700 text-white rounded-l-lg'
                            : 'text-slate-600 hover:bg-gray-50 dark:text-gray-900'
                            }`}
                    >
                        <span className="text-sm font-medium">
                            Archived
                        </span>
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
                <Table headers={['Reported By', 'Location', 'Type', 'Status', 'Actions']}>
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
                                className="grid grid-cols-5 gap-4 px-6 py-4 items-center hover:bg-gray-50 dark:hover:bg-gray-800"
                            >
                                <div>
                                    <p className="font-medium">{ticket.Reported_By.First_Name}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{ticket.Reported_By.User_Role}</p>
                                </div>
                                <div>{ticket.Created_At}</div>
                                <div>{ticket.Report_Problem}</div>
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
                                <div className="space-x-2">
                                    <button
                                        onClick={() => handleViewTicket(ticket)}
                                        className="px-3 py-1 text-sm text-white bg-blue-500 rounded hover:bg-blue-600"
                                    >
                                        View
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