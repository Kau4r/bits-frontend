import { useState } from "react"
import Table from "@/components/Table"
import TableSearchInput from "@/components/Search"
import TicketingModal from "@/components/Ticketing/TicketingModal"

// Define the Ticket interface
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
}

// Mock data with additional fields for the modal
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
        assetCode: "PC-001"
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
        technician: "John Tech"
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
        technician: "Sarah Engineer"
    },
]

export default function Tickets() {
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedStatus, setSelectedStatus] = useState('All')
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [tickets, setTickets] = useState<Ticket[]>(mockTickets)

    const filteredTickets = tickets.filter(ticket => {
        const matchesSearch = Object.values(ticket).some(
            value => value.toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
        const matchesStatus = selectedStatus === 'All' || ticket.status === selectedStatus
        return matchesSearch && matchesStatus
    })

    const statuses = ['All', 'Pending', 'In Progress', 'Resolved']

    const handleViewTicket = (ticket: Ticket) => {
        setSelectedTicket(ticket)
        setIsModalOpen(true)
    }

    const handleUpdateTicket = (updatedTicket: Ticket) => {
        setTickets(tickets.map(t => 
            t.id === updatedTicket.id ? updatedTicket : t
        ))
    }

    return (
        <div className="p-4 space-y-4">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Tickets</h1>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
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
            </div>

            <div className="mt-4">
                <Table
                    headers={['Reported By', 'Location', 'Type', 'Status', 'Actions']}
                >
                    {filteredTickets.length > 0 ? (
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
                                <div>
                                    <button
                                        onClick={() => handleViewTicket(ticket)}
                                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                                    >
                                        View
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full text-center py-4 text-gray-500 dark:text-gray-400">
                            No tickets found
                        </div>
                    )}
                </Table>
            </div>

            {selectedTicket && (
                <TicketingModal
                    isOpen={isModalOpen}
                    onClose={() => {
                        setIsModalOpen(false)
                        setSelectedTicket(null)
                    }}
                    ticket={selectedTicket}
                    onUpdate={handleUpdateTicket}
                />
            )}
        </div>
    )
}