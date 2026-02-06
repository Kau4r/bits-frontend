import { useState, useEffect } from 'react';
// import LabTechProgressBar from './LabTechProgress';  
import { fetchTickets } from '@/services/tickets';
import type { Ticket } from '@/types/tickets';

type Task = {
  id: string;
  title: string;
  description: string;
  status: 'completed' | 'pending' | 'inProgress';
  category: string;
  timeSpent?: number;
  completedAt?: string;
  dueDate?: string;
};

type Report = {
  id: string;
  weekStartDate: string;
  weekEndDate: string;
  tasks: {
    completed: Task[];
    pending: Task[];
    inProgress: Task[];
  };
  issuesReported: number;
  notes?: string;
  submittedAt: string;
  userId: string;
  accepted?: boolean;
  acceptedAt?: string;
  acceptedBy?: string;
};

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
  reports?: Report[];
};

interface Props {
  labTech: LabTech;
}

// Mock data for reports (kept for now)
const mockReportsByUser: Record<string, Report[]> = {
  'LT001': [
    {
      id: 'RPT-001',
      weekStartDate: '2023-09-11',
      weekEndDate: '2023-09-17',
      tasks: {
        completed: [
          {
            id: 'TASK-101',
            title: 'Routine Maintenance - Lab A',
            description: 'Performed scheduled maintenance on all computers in Lab A',
            status: 'completed',
            category: 'Maintenance',
            timeSpent: 120,
            completedAt: '2023-09-12T14:30:00'
          }
        ],
        pending: [],
        inProgress: []
      },
      issuesReported: 0,
      notes: 'Completed routine maintenance.',
      submittedAt: '2023-09-17T16:30:00',
      userId: 'LT001'
    }
  ]
};

export default function LabTechDetailPanel({ labTech }: Props) {
  const [activeTab, setActiveTab] = useState('Tickets');
  const [expandedReport, setExpandedReport] = useState<string | null>(null);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);



  // Fetch tickets when labTech changes
  useEffect(() => {
    const loadTickets = async () => {
      if (!labTech.dbId) return;

      try {
        setIsLoadingTickets(true);
        // Fetch tickets assigned to this tech, EXCLUDING 'PENDING'
        const fetchedTickets = await fetchTickets({
          technicianId: labTech.dbId,
          excludeStatus: 'PENDING'
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

  // Group tickets by status
  const inProgressTickets = tickets.filter(t => t.Status === 'IN_PROGRESS');
  const resolvedTickets = tickets.filter(t => t.Status === 'RESOLVED');

  const reports = (mockReportsByUser[labTech.id] || []).map(report => ({
    ...report,
    accepted: false // No longer tracking acceptance state
  }));


  const toggleReport = (reportId: string) => {
    setExpandedReport(expandedReport === reportId ? null : reportId);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  };

  return (
    <div className="flex-1 overflow-auto gap-4 custom-scrollbar h-full pr-2">
      <header className="mb-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex flex-col gap-2 transition-colors">
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

      <nav className="mb-6 flex border-b border-gray-200 dark:border-gray-700 gap-6">
        <button
          onClick={() => setActiveTab('Tickets')}
          className={`relative pb-3 text-sm font-medium outline-none transition-colors ${activeTab === 'Tickets'
            ? 'text-indigo-600 dark:text-indigo-400'
            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
        >
          Tickets
          <span className="ml-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full text-xs">
            {inProgressTickets.length + resolvedTickets.length}
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
        <section className="animate-fade-in">
          {isLoadingTickets ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-10 text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
              <p>No active tickets assigned.</p>
            </div>
          ) : (
            <div className="overflow-hidden border border-gray-200 dark:border-gray-700 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Priority</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Issue</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Location</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {/* Combine and sort tickets if needed, or map sections. Let's map In Progress then Resolved for now */}
                  {[...inProgressTickets, ...resolvedTickets].map((ticket) => (
                    <tr key={ticket.Ticket_ID} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ticket.Priority === 'HIGH' || ticket.Priority === 'CRITICAL' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                            ticket.Priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                              'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                          }`}>
                          {ticket.Priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                        <div className="max-w-xs truncate" title={ticket.Report_Problem}>{ticket.Report_Problem}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {ticket.Location} {ticket.Room ? `(${ticket.Room.Name})` : ''}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(ticket.Created_At).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${ticket.Status === 'RESOLVED'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                          }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${ticket.Status === 'RESOLVED' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                          {ticket.Status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {activeTab === 'Reports' && (
        <section className="animate-fade-in">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Weekly Reports</h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">{reports.length} reports found</span>
          </div>

          {reports.length === 0 ? (
            <div className="text-center py-10 text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
              <p>No reports submitted yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors shadow-sm"
                >
                  <button
                    onClick={() => toggleReport(report.id)}
                    className="w-full text-left p-4 flex justify-between items-center focus:outline-none"
                  >
                    <div>
                      <h3 className="font-medium text-lg text-gray-900 dark:text-white">
                        Weekly Report: {formatDate(report.weekStartDate)} - {formatDate(report.weekEndDate)}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Submitted on {new Date(report.submittedAt).toLocaleString()}
                      </p>
                    </div>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${expandedReport === report.id ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {expandedReport === report.id && (
                    <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-gray-700">
                      <p className="text-gray-600 dark:text-gray-300 p-2 text-sm">{report.notes || 'No specific notes provided.'}</p>
                      {/* Detailed task view integration goes here */}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
