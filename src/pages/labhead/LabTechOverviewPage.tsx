import LabTechList, { type Tech } from '@/pages/labhead/components/LabTechList';
import LabTechDetailPanel from '@/pages/labhead/components/LabTechDetailPanel';
import AssignTicketDropdown from '@/pages/labhead/components/AssignTicketDropdown';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { fetchTickets } from '@/services/tickets';
import type { Ticket } from '@/types/tickets';
import TicketingModal from '@/pages/tickets/components/TicketingModal';
import Table from '@/components/Table';
import { LoadingSkeleton } from '@/ui';
import { useTicketEvents } from '@/hooks/useTicketEvents';
import { useUserEvents } from '@/hooks/useUserEvents';

const isActiveTicket = (ticket: Ticket) => !ticket.Archived && ticket.Status !== 'RESOLVED';

export default function LabTechOverview() {
  const [selectedTech, setSelectedTech] = useState<Tech | null>(null);
  const [unassignedTickets, setUnassignedTickets] = useState<Ticket[]>([]);
  const [isLoadingUnassigned, setIsLoadingUnassigned] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [viewingTicket, setViewingTicket] = useState<Ticket | null>(null);
  const [isUnassignedCollapsed, setIsUnassignedCollapsed] = useState(false);
  const [detailsPanelPercent, setDetailsPanelPercent] = useState(64);
  const splitContainerRef = useRef<HTMLDivElement>(null);

  const unassignedHeaders = useMemo(() => [
    { label: 'Priority', align: 'left' as const },
    { label: 'Description', align: 'left' as const },
    { label: 'Reported By', align: 'left' as const },
    { label: 'Date', align: 'left' as const },
    { label: 'Assign', align: 'right' as const },
  ], []);

  const loadUnassigned = useCallback(async () => {
    try {
      setIsLoadingUnassigned(true);
      const tickets = await fetchTickets({ unassigned: true });
      setUnassignedTickets(tickets.filter(isActiveTicket));
    } catch (error) {
      console.error('Failed to fetch unassigned tickets:', error);
    } finally {
      setIsLoadingUnassigned(false);
    }
  }, []);

  useEffect(() => {
    loadUnassigned();
  }, [loadUnassigned]);

  const handleTicketChange = () => {
    loadUnassigned();
    setRefreshKey(prev => prev + 1);
  };

  // Realtime: ticket events refresh unassigned + lab-tech counters; user
  // events bump the lab-tech list so role/status changes propagate live.
  useTicketEvents(handleTicketChange);
  useUserEvents(() => setRefreshKey(prev => prev + 1));

  // After editing a ticket from the modal: keep the row in the unassigned list
  // only if the updated ticket still belongs there; otherwise remove it.
  // Bump refreshKey so the lab tech list re-fetches counters.
  const handleTicketUpdate = (updatedTicket: Ticket) => {
    setUnassignedTickets(prev => {
      const stillUnassigned = !updatedTicket.Technician_ID && isActiveTicket(updatedTicket);
      if (stillUnassigned) {
        return prev.map(t => t.Ticket_ID === updatedTicket.Ticket_ID ? updatedTicket : t);
      }
      return prev.filter(t => t.Ticket_ID !== updatedTicket.Ticket_ID);
    });
    setRefreshKey(prev => prev + 1);
  };

  const handleResizeStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (isUnassignedCollapsed || !splitContainerRef.current) return;

    event.preventDefault();
    const rect = splitContainerRef.current.getBoundingClientRect();

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const nextPercent = ((moveEvent.clientY - rect.top) / rect.height) * 100;
      setDetailsPanelPercent(Math.min(74, Math.max(36, nextPercent)));
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  return (
    <div className="flex h-full w-full flex-col bg-white p-6 dark:bg-gray-900 sm:px-8 lg:px-10">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Lab Technicians</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage lab technician assignments and active workload</p>
        </div>
        <button
          onClick={() => setIsReportModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Report Issue
        </button>
      </div>

      <div className="flex min-h-0 flex-1 gap-6">
        <LabTechList selectedTech={selectedTech} onSelect={setSelectedTech} refreshSignal={refreshKey} />

        <div ref={splitContainerRef} className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div
            className="min-h-0 overflow-hidden"
            style={isUnassignedCollapsed ? { flex: '1 1 auto' } : { flexBasis: `${detailsPanelPercent}%` }}
          >
            {selectedTech ? (
              <LabTechDetailPanel
                key={refreshKey}
                labTech={selectedTech}
                onTicketReassigned={handleTicketChange}
              />
            ) : (
              <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 text-gray-500 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-400">
                Select a lab technician to view details
              </div>
            )}
          </div>

          {!isUnassignedCollapsed && (
            <div
              role="separator"
              aria-orientation="horizontal"
              aria-label="Resize lab technician details and unassigned tickets panels"
              onPointerDown={handleResizeStart}
              className="group my-3 flex h-4 shrink-0 cursor-row-resize items-center"
            >
              <div className="h-px flex-1 bg-gray-200 transition-colors group-hover:bg-[#615fff] dark:bg-gray-700 dark:group-hover:bg-[#615fff]" />
              <div className="mx-2 h-1.5 w-12 rounded-full bg-gray-300 transition-colors group-hover:bg-[#615fff] dark:bg-gray-600 dark:group-hover:bg-[#615fff]" />
              <div className="h-px flex-1 bg-gray-200 transition-colors group-hover:bg-[#615fff] dark:bg-gray-700 dark:group-hover:bg-[#615fff]" />
            </div>
          )}

          <div className={`${isUnassignedCollapsed ? 'shrink-0' : 'min-h-[168px] flex-1'} flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800`}>
            <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-[#334155]">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-amber-100 p-2 dark:bg-amber-900/30">
                  <svg className="h-5 w-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Unassigned Tickets</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {unassignedTickets.length} ticket{unassignedTickets.length === 1 ? '' : 's'} awaiting assignment
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={loadUnassigned}
                  className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-indigo-600 dark:hover:bg-white/10 dark:hover:text-indigo-400"
                  title="Refresh"
                >
                  <svg className={`h-4 w-4 ${isLoadingUnassigned ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setIsUnassignedCollapsed(prev => !prev)}
                  className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/10 dark:hover:text-white"
                  aria-expanded={!isUnassignedCollapsed}
                  aria-label={isUnassignedCollapsed ? 'Expand unassigned tickets' : 'Collapse unassigned tickets'}
                  title={isUnassignedCollapsed ? 'Expand' : 'Collapse'}
                >
                  <svg
                    className="h-4 w-4 transition-transform"
                    style={{ transform: isUnassignedCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>

            {!isUnassignedCollapsed && (
              <div className="flex min-h-0 flex-1">
                {isLoadingUnassigned ? (
                  <LoadingSkeleton type="table-rows" columns={5} rows={4} className="flex-1" />
                ) : (
                  <Table headers={unassignedHeaders} columnWidths="0.7fr 1.6fr 1fr 0.8fr 0.8fr" density="compact">
                    {unassignedTickets.length === 0 ? (
                      <div className="flex flex-1 flex-col items-center justify-center py-8 text-center text-gray-500 dark:text-gray-400" data-full-row>
                        <svg className="mx-auto mb-2 h-10 w-10 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm">All tickets are assigned</p>
                      </div>
                    ) : (
                      unassignedTickets.map((ticket) => (
                        <div
                          key={ticket.Ticket_ID}
                          role="button"
                          tabIndex={0}
                          onClick={() => setViewingTicket(ticket)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setViewingTicket(ticket);
                            }
                          }}
                          className="cursor-pointer transition-colors hover:bg-gray-50 focus:bg-gray-100 focus:outline-none dark:hover:bg-gray-800/50 dark:focus:bg-gray-800"
                        >
                          <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${ticket.Priority === 'HIGH'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                            : ticket.Priority === 'MEDIUM'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                              : ticket.Priority === 'LOW'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                            }`}>
                            {ticket.Priority || 'Not set'}
                          </span>
                          <div className="min-w-0 truncate text-sm font-medium text-gray-900 dark:text-white" title={ticket.Report_Problem}>
                            {ticket.Report_Problem}
                          </div>
                          <span className="truncate text-sm text-gray-500 dark:text-gray-400">
                            {ticket.Reporter_Identifier
                              ? ticket.Reporter_Identifier
                              : ticket.Reported_By
                                ? `${ticket.Reported_By.First_Name} ${ticket.Reported_By.Last_Name}`
                                : 'None'}
                          </span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(ticket.Created_At).toLocaleDateString()}
                          </span>
                          <div onClick={(e) => e.stopPropagation()}>
                            <AssignTicketDropdown
                              ticketId={ticket.Ticket_ID}
                              currentTechnicianId={null}
                              onAssigned={() => {
                                setUnassignedTickets(prev => prev.filter(t => t.Ticket_ID !== ticket.Ticket_ID));
                                handleTicketChange();
                              }}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </Table>
                )}
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

      <TicketingModal
        isOpen={viewingTicket !== null}
        onClose={() => setViewingTicket(null)}
        ticket={viewingTicket}
        onUpdate={handleTicketUpdate}
        isCreating={false}
      />
    </div>
  );
}
