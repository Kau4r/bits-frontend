import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  getReports,
  createReport,
  updateReport,
  submitReport,
} from '@/services/reports';
import type { WeeklyReport, ReportCreateInput, ReportUpdateInput } from '@/types/report';
import { reportStatusLabels, reportStatusColors } from '@/types/report';
import { WeeklyReportDialog } from '@/pages/labtech/components/WeeklyReportDialog';

export default function Reports() {
  const { user: _user } = useAuth();
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<WeeklyReport | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const loadReports = async () => {
    try {
      setIsLoading(true);
      const data = await getReports();
      setReports(data);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleOpenNew = () => {
    setEditingReport(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (report: WeeklyReport) => {
    if (report.Status !== 'DRAFT') return;
    setEditingReport(report);
    setDialogOpen(true);
  };

  const handleSave = async (
    input: ReportCreateInput | ReportUpdateInput,
    submitNow = false
  ) => {
    if (editingReport) {
      await updateReport(editingReport.Report_ID, input as ReportUpdateInput);
      if (submitNow) {
        await submitReport(editingReport.Report_ID);
      }
    } else {
      const created = await createReport({
        ...(input as ReportCreateInput),
        status: submitNow ? 'SUBMITTED' : 'DRAFT',
      });
      if (submitNow && created.Status === 'DRAFT') {
        await submitReport(created.Report_ID);
      }
    }
    await loadReports();
  };

  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div className="flex h-full w-full flex-col bg-white p-6 sm:px-8 lg:px-10 dark:bg-gray-900">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Weekly Reports</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Submit and track your weekly activity reports
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleOpenNew}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-500 hover:shadow-md focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none active:bg-indigo-700"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Report
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400" />
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
          <svg className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2a2 2 0 012-2h2a2 2 0 012 2v2m-6 0h6m-8 4h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="font-medium">No reports yet</p>
          <p className="text-sm mt-1">Click "New Report" to create your first weekly report.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map(report => (
            <div
              key={report.Report_ID}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
            >
              <button
                type="button"
                onClick={() => setExpandedId(expandedId === report.Report_ID ? null : report.Report_ID)}
                className="w-full text-left px-5 py-4 flex items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-semibold text-gray-900 dark:text-white text-sm">
                      {formatDate(report.Week_Start)} &ndash; {formatDate(report.Week_End)}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${reportStatusColors[report.Status]}`}>
                      {reportStatusLabels[report.Status]}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Created {formatDate(report.Created_At)}
                    {report.Reviewed_At && ` · Reviewed ${formatDate(report.Reviewed_At)}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {report.Status === 'DRAFT' && (
                    <span
                      onClick={e => { e.stopPropagation(); handleOpenEdit(report); }}
                      role="button"
                      className="px-3 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-700 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                    >
                      Edit
                    </span>
                  )}
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${expandedId === report.Report_ID ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {expandedId === report.Report_ID && (
                <div className="px-5 pb-5 pt-2 border-t border-gray-100 dark:border-gray-700 space-y-4">
                  {/* Task summary */}
                  <div className="grid grid-cols-3 gap-3 text-center">
                    {(['completed', 'inProgress', 'pending'] as const).map(s => {
                      const tasks = (report.Tasks as any)[s] ?? [];
                      const labels = { completed: 'Completed', inProgress: 'In Progress', pending: 'Pending' };
                      const colors = {
                        completed: 'text-green-600 dark:text-green-400',
                        inProgress: 'text-yellow-600 dark:text-yellow-400',
                        pending: 'text-gray-500 dark:text-gray-400',
                      };
                      return (
                        <div key={s} className="rounded-lg bg-gray-50 dark:bg-gray-700/50 p-3">
                          <p className={`text-2xl font-bold ${colors[s]}`}>{tasks.length}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{labels[s]}</p>
                        </div>
                      );
                    })}
                  </div>

                  {report.Notes && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                      {report.Notes}
                    </p>
                  )}

                  {/* Task list */}
                  {(['completed', 'inProgress', 'pending'] as const).map(s => {
                    const sectionTasks = (report.Tasks as any)[s] ?? [];
                    if (sectionTasks.length === 0) return null;
                    const labels = { completed: 'Completed Tasks', inProgress: 'In Progress', pending: 'Pending Tasks' };
                    return (
                      <div key={s}>
                        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">{labels[s]}</h4>
                        <ul className="space-y-1.5">
                          {sectionTasks.map((t: any, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                              <span className="mt-0.5 shrink-0 inline-flex items-center justify-center rounded px-1.5 py-0.5 text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                                {t.category}
                              </span>
                              <span className="font-medium">{t.title}</span>
                              {t.description && <span className="text-gray-500 dark:text-gray-400">– {t.description}</span>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <WeeklyReportDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        existing={editingReport}
      />
    </div>
  );
}
