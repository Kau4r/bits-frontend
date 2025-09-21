import { useState } from 'react';
import LabTechProgressBar from './LabTechProgress';
import LabTechActivities from './LabTechActivities';

type Activity = {
  title: string;
  details: string;
  date: string;
};

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
  id: string;
  name: string;
  department: string;
  status: string;
  weeklyProgress: { completedTasks: number; totalTasks: number };
  activities: {
    completed: Activity[];
    pending: Activity[];
    inProgress: Activity[];
  };
  reports?: Report[];
};

interface Props {
  labTech: LabTech;
}

// Mock data for reports
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
          },
          {
            id: 'TASK-102',
            title: 'Software Update - Design Lab',
            description: 'Updated Adobe Creative Suite on all design lab machines',
            status: 'completed',
            category: 'Updates',
            timeSpent: 90,
            completedAt: '2023-09-13T10:15:00'
          }
        ],
        pending: [
          {
            id: 'TASK-103',
            title: 'Monitor Replacement',
            description: 'Replace faulty monitors in Lab B (3 units)',
            status: 'pending',
            category: 'Hardware',
            dueDate: '2023-09-25'
          }
        ],
        inProgress: [
          {
            id: 'TASK-104',
            title: 'Network Configuration',
            description: 'Configure new network switches for east wing',
            status: 'inProgress',
            category: 'Networking',
            timeSpent: 180
          }
        ]
      },
      issuesReported: 2,
      notes: 'Completed routine maintenance on all lab computers. Two monitors need replacement.',
      submittedAt: '2023-09-17T16:30:00',
      userId: 'LT001'
    },
    // ... other reports
  ],
  // ... other users
};

export default function LabTechDetailPanel({ labTech }: Props) {
  const [activeTab, setActiveTab] = useState('Activities');
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [acceptedReports, setAcceptedReports] = useState<Record<string, boolean>>({});
  
  // Use mock reports for now, replace with labTech.reports when available
  const reports = (mockReportsByUser[labTech.id] || []).map(report => ({
    ...report,
    accepted: acceptedReports[report.id] || false
  }));

  const handleAcceptReport = (reportId: string) => {
    setAcceptedReports(prev => ({
      ...prev,
      [reportId]: true
    }));
  };

  const percentage = labTech.weeklyProgress.totalTasks > 0
    ? Math.round((labTech.weeklyProgress.completedTasks / labTech.weeklyProgress.totalTasks) * 100)
    : 0;

  const toggleReport = (reportId: string) => {
    setExpandedReport(expandedReport === reportId ? null : reportId);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
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
            <p className="text-lg text-blue-200">{labTech.id} &nbsp;|&nbsp; {labTech.department}</p>
            <span
              className={`mt-2 inline-block px-3 py-1 text-sm font-semibold rounded-full ${
                labTech.status === 'Active'
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
        {['Activities', 'Reports'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`relative pb-2 text-base font-semibold outline-none transition-colors ${
              activeTab === tab
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

      {activeTab === 'Activities' && (
        <section>
          <h2 className="text-xl font-semibold mb-3">Weekly Progress</h2>
          <div className="mb-3">
            <LabTechProgressBar
              completed={labTech.weeklyProgress.completedTasks}
              total={labTech.weeklyProgress.totalTasks}
            />
            <div className="flex justify-between text-gray-400 text-sm mt-1">
              <span>
                {labTech.weeklyProgress.completedTasks}/{labTech.weeklyProgress.totalTasks} tasks
              </span>
              <span>{percentage}%</span>
            </div>
            <p className="mt-2 text-gray-400">
              {labTech.weeklyProgress.totalTasks - labTech.weeklyProgress.completedTasks} tasks remaining to reach weekly target
            </p>
          </div>
          <LabTechActivities activities={labTech.activities} />
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
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2 text-sm">
                        <span className="px-2 py-1 bg-green-900/50 text-green-300 rounded-full">
                          {report.tasks.completed.length} completed
                        </span>
                        <span className="px-2 py-1 bg-yellow-900/50 text-yellow-300 rounded-full">
                          {report.tasks.pending.length} pending
                        </span>
                        <span className="px-2 py-1 bg-red-900/50 text-red-300 rounded-full">
                          {report.tasks.inProgress.length} in progress
                        </span>
                      </div>
                      <svg
                        className={`w-5 h-5 text-gray-400 transition-transform ${
                          expandedReport === report.id ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </button>
                  
                  {expandedReport === report.id && (
                    <div className="px-4 pb-4 pt-2 border-t border-gray-700/50 animate-fade-in">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-gray-900/50 p-4 rounded-lg">
                          <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center">
                            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                            Completed Tasks ({report.tasks.completed.length})
                          </h4>
                          <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                            {report.tasks.completed.length > 0 ? (
                              report.tasks.completed.map(task => (
                                <div key={task.id} className="p-3 bg-gray-800/50 rounded border-l-2 border-green-500">
                                  <div className="flex justify-between items-start">
                                    <h5 className="font-medium text-white">{task.title}</h5>
                                    <span className="text-xs text-gray-400">
                                      {task.timeSpent ? `${Math.floor(task.timeSpent / 60)}h ${task.timeSpent % 60}m` : 'No time logged'}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-300 mt-1">{task.description}</p>
                                  <div className="flex justify-between items-center mt-2 text-xs text-gray-400">
                                    <span className="px-2 py-0.5 bg-gray-700/50 rounded">{task.category}</span>
                                    {task.completedAt && (
                                      <span>Completed: {new Date(task.completedAt).toLocaleDateString()}</span>
                                    )}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-gray-400 italic">No completed tasks this week</p>
                            )}
                          </div>
                        </div>

                        <div className="bg-gray-900/50 p-4 rounded-lg">
                          <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center">
                            <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                            In Progress ({report.tasks.inProgress.length})
                          </h4>
                          <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                            {report.tasks.inProgress.length > 0 ? (
                              report.tasks.inProgress.map(task => (
                                <div key={task.id} className="p-3 bg-gray-800/50 rounded border-l-2 border-yellow-500">
                                  <div className="flex justify-between items-start">
                                    <h5 className="font-medium text-white">{task.title}</h5>
                                    <span className="text-xs text-yellow-400">
                                      {task.timeSpent ? `${Math.floor(task.timeSpent / 60)}h logged` : 'Not started'}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-300 mt-1">{task.description}</p>
                                  <div className="flex justify-between items-center mt-2">
                                    <span className="text-xs px-2 py-0.5 bg-gray-700/50 rounded">
                                      {task.category}
                                    </span>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-gray-400 italic">No tasks in progress</p>
                            )}
                          </div>
                        </div>

                        <div className="bg-gray-900/50 p-4 rounded-lg">
                          <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center">
                            <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                            Pending Tasks ({report.tasks.pending.length})
                          </h4>
                          <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                            {report.tasks.pending.length > 0 ? (
                              report.tasks.pending.map(task => (
                                <div key={task.id} className="p-3 bg-gray-800/50 rounded border-l-2 border-red-500">
                                  <div className="flex justify-between items-start">
                                    <h5 className="font-medium text-white">{task.title}</h5>
                                    <span className="text-xs text-red-400">
                                      {task.dueDate ? `Due: ${new Date(task.dueDate).toLocaleDateString()}` : 'No due date'}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-300 mt-1">{task.description}</p>
                                  <div className="flex justify-between items-center mt-2">
                                    <span className="text-xs px-2 py-0.5 bg-gray-700/50 rounded">
                                      {task.category}
                                    </span>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-gray-400 italic">No pending tasks</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Existing notes and action buttons */}
                      {report.notes && (
                        <div className="mt-6">
                          <h4 className="text-sm font-medium text-gray-400 mb-2">Additional Notes</h4>
                          <div className="bg-gray-900/30 p-4 rounded-lg text-gray-300 whitespace-pre-line border-l-4 border-blue-600/50">
                            {report.notes}
                          </div>
                        </div>
                      )}

                      {report.accepted ? (
                        <div className="mt-4 p-3 bg-green-900/20 border border-green-700/50 rounded-lg flex items-center">
                          <svg className="h-5 w-5 text-green-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-green-300">Report Accepted</span>
                          <span className="ml-auto text-xs text-green-400">
                            {new Date().toLocaleString()}
                          </span>
                        </div>
                      ) : (
                        <div className="mt-6 flex justify-end gap-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAcceptReport(report.id);
                            }}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors flex items-center gap-2 text-sm"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Accept Report
                          </button>
                        </div>
                      )}
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
