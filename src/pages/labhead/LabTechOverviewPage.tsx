import LabTechList, { type Tech } from '@/pages/labhead/components/LabTechList';
import LabTechDetailPanel from '@/pages/labhead/components/LabTechDetailPanel';
import AssignTicketDropdown from '@/pages/labhead/components/AssignTicketDropdown';
import { useState, useEffect, useCallback } from 'react';
import { fetchTickets } from '@/services/tickets';
import type { Ticket } from '@/types/tickets';
import TicketingModal from '@/pages/tickets/components/TicketingModal';

export default function LabTechOverview() {
  const [selectedTech, setSelectedTech] = useState<Tech | null>(null);
  const [unassignedTickets, setUnassignedTickets] = useState<Ticket[]>([]);
  const [isLoadingUnassigned, setIsLoadingUnassigned] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Load unassigned tickets
  const loadUnassigned = useCallback(async () => {
    try {
      setIsLoadingUnassigned(true);
      const tickets = await fetchTickets({ unassigned: true });
      setUnassignedTickets(tickets.filter(t => !t.Archived));
    } catch (error) {
      console.error('Failed to fetch unassigned tickets:', error);
    } finally {
      setIsLoadingUnassigned(false);
    }
  }, []);

  useEffect(() => {
    loadUnassigned();
  }, [loadUnassigned]);

  // When a ticket gets assigned or reassigned, refresh lists
  const handleTicketChange = () => {
    loadUnassigned();
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="h-full w-full bg-white p-6 sm:px-8 lg:px-10 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Lab Technicians</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage and view lab technician details and assignments</p>
        </div>
        <button
          onClick={() => setIsReportModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Report Issue
        </button>
      </div>

      <div className="flex flex-1 gap-6 min-h-0">
        <LabTechList selectedTech={selectedTech} onSelect={setSelectedTech} />
        <div className="flex-1 min-w-0 flex flex-col gap-6 overflow-auto">
          {selectedTech ? (
            <LabTechDetailPanel
              key={refreshKey}
              labTech={selectedTech}
              onTicketReassigned={handleTicketChange}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400">
              Select a lab technician to view details
            </div>
          )}

          {/* Unassigned Tickets Panel */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                  <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Unassigned Tickets</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {unassignedTickets.length} ticket{unassignedTickets.length !== 1 ? 's' : ''} awaiting assignment
                  </p>
                </div>
              </div>
              <button
                onClick={loadUnassigned}
                className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                title="Refresh"
              >
                <svg className={`w-4 h-4 ${isLoadingUnassigned ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>

            {isLoadingUnassigned ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 dark:border-indigo-400" />
              </div>
            ) : unassignedTickets.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <svg className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm">All tickets are assigned</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800/50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Priority</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Issue</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reported By</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Assign</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {unassignedTickets.map((ticket) => (
                      <tr key={ticket.Ticket_ID} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="px-6 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ticket.Priority === 'HIGH' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                            ticket.Priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                              'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                            }`}>
                            {ticket.Priority || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm font-medium text-gray-900 dark:text-white">
                          <div className="max-w-xs truncate" title={ticket.Report_Problem}>{ticket.Report_Problem}</div>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {ticket.Reported_By ? `${ticket.Reported_By.First_Name} ${ticket.Reported_By.Last_Name}` : '—'}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {new Date(ticket.Created_At).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-right">
                          <AssignTicketDropdown
                            ticketId={ticket.Ticket_ID}
                            currentTechnicianId={null}
                            onAssigned={() => {
                              // Remove from unassigned list
                              setUnassignedTickets(prev => prev.filter(t => t.Ticket_ID !== ticket.Ticket_ID));
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <TicketingModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        ticket={null}
        onUpdate={handleTicketChange}
        isCreating={true}
      />
    </div>
  );
}
