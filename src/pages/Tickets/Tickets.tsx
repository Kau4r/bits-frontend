import { useMemo, useState } from "react"
import Table from "@/components/Table"
import TableSearchInput from "@/components/Search"
import TicketingModal from "@/components/Ticketing/TicketingModal"

export interface Ticket {
  id: number;
  reportedBy: string;
  role: string;
  dateReported: string;
  location: string;
  type: string;
  status: 'Pending' | 'In Progress' | 'Resolved';
  details: string;
  assetCode: string;
  technician?: string;
  isArchived?: boolean;
}

const mockTickets: Ticket[] = [
    {
        id: 1,
        reportedBy: "Juan Dela Cruz",
        role: "Student",
        dateReported: new Date().toISOString(),
        location: "LB 447",
        type: "Computer",
        status: "Pending",
        details: "There is no VALORANT!",
        assetCode: "PC-001",
        isArchived: false
    },
    {
        id: 2,
        reportedBy: "KENBIOT",
        role: "Faculty",
        dateReported: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        location: "LB 467",
        type: "Keyboard",
        status: "Resolved",
        details: "Missing key Caps",
        assetCode: "KB-045",
        technician: "John Tech",
        isArchived: false
    },
    {
        id: 3,
        reportedBy: "Master of Puppets",
        role: "Student",
        dateReported: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        location: "LB 467",
        type: "Monitor",
        status: "In Progress",
        details: "BLinking SIR!",
        assetCode: "MON-112",
        technician: "Sarah Engineer",
        isArchived: false
    },
]

export default function Tickets() {
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedStatus, setSelectedStatus] = useState('All')
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [tickets, setTickets] = useState<Ticket[]>(mockTickets)
    const [showArchived, setShowArchived] = useState(false);

    const displayedTickets = useMemo(() => {
        return showArchived 
            ? tickets.filter(ticket => ticket.isArchived)
            : tickets.filter(ticket => !ticket.isArchived);
    }, [tickets, showArchived]);

    const filteredTickets = useMemo(() => {
        return displayedTickets.filter(ticket => {
            const matchesSearch = Object.values(ticket).some(
                value => value.toString().toLowerCase().includes(searchTerm.toLowerCase())
            );
            const matchesStatus = selectedStatus === 'All' || ticket.status === selectedStatus;
            return matchesSearch && matchesStatus;
        });
    }, [displayedTickets, searchTerm, selectedStatus]);

    const statuses = ['All', 'Pending', 'In Progress', 'Resolved']

    const handleViewTicket = (ticket: Ticket) => {
        setSelectedTicket(ticket)
        setIsModalOpen(true)
    }

    const handleUpdateTicket = (updatedTicket: Ticket) => {
        setTickets(prevTickets => {
            // Check if this is an existing ticket
            const existingTicket = prevTickets.find(t => t.id === updatedTicket.id);
            
            if (existingTicket) {
                // Update existing ticket, preserve isArchived status
                return prevTickets.map(t => 
                    t.id === updatedTicket.id 
                        ? { ...updatedTicket, isArchived: t.isArchived }
                        : t
                );
            } else {
                // Add new ticket with isArchived: false
                return [...prevTickets, { ...updatedTicket, isArchived: false }];
            }
        });
    }

    const handleArchiveTicket = (ticketId: number) => {
        setTickets(tickets.map(ticket => 
            ticket.id === ticketId 
                ? { ...ticket, isArchived: true } 
                : ticket
        ));
    };

    const handleRestoreTicket = (ticketId: number) => {
        setTickets(tickets.map(ticket => 
            ticket.id === ticketId 
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
                        className={`h-full px-4 flex items-center justify-center ${
                            !showArchived 
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
                        className={`h-full px-4 flex items-center justify-center ${
                            showArchived 
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
                <Table
                    headers={['Reported By', 'Location', 'Type', 'Status', 'Actions']}
                >
                    {filteredTickets.length === 0 ? (
                        <div className="col-span-full text-center py-4 text-gray-500 dark:text-gray-400">
                            {showArchived ? 'No archived tickets found' : 'No active tickets found'}
                        </div>
                    ) : (
                        filteredTickets.map((ticket) => (
                            <div 
                                key={ticket.id} 
                                className="grid grid-cols-5 gap-4 px-6 py-4 items-center hover:bg-gray-50 dark:hover:bg-gray-800"
                            >
                                <div>
                                    <p className="font-medium">{ticket.reportedBy}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{ticket.role}</p>
                                </div>
                                <div>{ticket.location}</div>
                                <div>{ticket.type}</div>
                                <div>
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                        ticket.status === 'Pending' 
                                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' 
                                            : ticket.status === 'In Progress' 
                                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                                : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                    }`}>
                                        {ticket.status}
                                    </span>
                                    {ticket.technician && (
                                        <p className="text-xs text-gray-500 mt-1">Tech: {ticket.technician}</p>
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
                                            onClick={() => handleRestoreTicket(ticket.id)}
                                            className="px-3 py-1 text-sm text-white bg-green-500 rounded hover:bg-green-600"
                                        >
                                            Restore
                                        </button>
                                    ) : ticket.status === 'Resolved' ? (
                                        <button
                                            onClick={() => handleArchiveTicket(ticket.id)}
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