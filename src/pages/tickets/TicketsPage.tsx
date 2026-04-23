import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Table from "@/components/Table"
import Search from "@/components/Search"
import TicketingModal from "@/pages/tickets/components/TicketingModal"
import { fetchTickets, archiveTicket, restoreTicket } from "@/services/tickets";
import { formatTicketLocationDisplay } from "@/lib/ticketLocation";
import type { Ticket } from "@/types/tickets";
import { useNotifications } from "@/context/NotificationContext";
import { Plus, Eye, Inbox, Archive } from "lucide-react";
import { FloatingSelect } from "@/ui/FloatingSelect";

const isActiveTicket = (ticket: Ticket) => !ticket.Archived && ticket.Status !== 'RESOLVED';

const formatTicketDateTime = (value?: string | null) => {
    if (!value) return '-';

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '-';

    return parsed.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
};

const getTicketTitle = (ticket: Ticket) => {
    const firstLine = ticket.Report_Problem.split(/\r?\n/).find(line => line.trim());
    return firstLine?.trim() || 'Untitled ticket';
};

const getTicketDescription = (ticket: Ticket) => {
    const description = ticket.Report_Problem.trim();
    return description || 'No description provided';
};

const getTicketResolvedAt = (ticket: Ticket) => {
    const resolvedLog = ticket.AuditLogs
        ?.filter(log => log.Action === 'TICKET_RESOLVED')
        .sort((a, b) => new Date(b.Timestamp).getTime() - new Date(a.Timestamp).getTime())[0];

    return resolvedLog?.Timestamp || (ticket.Status === 'RESOLVED' ? ticket.Updated_At : null);
};

export default function Tickets() {
    const { notifications } = useNotifications();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('All');
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showArchived, setShowArchived] = useState(false);
    const [tickets, setTickets] = useState<Ticket[]>([]);

    const [loading, setLoading] = useState(true);
    const lastTicketNotificationRef = useRef<string | null>(null);

    const loadTickets = useCallback(async (showSkeleton = false) => {
        if (showSkeleton) {
            setLoading(true);
        }

        try {
            const data = await fetchTickets();
            setTickets(data);
        } catch (err) {
            console.error("Error loading tickets", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadTickets(true);
    }, [loadTickets]);

    const latestTicketNotificationKey = useMemo(() => {
        const ticketNotification = notifications.find(notification => {
            const detailsEvent = notification.details?.eventType;
            const searchable = `${notification.title} ${notification.message} ${String(detailsEvent ?? '')}`.toUpperCase();
            return searchable.includes('TICKET');
        });

        return ticketNotification
            ? `${ticketNotification.id}-${ticketNotification.timestamp}-${ticketNotification.title}`
            : null;
    }, [notifications]);

    useEffect(() => {
        if (!latestTicketNotificationKey) return;

        if (lastTicketNotificationRef.current === null) {
            lastTicketNotificationRef.current = latestTicketNotificationKey;
            return;
        }

        if (lastTicketNotificationRef.current === latestTicketNotificationKey) return;

        lastTicketNotificationRef.current = latestTicketNotificationKey;
        loadTickets(false);
    }, [latestTicketNotificationKey, loadTickets]);

    const displayedTickets = useMemo(() => {
        const isBrowsingResolved = !showArchived && selectedStatus === 'RESOLVED';
        return showArchived
            ? tickets.filter(ticket => ticket.Archived)
            : tickets.filter(ticket => isBrowsingResolved ? !ticket.Archived && ticket.Status === 'RESOLVED' : isActiveTicket(ticket));
    }, [tickets, showArchived, selectedStatus]);

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
    const listLabel = showArchived ? 'archived' : selectedStatus === 'RESOLVED' ? 'resolved' : 'active';

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
                        ? updatedTicket
                        : t
                );
            } else {
                return [...prevTickets, { ...updatedTicket, Archived: false }];
            }
        });
    }

    const handleArchiveTicket = async (ticketId: number) => {
        try {
            const archivedTicket = await archiveTicket(ticketId);
            setTickets(tickets.map(ticket =>
                ticket.Ticket_ID === ticketId
                    ? archivedTicket
                    : ticket
            ));
        } catch (error) {
            console.error("Failed to archive ticket", error);
        }
    };

    const handleRestoreTicket = async (ticketId: number) => {
        try {
            const restoredTicket = await restoreTicket(ticketId);
            setTickets(tickets.map(ticket =>
                ticket.Ticket_ID === ticketId
                    ? restoredTicket
                    : ticket
            ));
        } catch (error) {
            console.error("Failed to restore ticket", error);
        }
    };

    const clearFilters = () => {
        setSearchTerm('');
        setSelectedStatus('All');
    };

    const hasActiveFilters = searchTerm || selectedStatus !== 'All';

    const tableHeaders = useMemo(() => {
        const headers: Array<{ label: string; key?: string; align?: 'left' | 'center' | 'right' }> = [
            { label: 'Reported By', key: 'reported_by' },
            { label: 'Title', key: 'title' },
            { label: 'Location', key: 'location' },
            { label: 'Category', key: 'category' },
            { label: 'Status', key: 'status' },
        ];

        if (showArchived) {
            headers.push({ label: 'Resolved Time', key: 'resolved_time' });
        }

        return [...headers, { label: 'Actions', align: 'center' as const }];
    }, [showArchived]);

    const ticketColumnWidths = showArchived
        ? '1.4fr 2.2fr 1.4fr 1fr 1.2fr 1.4fr 1fr'
        : '1.5fr 2.3fr 1.4fr 1fr 1.2fr 1fr';

    if (loading) {
        return (
            <div className="h-full w-full bg-white p-6 sm:px-8 lg:px-10 dark:bg-gray-900">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <div className="h-8 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
                        <div className="mt-1 h-4 w-64 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
                    </div>
                </div>
                <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full w-full flex-col bg-white p-6 sm:px-8 lg:px-10 dark:bg-gray-900">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Issue Ticketing</h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Track and resolve technical issues and equipment reports</p>
                </div>

                <div className="flex items-center gap-4">
                    {/* Status Toggle */}
                    <div className="flex rounded-lg border border-gray-300 bg-white shadow-sm dark:border-gray-600 dark:bg-gray-800">
                        <button
                            onClick={() => setShowArchived(false)}
                            className={`inline-flex items-center gap-2 rounded-l-lg px-4 py-2 text-sm font-medium transition-colors ${!showArchived
                                ? 'bg-indigo-600 text-white'
                                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                                }`}
                        >
                            <Inbox className="h-4 w-4" />
                            Active
                        </button>
                        <button
                            onClick={() => setShowArchived(true)}
                            className={`inline-flex items-center gap-2 rounded-r-lg px-4 py-2 text-sm font-medium transition-colors ${showArchived
                                ? 'bg-indigo-600 text-white'
                                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                                }`}
                        >
                            <Archive className="h-4 w-4" />
                            Archived
                        </button>
                    </div>

                    <button
                        onClick={() => {
                            setSelectedTicket(null);
                            setIsModalOpen(true);
                        }}
                        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-500 hover:shadow-md focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none active:bg-indigo-700"
                    >
                        <Plus className="h-5 w-5" />
                        Report Issue
                    </button>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="mb-6 flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="min-w-[280px] flex-1">
                    <Search
                        searchTerm={searchTerm}
                        onChange={setSearchTerm}
                        showLabel={false}
                        placeholder="Search tickets..."
                    />
                </div>

                {/* Status Filter */}
                <div className="min-w-44">
                    <FloatingSelect
                        id="ticket-status-filter"
                        value={selectedStatus}
                        placeholder="Status"
                        options={statuses.map(status => ({
                            value: status,
                            label: status.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
                        }))}
                        onChange={setSelectedStatus}
                    />
                </div>

                {/* Results Count */}
                <div className="ml-auto flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-semibold text-gray-900 dark:text-white">{filteredTickets.length}</span>
                    <span>of {displayedTickets.length} {listLabel} tickets</span>
                </div>
            </div>

            <div className="flex-1 min-h-0">
                <Table headers={tableHeaders} columnWidths={ticketColumnWidths}>
                    {filteredTickets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center flex-1 w-full min-h-full" data-full-row>
                            <div className="p-4 bg-gray-100 dark:bg-gray-800/50 rounded-full mb-4">
                                {showArchived ? (
                                    <Archive className="h-12 w-12 text-gray-400" />
                                ) : (
                                    <Inbox className="h-12 w-12 text-gray-400" />
                                )}
                            </div>
                            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                                {hasActiveFilters ? "No tickets match your filters" : `No ${listLabel} tickets`}
                            </h3>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 text-center max-w-sm px-6">
                                {hasActiveFilters
                                    ? "Try adjusting your search or filter criteria"
                                    : showArchived
                                        ? "Archived reports are stored here for long-term tracking."
                                        : "You're all caught up! New issue reports from staff and students will appear here."}
                            </p>
                            {hasActiveFilters && (
                                <button
                                    onClick={clearFilters}
                                    className="mt-6 inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
                                >
                                    Clear Filters
                                </button>
                            )}
                        </div>
                    ) : (
                        filteredTickets.map(ticket => (
                            <div
                                key={ticket.Ticket_ID}
                                role="button"
                                tabIndex={0}
                                onClick={() => handleViewTicket(ticket)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        handleViewTicket(ticket);
                                    }
                                }}
                                className="group grid w-full cursor-pointer items-center px-6 py-4 text-left transition-all duration-150 hover:bg-indigo-50/50 focus:bg-indigo-50 focus:outline-none dark:hover:bg-indigo-900/10 dark:focus:bg-indigo-900/20"
                                style={{ gridTemplateColumns: ticketColumnWidths }}
                            >
                                <div>
                                    <p className="font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                                        {ticket.Reported_By.First_Name} {ticket.Reported_By.Last_Name}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {ticket.Reported_By.User_Role.replace('_', ' ')} • {new Date(ticket.Created_At).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="min-w-0 pr-3">
                                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                                        {getTicketTitle(ticket)}
                                    </p>
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-300">{formatTicketLocationDisplay(ticket.Location, ticket.Room?.Name || '-')}</div>
                                <div>
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                                        {ticket.Category || 'Uncategorized'}
                                    </span>
                                </div>
                                <div>
                                    <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full ${ticket.Status === 'PENDING'
                                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                        : ticket.Status === 'IN_PROGRESS'
                                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                            : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                        }`}>
                                        <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${ticket.Status === 'PENDING' ? 'bg-yellow-500' : ticket.Status === 'IN_PROGRESS' ? 'bg-blue-500' : 'bg-green-500'}`} />
                                        {ticket.Status.replace('_', ' ')}
                                    </span>
                                    {ticket.Technician?.User_ID && (
                                        <p className="text-[10px] text-gray-500 mt-1 dark:text-gray-400">Assignee: {ticket.Technician.First_Name}</p>
                                    )}
                                </div>
                                {showArchived && (
                                    <div className="text-sm text-gray-600 dark:text-gray-300">
                                        {formatTicketDateTime(getTicketResolvedAt(ticket))}
                                    </div>
                                )}
                                <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                                    <button
                                        onClick={() => handleViewTicket(ticket)}
                                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all dark:hover:bg-indigo-900/30 dark:hover:text-indigo-400"
                                        title="View Details"
                                    >
                                        <Eye className="w-5 h-5" />
                                    </button>
                                    {showArchived ? (
                                        <button
                                            onClick={() => handleRestoreTicket(ticket.Ticket_ID)}
                                            className="px-3 py-1 text-xs font-bold text-green-700 bg-green-100 rounded-full hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
                                        >
                                            Restore
                                        </button>
                                    ) : ticket.Status === 'RESOLVED' ? (
                                        <button
                                            onClick={() => handleArchiveTicket(ticket.Ticket_ID)}
                                            className="px-3 py-1 text-xs font-bold text-gray-700 bg-gray-100 rounded-full hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
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
