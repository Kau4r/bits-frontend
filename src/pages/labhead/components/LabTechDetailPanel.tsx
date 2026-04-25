import { useState, useEffect, useMemo } from 'react';
import { fetchTickets } from '@/services/tickets';
import AssignTicketDropdown from '@/pages/labhead/components/AssignTicketDropdown';
import { getReports, reviewReport, downloadWeeklyReportsCsv } from '@/services/reports';
import type { Ticket } from '@/types/tickets';
import type { WeeklyReport } from '@/types/report';
import { reportStatusLabels, reportStatusColors } from '@/types/report';
import { formatTicketLocationDisplay } from '@/lib/ticketLocation';
import { Badge } from '@/ui';
import { TICKET_STATUS_VARIANT, VARIANT_DOT_CLASS } from '@/lib/constants';
import Table from '@/components/Table';
import TicketingModal from '@/pages/tickets/components/TicketingModal';
import { LoadingSkeleton } from '@/ui';

type LabTech = {
  dbId: number;
  id: string;
  name: string;
  email?: string;
  department?: string;
  status: string;
  weeklyProgress: { completedTasks: number; totalTasks: number };
  activities: {
    completed: any[];
    pending: any[];
    inProgress: any[];
  };
};

interface Props {
  labTech: LabTech;
  onTicketReassigned?: () => void;
}

export default function LabTechDetailPanel({ labTech, onTicketReassigned }: Props) {
  const [activeTab, setActiveTab] = useState('Tickets');
  const [expandedReport, setExpandedReport] = useState<number | null>(null);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  const [viewingTicket, setViewingTicket] = useState<Ticket | null>(null);

  const ticketTableHeaders = useMemo(() => [
    { label: 'Priority', align: 'left' as const },
    { label: 'Description', align: 'left' as const },
    { label: 'Location', align: 'left' as const },
    { label: 'Date', align: 'left' as const },
    { label: 'Status', align: 'center' as const },
    { label: 'Actions', align: 'right' as const },
  ], []);

  const handleTicketUpdated = (updated: Ticket) => {
    setTickets(prev => {
      const stillBelongs = updated.Technician_ID === labTech.dbId
        && !updated.Archived
        && updated.Status !== 'RESOLVED';
      if (stillBelongs) {
        return prev.map(t => t.Ticket_ID === updated.Ticket_ID ? updated : t);
      }
      return prev.filter(t => t.Ticket_ID !== updated.Ticket_ID);
    });
    onTicketReassigned?.();
  };

  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [viewingReport, setViewingReport] = useState<WeeklyReport | null>(null);
  const [activeReportCategory, setActiveReportCategory] = useState<string>('all');

  // Reset the category tab whenever the viewed report changes so we always land on "All".
  useEffect(() => {
    setActiveReportCategory('all');
  }, [viewingReport]);

  // Fetch tickets when labTech changes
  useEffect(() => {
    const loadTickets = async () => {
      if (!labTech.dbId) return;
      try {
        setIsLoadingTickets(true);
        const fetchedTickets = await fetchTickets({
          technicianId: labTech.dbId,
        });
        setTickets(fetchedTickets);
      } catch (error) {
        console.error('Failed to fetch tickets:', error);
      } finally {
        setIsLoadingTickets(false);
      }
    };
    loadTickets();
  }, [labTech.dbId]);

  // Fetch reports when labTech changes
  useEffect(() => {
    if (!labTech.dbId) return;
    const loadReports = async () => {
      try {
        setIsLoadingReports(true);
        const data = await getReports({ userId: labTech.dbId });
        setReports(data);
      } catch (error) {
        console.error('Failed to fetch reports:', error);
      } finally {
        setIsLoadingReports(false);
      }
    };
    loadReports();
  }, [labTech.dbId]);

  const activeTickets = tickets.filter(t => !t.Archived && t.Status !== 'RESOLVED');
  const pendingTickets = activeTickets.filter(t => t.Status === 'PENDING');
  const inProgressTickets = activeTickets.filter(t => t.Status === 'IN_PROGRESS');

  const handleReview = async (reportId: number) => {
    setReviewingId(reportId);
    try {
      const updated = await reviewReport(reportId);
      setReports(prev => prev.map(r => r.Report_ID === reportId ? updated : r));
    } catch (error) {
      console.error('Failed to review report:', error);
    } finally {
      setReviewingId(null);
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden pr-2">
      <header className="mb-6 flex shrink-0 flex-col gap-2 rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center gap-4">
          <span className="rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-200 w-16 h-16 flex items-center justify-center text-2xl font-bold">
            {labTech.name.charAt(0)}
          </span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{labTech.name}</h1>
            <p className="text-lg text-gray-500 dark:text-gray-400">{labTech.id} &nbsp;|&nbsp; {labTech.email || labTech.department || 'Lab Technician'}</p>
            <span
              className={`mt-2 inline-block px-3 py-1 text-sm font-semibold rounded-full ${labTech.status === 'Active'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                }`}
            >
              {labTech.status}
            </span>
          </div>
        </div>
      </header>

      <nav className="mb-6 flex shrink-0 gap-6 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('Tickets')}
          className={`relative pb-3 text-sm font-medium outline-none transition-colors ${activeTab === 'Tickets'
            ? 'text-indigo-600 dark:text-indigo-400'
            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
        >
          Tickets
          <span className="ml-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full text-xs">
            {activeTickets.length}
          </span>
          {activeTab === 'Tickets' && (
            <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-indigo-600 dark:bg-indigo-400" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('Reports')}
          className={`relative pb-3 text-sm font-medium outline-none transition-colors ${activeTab === 'Reports'
            ? 'text-indigo-600 dark:text-indigo-400'
            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
        >
          Reports
          <span className="ml-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full text-xs">
            {reports.length}
          </span>
          {activeTab === 'Reports' && (
            <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-indigo-600 dark:bg-indigo-400" />
          )}
        </button>
      </nav>

      {activeTab === 'Tickets' && (
        <section className="flex min-h-0 flex-1 animate-fade-in">
          {isLoadingTickets ? (
            <LoadingSkeleton type="table-rows" columns={6} rows={5} className="flex-1" />
          ) : (
            <Table headers={ticketTableHeaders} columnWidths="0.7fr 1.6fr 1.2fr 0.8fr 1fr 0.9fr" density="compact">
              {activeTickets.length === 0 ? (
                <div className="flex flex-1 items-center justify-center py-10 text-center text-gray-500 dark:text-gray-400" data-full-row>
                  <p>No active tickets assigned.</p>
                </div>
              ) : (
                [...pendingTickets, ...inProgressTickets].map((ticket) => (
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
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ticket.Priority === 'HIGH' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                      ticket.Priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                        'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                      }`}>
                      {ticket.Priority || 'N/A'}
                    </span>
                    <div className="min-w-0 truncate text-sm font-medium text-gray-900 dark:text-white" title={ticket.Report_Problem}>
                      {ticket.Report_Problem}
                    </div>
                    <span className="truncate text-sm text-gray-500 dark:text-gray-400">
                      {formatTicketLocationDisplay(ticket.Location, ticket.Room?.Name || '—')}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(ticket.Created_At).toLocaleDateString()}
                    </span>
                    {(() => {
                      const variant = TICKET_STATUS_VARIANT[ticket.Status] || 'default';
                      return (
                        <Badge variant={variant}>
                          <span className={`h-1.5 w-1.5 rounded-full ${VARIANT_DOT_CLASS[variant]}`} />
                          {ticket.Status.replace('_', ' ')}
                        </Badge>
                      );
                    })()}
                    <div onClick={(e) => e.stopPropagation()}>
                      <AssignTicketDropdown
                        ticketId={ticket.Ticket_ID}
                        currentTechnicianId={ticket.Technician_ID ?? undefined}
                        onAssigned={() => {
                          setTickets(prev => prev.filter(t => t.Ticket_ID !== ticket.Ticket_ID));
                          onTicketReassigned?.();
                        }}
                        buttonLabel="Reassign"
                      />
                    </div>
                  </div>
                ))
              )}
            </Table>
          )}
        </section>
      )}

      {activeTab === 'Reports' && (
        <section className="min-h-0 flex-1 overflow-y-auto pr-1 custom-scrollbar animate-fade-in">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Weekly Reports</h2>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 dark:text-gray-400">{reports.length} report{reports.length !== 1 ? 's' : ''} found</span>
              <button
                type="button"
                onClick={() => downloadWeeklyReportsCsv({ userId: labTech.dbId })}
                className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                Export CSV
              </button>
            </div>
          </div>

          {isLoadingReports ? (
            <LoadingSkeleton type="card" rows={3} />
          ) : reports.length === 0 ? (
            <div className="text-center py-10 text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
              <p>No reports submitted yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <div
                  key={report.Report_ID}
                  className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors shadow-sm"
                >
                  <button
                    onClick={() => setExpandedReport(expandedReport === report.Report_ID ? null : report.Report_ID)}
                    className="w-full text-left p-4 flex justify-between items-center focus:outline-none"
                    type="button"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {formatDate(report.Week_Start)} – {formatDate(report.Week_End)}
                        </h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${reportStatusColors[report.Status]}`}>
                          {reportStatusLabels[report.Status]}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        Created {formatDate(report.Created_At)}
                        {report.Reviewed_At && ` · Reviewed ${formatDate(report.Reviewed_At)}`}
                      </p>
                    </div>
                    <svg
                      className={`w-5 h-5 text-gray-400 dark:text-gray-500 transition-transform shrink-0 ml-2 ${expandedReport === report.Report_ID ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {expandedReport === report.Report_ID && (
                    <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-gray-700 space-y-3">
                      {/* Task summary */}
                      <div className="grid grid-cols-3 gap-3 text-center">
                        {(['completed', 'inProgress', 'pending'] as const).map(s => {
                          const sectionTasks = (report.Tasks as any)[s] ?? [];
                          const labels = { completed: 'Completed', inProgress: 'In Progress', pending: 'Pending' };
                          const colors = {
                            completed: 'text-green-600 dark:text-green-400',
                            inProgress: 'text-yellow-600 dark:text-yellow-400',
                            pending: 'text-gray-500 dark:text-gray-400',
                          };
                          return (
                            <div key={s} className="rounded-lg bg-gray-50 dark:bg-gray-700/50 p-2">
                              <p className={`text-xl font-bold ${colors[s]}`}>{sectionTasks.length}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{labels[s]}</p>
                            </div>
                          );
                        })}
                      </div>

                      {report.Notes && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                          {report.Notes}
                        </p>
                      )}

                      <div className="flex items-center gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() => setViewingReport(report)}
                          className="px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-700 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                        >
                          View Full Report
                        </button>
                        {report.Status === 'SUBMITTED' && (
                          <button
                            type="button"
                            onClick={() => handleReview(report.Report_ID)}
                            disabled={reviewingId === report.Report_ID}
                            className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {reviewingId === report.Report_ID ? 'Marking...' : 'Mark as Reviewed'}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
      {/* Full Report Modal */}
      {viewingReport && (
        <div
          className="fixed inset-0 bg-black/40 grid place-items-center p-4 z-50 overflow-y-auto"
          onClick={() => setViewingReport(null)}
        >
          <div
            className="w-full max-w-3xl rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-6 shadow-xl my-4"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Weekly Report
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {new Date(viewingReport.Week_Start).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  {' – '}
                  {new Date(viewingReport.Week_End).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </p>
              </div>
              <button
                onClick={() => setViewingReport(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label="Close"
                type="button"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Summary row */}
            <div className="grid grid-cols-3 gap-3 text-center mb-6">
              {(['completed', 'inProgress', 'pending'] as const).map(s => {
                const sectionTasks = (viewingReport.Tasks as any)[s] ?? [];
                const labels = { completed: 'Completed', inProgress: 'In Progress', pending: 'Pending' };
                const colors = {
                  completed: 'text-green-600 dark:text-green-400',
                  inProgress: 'text-yellow-600 dark:text-yellow-400',
                  pending: 'text-gray-500 dark:text-gray-400',
                };
                return (
                  <div key={s} className="rounded-lg bg-gray-50 dark:bg-gray-700/50 p-3">
                    <p className={`text-2xl font-bold ${colors[s]}`}>{sectionTasks.length}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{labels[s]}</p>
                  </div>
                );
              })}
            </div>

            {/* Tasks Table (category tabs) */}
            {(() => {
              const allTasks: { task: any; status: string }[] = [];
              (['completed', 'inProgress', 'pending'] as const).forEach(s => {
                const statusLabels = { completed: 'Completed', inProgress: 'In Progress', pending: 'Pending' };
                const sectionTasks = (viewingReport.Tasks as any)[s] ?? [];
                sectionTasks.forEach((t: any) => allTasks.push({ task: t, status: statusLabels[s] }));
              });

              if (allTasks.length === 0) {
                return <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">No tasks in this report.</p>;
              }

              const categoryCounts = allTasks.reduce<Record<string, number>>((acc, { task }) => {
                const key = task.category || 'Uncategorized';
                acc[key] = (acc[key] || 0) + 1;
                return acc;
              }, {});
              const categories = Object.keys(categoryCounts).sort((a, b) => a.localeCompare(b));
              const currentCategory = activeReportCategory === 'all' || categoryCounts[activeReportCategory] ? activeReportCategory : 'all';
              const filteredTasks = currentCategory === 'all'
                ? allTasks
                : allTasks.filter(({ task }) => (task.category || 'Uncategorized') === currentCategory);

              return (
                <div className="mb-6">
                  {/* Category tabs */}
                  <div className="flex flex-wrap gap-1 border-b border-gray-200 dark:border-gray-700 mb-3" role="tablist">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={currentCategory === 'all'}
                      onClick={() => setActiveReportCategory('all')}
                      className={`px-3 py-2 text-xs font-semibold transition-colors border-b-2 -mb-px ${
                        currentCategory === 'all'
                          ? 'border-indigo-500 text-indigo-600 dark:text-indigo-300'
                          : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                      }`}
                    >
                      All ({allTasks.length})
                    </button>
                    {categories.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        role="tab"
                        aria-selected={currentCategory === cat}
                        onClick={() => setActiveReportCategory(cat)}
                        className={`px-3 py-2 text-xs font-semibold transition-colors border-b-2 -mb-px ${
                          currentCategory === cat
                            ? 'border-indigo-500 text-indigo-600 dark:text-indigo-300'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                        }`}
                      >
                        {cat} ({categoryCounts[cat]})
                      </button>
                    ))}
                  </div>

                  <div className="overflow-hidden border border-gray-200 dark:border-gray-700 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          {currentCategory === 'all' && (
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th>
                          )}
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Task</th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredTasks.map(({ task: t, status }, i) => {
                          const statusColor = status === 'Completed'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            : status === 'In Progress'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700/30 dark:text-gray-300';
                          return (
                            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                              {currentCategory === 'all' && (
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                                    {t.category || 'Uncategorized'}
                                  </span>
                                </td>
                              )}
                              <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                                <div className="flex items-center gap-2">
                                  {t.title}
                                  {t.ticketId && (
                                    <span className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                                      </svg>
                                      #{t.ticketId}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                                {t.description || '—'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                                  {status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {/* Notes */}
            {viewingReport.Notes && (
              <div className="mb-6">
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Notes</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                  {viewingReport.Notes}
                </p>
              </div>
            )}

          </div>
        </div>
      )}

      <TicketingModal
        isOpen={viewingTicket !== null}
        onClose={() => setViewingTicket(null)}
        ticket={viewingTicket}
        onUpdate={handleTicketUpdated}
        isCreating={false}
      />
    </div>
  );
}
