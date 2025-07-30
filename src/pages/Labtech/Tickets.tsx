import React, { useState } from 'react';
import Table from '../../components/Table';

interface Ticket {
    id: number;
    title: string;
    status: 'New' | 'In Progress' | 'Resolved' | 'Closed';
    priority: 'Low' | 'Medium' | 'High' | 'Urgent';
    assignedTo: string;
    createdAt: string;
    description: string;
    workLog?: string;
}

const mockTickets: Ticket[] = [
    {
        id: 1,
        title: 'Server Down - Production Environment',
        status: 'In Progress',
        priority: 'Urgent',
        assignedTo: 'John Doe',
        createdAt: '2025-07-28',
        description: 'Production server has gone down. Customers are unable to access the application.',
        workLog: ''
    },
    {
        id: 2,
        title: 'Database Performance Issues',
        status: 'New',
        priority: 'High',
        assignedTo: 'Jane Smith',
        createdAt: '2025-07-27',
        description: 'Slow query performance affecting user experience.',
        workLog: ''
    },
    {
        id: 3,
        title: 'UI Bug - Login Page',
        status: 'Resolved',
        priority: 'Medium',
        assignedTo: 'Mike Johnson',
        createdAt: '2025-07-26',
        description: 'Login page shows incorrect error message.',
        workLog: ''
    },
];

const getStatusColor = (status: Ticket['status']): string => {
    const colors = {
        New: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        'In Progress': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        Resolved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        Closed: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
};

const getPriorityColor = (priority: Ticket['priority']): string => {
    const colors = {
        Low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        Medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        High: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
        Urgent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    return colors[priority] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
};

const headers = ['ID', 'Title', 'Status', 'Priority', 'Assigned To', 'Created At'];

const TicketTable: React.FC = () => {
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [status, setStatus] = useState<Ticket['status']>('In Progress');
    const [workLog, setWorkLog] = useState('');
    const [attachment, setAttachment] = useState<File | null>(null);
    const [tickets, setTickets] = useState<Ticket[]>(mockTickets);

    const handleRowClick = (ticket: Ticket) => {
        setSelectedTicket(ticket);
        setStatus(ticket.status);
        setWorkLog(ticket.workLog || '');
        setAttachment(null);
    };

    const handleClose = () => setSelectedTicket(null);

    const handleSave = () => {
        if (!selectedTicket) return;

        const updatedTickets = tickets.map((ticket: Ticket) =>
            ticket.id === selectedTicket.id
                ? { ...ticket, status, workLog } // add workLog to the updated ticket
                : ticket
        );

        setTickets(updatedTickets);
        setSelectedTicket(null);
    };

    return (
        <div className="p-4 pr-10">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">Tickets</h1>
                <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-500 dark:hover:bg-blue-600">
                    Create New Ticket
                </button>
            </div>

            <Table headers={headers}>
                {tickets.map((ticket) => (
                    <div
                        key={ticket.id}
                        className="grid grid-cols-6 px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                        onClick={() => handleRowClick(ticket)}
                    >
                        <div className="text-sm text-gray-900 dark:text-gray-100">{ticket.id}</div>
                        <div className="text-sm text-gray-900 dark:text-gray-100">{ticket.title}</div>
                        <div className="text-sm">
                            <span className={`font-medium rounded-full px-2 py-1 ${getStatusColor(ticket.status)}`}>
                                {ticket.status}
                            </span>
                        </div>
                        <div className="text-sm">
                            <span className={`font-medium rounded-full px-2 py-1 ${getPriorityColor(ticket.priority)}`}>
                                {ticket.priority}
                            </span>
                        </div>
                        <div className="text-sm text-gray-900 dark:text-gray-100">{ticket.assignedTo}</div>
                        <div className="text-sm text-gray-900 dark:text-gray-100">{ticket.createdAt}</div>
                    </div>
                ))}
            </Table>

            {selectedTicket && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                                Ticket #{selectedTicket?.id}
                            </h2>
                            <button
                                onClick={handleClose}
                                className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
                            >
                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-gray-100">Ticket Details</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                                            Title
                                        </label>
                                        <input
                                            type="text"
                                            value={selectedTicket?.title || ''}
                                            disabled
                                            className="w-full rounded border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                                            Priority
                                        </label>
                                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getPriorityColor(selectedTicket?.priority || 'Low')}`}>
                                            {selectedTicket?.priority || 'Low'}
                                        </span>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                                            Created At
                                        </label>
                                        <input
                                            type="text"
                                            value={selectedTicket?.createdAt || ''}
                                            disabled
                                            className="w-full rounded border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                                            Assigned To
                                        </label>
                                        <input
                                            type="text"
                                            value={selectedTicket?.assignedTo || ''}
                                            disabled
                                            className="w-full rounded border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                                            Description
                                        </label>
                                        <textarea
                                            value={selectedTicket?.description || ''}
                                            disabled
                                            className="w-full rounded border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white h-24"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-gray-100">Update Ticket</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                                            Status
                                        </label>
                                        <select
                                            value={status}
                                            onChange={(e) => setStatus(e.target.value as Ticket['status'])}
                                            className="w-full rounded border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                        >
                                            <option value="New">New</option>
                                            <option value="In Progress">In Progress</option>
                                            <option value="Resolved">Resolved</option>
                                            <option value="Closed">Closed</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                                            Work Log
                                        </label>
                                        <textarea
                                            value={workLog}
                                            onChange={(e) => setWorkLog(e.target.value)}
                                            className="w-full rounded border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white h-24"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                                            Attachment
                                        </label>
                                        <input
                                            type="file"
                                            onChange={(e) => {
                                                if (e.target.files && e.target.files[0]) {
                                                    setAttachment(e.target.files[0]);
                                                }
                                            }}
                                            className="w-full rounded border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end mt-6">
                            <button
                                onClick={handleClose}
                                className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 dark:focus:ring-gray-400 mr-2"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-500 dark:hover:bg-blue-600"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TicketTable;
