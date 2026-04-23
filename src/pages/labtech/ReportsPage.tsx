import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useModal } from '@/context/ModalContext';
import {
  getReports,
  createReport,
  updateReport,
  submitReport,
  deleteReport,
  downloadWeeklyReportsCsv,
} from '@/services/reports';
import type { WeeklyReport, ReportCreateInput, ReportUpdateInput, ReportTask } from '@/types/report';
import { reportStatusLabels, reportStatusColors, taskCategoryOptions } from '@/types/report';
import { WeeklyReportDialog } from '@/pages/labtech/components/WeeklyReportDialog';
import { Trash2 } from 'lucide-react';

// Category ordering follows the module audit intent (see types/report.ts).
const CATEGORY_ORDER = taskCategoryOptions as readonly string[];
type SectionKey = 'completed' | 'inProgress' | 'pending';

// Group a flat list of tasks by category. Unknown categories fall under 'Other'.
const groupByCategory = (tasks: ReportTask[]): Array<[string, ReportTask[]]> => {
  const map = new Map<string, ReportTask[]>();
  tasks.forEach(t => {
    const cat = t.category || 'Other';
    const arr = map.get(cat);
    if (arr) arr.push(t);
    else map.set(cat, [t]);
  });
  return Array.from(map.entries()).sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a[0]);
    const bi = CATEGORY_ORDER.indexOf(b[0]);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
};

export default function Reports() {
  const { user: _user } = useAuth();
  const modal = useModal();
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<WeeklyReport | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

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

  const handleDeleteDraft = async (report: WeeklyReport) => {
    const ok = await modal.showConfirm(
      `Delete draft for ${formatDate(report.Week_Start)} - ${formatDate(report.Week_End)}? This cannot be undone.`,
      'Delete Draft',
    );
    if (!ok) return;
    setDeletingId(report.Report_ID);
    try {
      await deleteReport(report.Report_ID);
      setReports(prev => prev.filter(r => r.Report_ID !== report.Report_ID));
      if (expandedId === report.Report_ID) setExpandedId(null);
    } catch (err) {
      console.error('Failed to delete draft:', err);
    } finally {
      setDeletingId(null);
    }
  };

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
            onClick={() => downloadWeeklyReportsCsv()}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v12m0 0l4-4m-4 4l-4-4M4 21h16" />
            </svg>
            Export CSV
          </button>
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
                    <>
                      <span
                        onClick={e => { e.stopPropagation(); handleOpenEdit(report); }}
                        role="button"
                        className="px-3 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-700 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                      >
                        Edit
                      </span>
                      <button
                        type="button"
                        disabled={deletingId === report.Report_ID}
                        onClick={e => { e.stopPropagation(); void handleDeleteDraft(report); }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-800 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                        aria-label="Delete draft"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {deletingId === report.Report_ID ? 'Deleting...' : 'Delete'}
                      </button>
                    </>
                  )}
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${expandedId === report.Report_ID ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {expandedId === report.Report_ID && (() => {
                const tasks = (report.Tasks as unknown as { completed?: ReportTask[]; inProgress?: ReportTask[]; pending?: ReportTask[] }) || {};
                const sections: Array<{
                  key: SectionKey;
                  label: string;
                  list: ReportTask[];
                  headerClass: string;
                  countClass: string;
                }> = [
                  { key: 'completed', label: 'Completed', list: tasks.completed ?? [], headerClass: 'text-green-700 dark:text-green-400', countClass: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
                  { key: 'inProgress', label: 'In Progress', list: tasks.inProgress ?? [], headerClass: 'text-amber-700 dark:text-amber-400', countClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
                  { key: 'pending', label: 'Pending', list: tasks.pending ?? [], headerClass: 'text-gray-700 dark:text-gray-300', countClass: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200' },
                ];
                const totalTasks = sections.reduce((sum, s) => sum + s.list.length, 0);

                return (
                  <div className="px-5 pb-5 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-5">
                    {/* Summary strip */}
                    <div className="grid grid-cols-3 gap-3">
                      {sections.map(s => (
                        <div key={s.key} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/40 p-3 text-center">
                          <p className={`text-2xl font-bold ${s.headerClass}`}>{s.list.length}</p>
                          <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
                        </div>
                      ))}
                    </div>

                    {report.Notes && (
                      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/40 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">Notes</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{report.Notes}</p>
                      </div>
                    )}

                    {totalTasks === 0 ? (
                      <p className="text-sm text-gray-400 dark:text-gray-500 italic text-center py-4">
                        No activity recorded this week.
                      </p>
                    ) : (
                      sections.map(section => {
                        if (section.list.length === 0) return null;
                        const groups = groupByCategory(section.list);
                        return (
                          <div key={section.key}>
                            <div className="flex items-center gap-2 mb-3">
                              <h4 className={`text-sm font-semibold ${section.headerClass}`}>
                                {section.label}
                              </h4>
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${section.countClass}`}>
                                {section.list.length}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {groups.map(([category, items]) => (
                                <div
                                  key={category}
                                  className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 p-3"
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                                      {category}
                                    </span>
                                    <span className="inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 dark:text-indigo-300">
                                      {items.length}
                                    </span>
                                  </div>
                                  <ul className="space-y-1.5">
                                    {items.map((t, i) => (
                                      <li key={i} className="text-sm">
                                        <div className="flex items-start gap-1.5">
                                          <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400 dark:bg-gray-500" />
                                          <div className="min-w-0 flex-1">
                                            <span className="font-medium text-gray-900 dark:text-gray-100 break-words">
                                              {t.title || <span className="italic text-gray-400">(no title)</span>}
                                            </span>
                                            {t.ticketId !== undefined && t.ticketId !== null && (
                                              <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:text-blue-300">
                                                #T{t.ticketId}
                                              </span>
                                            )}
                                            {t.description && (
                                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 break-words">
                                                {t.description}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                );
              })()}
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
