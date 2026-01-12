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
    <div className="flex-1 overflow-auto gap-4">
      <header className="mb-6 bg-gray-800 rounded-xl shadow p-6 flex flex-col gap-2">
        <div className="flex items-center gap-4">
          <span className="rounded-full bg-blue-900 w-12 h-12 flex items-center justify-center text-2xl font-bold text-white">
            {labTech.name.charAt(0)}
          </span>
          <div>
            <h1 className="text-2xl font-bold">{labTech.name}</h1>
            <p className="text-lg text-blue-200">{labTech.id} &nbsp;|&nbsp; {labTech.email || labTech.department || 'Lab Technician'}</p>
            <span
              className={`mt-2 inline-block px-3 py-1 text-sm font-semibold rounded-full ${labTech.status === 'Active'
                ? 'bg-green-600 text-green-100'
                : 'bg-gray-600 text-gray-200'
                }`}
            >
              {labTech.status}
            </span>
          </div>
        </div>
      </header>

      <nav className="mb-6 flex border-b border-gray-700 gap-4">
        {['Tickets', 'Reports'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`relative pb-2 text-base font-semibold outline-none transition-colors ${activeTab === tab
              ? 'text-blue-400'
              : 'text-gray-400 hover:text-blue-300'
              }`}
          >
            {tab}
            {activeTab === tab && (
              <span className="absolute left-1/2 -translate-x-1/2 -bottom-0 h-1 w-12 bg-blue-600 rounded-full" />
            )}
          </button>
        ))}
      </nav>

      {activeTab === 'Tickets' && (
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Assigned Tickets</h2>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-yellow-900/20 border border-yellow-700/50 p-4 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-yellow-400 text-sm font-medium">In Progress</p>
                <p className="text-3xl font-bold text-white mt-1">{inProgressTickets.length}</p>
              </div>
              <div className="h-10 w-10 bg-yellow-900/40 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>

            <div className="bg-green-900/20 border border-green-700/50 p-4 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-green-400 text-sm font-medium">Resolved</p>
                <p className="text-3xl font-bold text-white mt-1">{resolvedTickets.length}</p>
              </div>
              <div className="h-10 w-10 bg-green-900/40 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </div>

          {isLoadingTickets ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-10 text-gray-500 bg-gray-900/50 rounded-lg">
              <p>No active tickets assigned.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* In Progress Section */}
              {inProgressTickets.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center">
                    <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                    In Progress
                  </h3>
                  <div className="space-y-3">
                    {inProgressTickets.map(ticket => (
                      <div key={ticket.Ticket_ID} className="p-4 bg-gray-800/50 rounded-lg border-l-4 border-yellow-500 hover:bg-gray-800 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-white">{ticket.Report_Problem}</h4>
                          <span className="text-xs bg-yellow-900/30 text-yellow-300 px-2 py-1 rounded">
                            {ticket.Priority}
                          </span>
                        </div>
                        <div className="text-sm text-gray-400 flex justify-between">
                          <span>{ticket.Location} {ticket.Room ? `(${ticket.Room.Name})` : ''}</span>
                          <span>{new Date(ticket.Created_At).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Resolved Section */}
              {resolvedTickets.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    Resolved
                  </h3>
                  <div className="space-y-3">
                    {resolvedTickets.map(ticket => (
                      <div key={ticket.Ticket_ID} className="p-4 bg-gray-800/50 rounded-lg border-l-4 border-green-500 opacity-75 hover:opacity-100 transition-opacity">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-gray-300">{ticket.Report_Problem}</h4>
                          <span className="text-xs bg-green-900/30 text-green-300 px-2 py-1 rounded">
                            RESOLVED
                          </span>
                        </div>
                        <div className="text-sm text-gray-500 flex justify-between">
                          <span>{ticket.Location}</span>
                          <span>{new Date(ticket.Updated_At).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {activeTab === 'Reports' && (
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Weekly Reports</h2>
            <span className="text-sm text-gray-400">{reports.length} reports found</span>
          </div>

          {reports.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <p>No reports submitted yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="bg-gray-800/50 rounded-lg overflow-hidden border border-gray-700/50 hover:border-blue-500/50 transition-colors"
                >
                  <button
                    onClick={() => toggleReport(report.id)}
                    className="w-full text-left p-4 flex justify-between items-center focus:outline-none"
                  >
                    <div>
                      <h3 className="font-medium text-lg">
                        Weekly Report: {formatDate(report.weekStartDate)} - {formatDate(report.weekEndDate)}
                      </h3>
                      <p className="text-sm text-gray-400 mt-1">
                        Submitted on {new Date(report.submittedAt).toLocaleString()}
                      </p>
                    </div>
                    {/* ... (rest of report item UI) */}
                  </button>

                  {expandedReport === report.id && (
                    <div className="px-4 pb-4 pt-2 border-t border-gray-700/50 animate-fade-in">
                      {/* ... (expanded report details) */}
                      <p className="text-gray-400 p-4">Report details placeholder...</p>
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
