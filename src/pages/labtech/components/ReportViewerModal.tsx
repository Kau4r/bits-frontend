import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { X, Pencil, Trash2 } from 'lucide-react';
import type { WeeklyReport, ReportTask } from '@/types/report';
import { reportStatusLabels, reportStatusColors } from '@/types/report';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  report: WeeklyReport | null;
  onEdit?: (report: WeeklyReport) => void;
  onDelete?: (report: WeeklyReport) => void;
  isDeleting?: boolean;
}

type SectionKey = 'completed' | 'inProgress' | 'pending';

const SECTION_LABELS: Record<SectionKey, string> = {
  completed: 'Completed',
  inProgress: 'In Progress',
  pending: 'Pending',
};

const SECTION_COUNT_COLORS: Record<SectionKey, string> = {
  completed: 'text-green-600 dark:text-green-400',
  inProgress: 'text-yellow-600 dark:text-yellow-400',
  pending: 'text-gray-500 dark:text-gray-400',
};

const STATUS_BADGE_COLORS: Record<SectionKey, string> = {
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  inProgress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  pending: 'bg-gray-100 text-gray-800 dark:bg-gray-700/30 dark:text-gray-300',
};

const formatDate = (s: string) =>
  new Date(s).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

export const ReportViewerModal: FC<Props> = ({
  isOpen,
  onClose,
  report,
  onEdit,
  onDelete,
  isDeleting = false,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  useEffect(() => {
    if (isOpen) setActiveCategory('all');
  }, [isOpen, report?.Report_ID]);

  if (!isOpen || !report) return null;

  const tasks = (report.Tasks ?? { completed: [], inProgress: [], pending: [] }) as Record<SectionKey, ReportTask[]>;
  const sectionKeys: SectionKey[] = ['completed', 'inProgress', 'pending'];

  const allTasks: Array<{ task: ReportTask; status: SectionKey }> = [];
  sectionKeys.forEach(s => (tasks[s] ?? []).forEach(task => allTasks.push({ task, status: s })));

  const categoryCounts = allTasks.reduce<Record<string, number>>((acc, { task }) => {
    const key = task.category || 'Uncategorized';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const categories = Object.keys(categoryCounts).sort((a, b) => a.localeCompare(b));
  const currentCategory =
    activeCategory === 'all' || categoryCounts[activeCategory] ? activeCategory : 'all';
  const filteredTasks =
    currentCategory === 'all'
      ? allTasks
      : allTasks.filter(({ task }) => (task.category || 'Uncategorized') === currentCategory);

  const isDraft = report.Status === 'DRAFT';

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="flex w-full max-w-3xl max-h-[90vh] flex-col rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Weekly Report</h2>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${reportStatusColors[report.Status]}`}
              >
                {reportStatusLabels[report.Status]}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {formatDate(report.Week_Start)} – {formatDate(report.Week_End)}
              <span className="mx-2 text-gray-300 dark:text-gray-600">·</span>
              Created {formatDate(report.Created_At)}
              {report.Reviewed_At && (
                <>
                  <span className="mx-2 text-gray-300 dark:text-gray-600">·</span>
                  Reviewed {formatDate(report.Reviewed_At)}
                </>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Summary stats */}
          <div className="mb-6 grid grid-cols-3 gap-3 text-center">
            {sectionKeys.map(s => (
              <div key={s} className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
                <p className={`text-2xl font-bold ${SECTION_COUNT_COLORS[s]}`}>
                  {(tasks[s] ?? []).length}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{SECTION_LABELS[s]}</p>
              </div>
            ))}
          </div>

          {/* Tasks */}
          {allTasks.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              No tasks in this report.
            </p>
          ) : (
            <div className="mb-6">
              {/* Category tabs */}
              <div
                className="mb-3 flex flex-wrap gap-1 border-b border-gray-200 dark:border-gray-700"
                role="tablist"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={currentCategory === 'all'}
                  onClick={() => setActiveCategory('all')}
                  className={`-mb-px border-b-2 px-3 py-2 text-xs font-semibold transition-colors ${
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
                    onClick={() => setActiveCategory(cat)}
                    className={`-mb-px border-b-2 px-3 py-2 text-xs font-semibold transition-colors ${
                      currentCategory === cat
                        ? 'border-indigo-500 text-indigo-600 dark:text-indigo-300'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                  >
                    {cat} ({categoryCounts[cat]})
                  </button>
                ))}
              </div>

              <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      {currentCategory === 'all' && (
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Category
                        </th>
                      )}
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Task
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Description
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                    {filteredTasks.map(({ task, status }, i) => (
                      <tr
                        key={i}
                        className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      >
                        {currentCategory === 'all' && (
                          <td className="whitespace-nowrap px-4 py-3">
                            <span className="inline-flex items-center rounded bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                              {task.category || 'Uncategorized'}
                            </span>
                          </td>
                        )}
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                          <div className="flex items-center gap-2">
                            {task.title || (
                              <span className="italic text-gray-400">(no title)</span>
                            )}
                            {task.ticketId !== undefined && task.ticketId !== null && (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                #T{task.ticketId}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                          {task.description || '—'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE_COLORS[status]}`}
                          >
                            {SECTION_LABELS[status]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Notes */}
          {report.Notes && (
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Notes
              </h4>
              <p className="whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-sm text-gray-600 dark:bg-gray-700/50 dark:text-gray-300">
                {report.Notes}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
          {isDraft && onDelete && (
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => onDelete(report)}
              className="inline-flex items-center gap-1.5 rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              <Trash2 className="h-4 w-4" />
              {isDeleting ? 'Deleting…' : 'Delete'}
            </button>
          )}
          {isDraft && onEdit && (
            <button
              type="button"
              onClick={() => onEdit(report)}
              className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportViewerModal;
