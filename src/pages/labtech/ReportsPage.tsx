import { useState, useEffect, useMemo } from 'react';
import { useModal } from '@/context/ModalContext';
import {
  getReports,
  createReport,
  updateReport,
  submitReport,
  deleteReport,
} from '@/services/reports';
import type { WeeklyReport, ReportCreateInput, ReportUpdateInput } from '@/types/report';
import { reportStatusLabels, reportStatusColors } from '@/types/report';
import { WeeklyReportDialog } from '@/pages/labtech/components/WeeklyReportDialog';
import { ReportViewerModal } from '@/pages/labtech/components/ReportViewerModal';
import { FileText, Plus } from 'lucide-react';
import Table from '@/components/Table';
import { LoadingSkeleton, EmptyState } from '@/ui';
import { useReportEvents } from '@/hooks/useReportEvents';

const formatDate = (s: string) =>
  new Date(s).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

const taskTotals = (report: WeeklyReport) => {
  const t = report.Tasks ?? { completed: [], inProgress: [], pending: [] };
  return {
    completed: (t.completed ?? []).length,
    inProgress: (t.inProgress ?? []).length,
    pending: (t.pending ?? []).length,
  };
};

export default function Reports() {
  const modal = useModal();
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<WeeklyReport | null>(null);
  const [viewingReport, setViewingReport] = useState<WeeklyReport | null>(null);
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

  useReportEvents(() => {
    void loadReports();
  });

  const headers = useMemo(
    () => [
      { label: 'Week', align: 'left' as const },
      { label: 'Status', align: 'left' as const },
      { label: 'Tasks', align: 'left' as const },
      { label: 'Created', align: 'left' as const },
      { label: 'Reviewed', align: 'left' as const },
    ],
    [],
  );

  const handleOpenNew = () => {
    setEditingReport(null);
    setDialogOpen(true);
  };

  const handleEditFromModal = (report: WeeklyReport) => {
    setViewingReport(null);
    setEditingReport(report);
    setDialogOpen(true);
  };

  const handleSave = async (
    input: ReportCreateInput | ReportUpdateInput,
    submitNow = false,
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

  const handleDeleteDraft = async (report: WeeklyReport) => {
    const ok = await modal.showConfirm(
      `Delete draft for ${formatDate(report.Week_Start)} – ${formatDate(report.Week_End)}? This cannot be undone.`,
      'Delete Draft',
    );
    if (!ok) return;
    setDeletingId(report.Report_ID);
    try {
      await deleteReport(report.Report_ID);
      setReports(prev => prev.filter(r => r.Report_ID !== report.Report_ID));
      if (viewingReport?.Report_ID === report.Report_ID) setViewingReport(null);
    } catch (err) {
      console.error('Failed to delete draft:', err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex h-full w-full flex-col bg-white p-6 dark:bg-gray-900 sm:px-8 lg:px-10">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Weekly Reports</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Submit and track your weekly activity reports
          </p>
        </div>
        <button
          onClick={handleOpenNew}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          New Report
        </button>
      </div>

      {/* Reports list */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex shrink-0 items-center gap-3 border-b border-gray-200 px-6 py-4 dark:border-[#334155]">
          <div className="rounded-lg bg-indigo-100 p-2 dark:bg-indigo-900/30">
            <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">My Reports</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {reports.length} report{reports.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        <div className="flex min-h-0 flex-1">
          {isLoading ? (
            <LoadingSkeleton type="table-rows" columns={5} rows={4} className="flex-1" />
          ) : (
            <Table headers={headers} columnWidths="1.4fr 0.8fr 1.6fr 0.9fr 0.9fr" density="compact">
              {reports.length === 0 ? (
                <div data-full-row className="flex flex-1 items-center justify-center py-12">
                  <EmptyState
                    icon={FileText}
                    title="No reports yet"
                    description='Click "New Report" to create your first weekly report.'
                    action={{ label: 'New Report', onClick: handleOpenNew }}
                  />
                </div>
              ) : (
                reports.map(report => {
                  const totals = taskTotals(report);
                  return (
                    <div
                      key={report.Report_ID}
                      role="button"
                      tabIndex={0}
                      onClick={() => setViewingReport(report)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setViewingReport(report);
                        }
                      }}
                      className="cursor-pointer transition-colors hover:bg-gray-50 focus:bg-gray-100 focus:outline-none dark:hover:bg-gray-800/50 dark:focus:bg-gray-800"
                    >
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatDate(report.Week_Start)} – {formatDate(report.Week_End)}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${reportStatusColors[report.Status]}`}
                      >
                        {reportStatusLabels[report.Status]}
                      </span>
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="inline-flex items-center gap-1 rounded-md bg-green-100 px-1.5 py-0.5 font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
                          {totals.completed} done
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md bg-yellow-100 px-1.5 py-0.5 font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
                          {totals.inProgress} in progress
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-1.5 py-0.5 font-medium text-gray-700 dark:bg-gray-700/50 dark:text-gray-300">
                          {totals.pending} pending
                        </span>
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(report.Created_At)}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {report.Reviewed_At ? formatDate(report.Reviewed_At) : '—'}
                      </span>
                    </div>
                  );
                })
              )}
            </Table>
          )}
        </div>
      </div>

      <WeeklyReportDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        existing={editingReport}
      />

      <ReportViewerModal
        isOpen={viewingReport !== null}
        onClose={() => setViewingReport(null)}
        report={viewingReport}
        onEdit={handleEditFromModal}
        onDelete={handleDeleteDraft}
        isDeleting={deletingId !== null && deletingId === viewingReport?.Report_ID}
      />
    </div>
  );
}
