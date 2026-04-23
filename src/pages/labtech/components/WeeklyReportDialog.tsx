import { useState, useEffect, useRef } from 'react';
import type { FC, FormEvent } from 'react';
import type { WeeklyReport, ReportCreateInput, ReportUpdateInput, ReportTask, ReportTasks, TaskStatus } from '@/types/report';
import { taskCategoryOptions } from '@/types/report';
import { getAutoPopulateTickets } from '@/services/reports';
import { FloatingSelect } from '@/ui/FloatingSelect';
import { Plus, X, Loader2, RefreshCw } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (input: ReportCreateInput | ReportUpdateInput, submitNow?: boolean) => Promise<void>;
  existing?: WeeklyReport | null;
}

type SectionKey = 'completed' | 'pending' | 'inProgress';

const SECTION_KEYS: readonly SectionKey[] = ['completed', 'inProgress', 'pending'] as const;

const emptyTask = (status: TaskStatus = 'completed'): ReportTask => ({
  title: '',
  description: '',
  status,
  category: 'Maintenance',
});

const getMonday = (d: Date) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return date;
};

const toDateInput = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Unique merge key for a task. Audit-derived tasks merge by auditLogId; legacy
// ticket tasks without auditLogId merge by ticketId; everything else is manual.
const mergeKey = (t: ReportTask): string | null => {
  if (t.auditLogId !== undefined && t.auditLogId !== null) return `audit:${t.auditLogId}`;
  if (t.ticketId !== undefined && t.ticketId !== null) return `ticket:${t.ticketId}`;
  return null;
};

// Merge freshly-fetched audit-derived tasks into an existing ReportTasks tree.
// Rules:
//  - Manual tasks (no merge key) are preserved as-is.
//  - For tasks with a merge key, remove any existing entry with the same key in
//    any section, then place the fresh one in the section the backend reported.
const mergeAuditTasks = (
  base: ReportTasks,
  fetched: { completed: ReportTask[]; inProgress: ReportTask[]; pending: ReportTask[] },
): ReportTasks => {
  // Collect merge keys for tasks the user has locally edited — we must NOT
  // overwrite those on re-poll, so the user's annotations survive.
  const userEditedKeys = new Set<string>();
  SECTION_KEYS.forEach(s => {
    base[s].forEach(t => {
      if (t.userEdited) {
        const k = mergeKey(t);
        if (k) userEditedKeys.add(k);
      }
    });
  });

  const incomingKeys = new Set<string>();
  SECTION_KEYS.forEach(s => {
    (fetched[s] || []).forEach(t => {
      const k = mergeKey(t);
      if (k) incomingKeys.add(k);
    });
  });

  // Strip entries whose merge key is in `incomingKeys` UNLESS the user edited
  // them locally — those are preserved as-is.
  const stripped: ReportTasks = {
    completed: base.completed.filter(t => {
      const k = mergeKey(t);
      return !k || !incomingKeys.has(k) || userEditedKeys.has(k);
    }),
    inProgress: base.inProgress.filter(t => {
      const k = mergeKey(t);
      return !k || !incomingKeys.has(k) || userEditedKeys.has(k);
    }),
    pending: base.pending.filter(t => {
      const k = mergeKey(t);
      return !k || !incomingKeys.has(k) || userEditedKeys.has(k);
    }),
  };

  // Append fresh audit-derived tasks with the correct status, skipping any
  // that collide with a user-edited existing task.
  SECTION_KEYS.forEach(section => {
    (fetched[section] || []).forEach(t => {
      const k = mergeKey(t);
      if (k && userEditedKeys.has(k)) return;
      stripped[section].push({ ...t, status: section });
    });
  });

  return stripped;
};

const sectionMeta: Record<SectionKey, { label: string; headingClass: string; emptyLabel: string }> = {
  completed: {
    label: 'Completed',
    headingClass: 'text-green-700 dark:text-green-400',
    emptyLabel: 'No completed tasks',
  },
  inProgress: {
    label: 'In Progress',
    headingClass: 'text-amber-700 dark:text-amber-400',
    emptyLabel: 'No in-progress tasks',
  },
  pending: {
    label: 'Pending',
    headingClass: 'text-gray-700 dark:text-gray-400',
    emptyLabel: 'No pending tasks',
  },
};

export const WeeklyReportDialog: FC<Props> = ({ open, onClose, onSave, existing }) => {
  const monday = getMonday(new Date());
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);

  const [weekStart, setWeekStart] = useState(toDateInput(monday));
  const [weekEnd, setWeekEnd] = useState(toDateInput(sunday));
  const [notes, setNotes] = useState('');
  const [tasks, setTasks] = useState<ReportTasks>({
    completed: [],
    pending: [],
    inProgress: [],
  });
  const [saving, setSaving] = useState(false);
  const [isAutoPopulating, setIsAutoPopulating] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);

  // Ref used by the polling effect to avoid firing when another call is in
  // flight (isAutoPopulating is state and updates asynchronously).
  const inFlightRef = useRef(false);

  // Initialize + auto-populate in ONE effect so the API call is never racing
  // against the "hydrate state from existing draft" update.
  useEffect(() => {
    if (!open) return;

    let ws: string;
    let we: string;
    let baseTasks: ReportTasks;
    let baseNotes: string;

    if (existing) {
      ws = existing.Week_Start.slice(0, 10);
      we = existing.Week_End.slice(0, 10);
      baseTasks = existing.Tasks as ReportTasks;
      baseNotes = existing.Notes ?? '';
    } else {
      ws = toDateInput(monday);
      we = toDateInput(sunday);
      baseTasks = { completed: [], pending: [], inProgress: [] };
      baseNotes = '';
    }

    setWeekStart(ws);
    setWeekEnd(we);
    setNotes(baseNotes);
    setTasks(baseTasks);
    setSaving(false);
    setEditingKey(null);

    if (existing && existing.Status !== 'DRAFT') return;

    let cancelled = false;
    (async () => {
      inFlightRef.current = true;
      setIsAutoPopulating(true);
      try {
        const data = await getAutoPopulateTickets(ws, we);
        if (cancelled) return;
        setTasks(prev => mergeAuditTasks(prev, data));
      } catch (err) {
        console.error('Failed to auto-populate:', err);
      } finally {
        if (!cancelled) setIsAutoPopulating(false);
        inFlightRef.current = false;
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existing]);

  // Re-pull when the week range changes after the dialog is already open.
  useEffect(() => {
    if (!open) return;
    if (existing && existing.Status !== 'DRAFT') return;

    const isFromExisting =
      existing &&
      weekStart === existing.Week_Start.slice(0, 10) &&
      weekEnd === existing.Week_End.slice(0, 10);
    const isFromDefault =
      !existing &&
      weekStart === toDateInput(monday) &&
      weekEnd === toDateInput(sunday);
    if (isFromExisting || isFromDefault) return;

    let cancelled = false;
    (async () => {
      inFlightRef.current = true;
      setIsAutoPopulating(true);
      try {
        const data = await getAutoPopulateTickets(weekStart, weekEnd);
        if (cancelled) return;
        setTasks(prev => mergeAuditTasks(prev, data));
      } catch (err) {
        console.error('Failed to re-populate for new week:', err);
      } finally {
        if (!cancelled) setIsAutoPopulating(false);
        inFlightRef.current = false;
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart, weekEnd]);

  // Real-time polling: every 60s while dialog is open (drafts/new only).
  useEffect(() => {
    if (!open) return;
    if (existing && existing.Status !== 'DRAFT') return;

    const id = window.setInterval(async () => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        const data = await getAutoPopulateTickets(weekStart, weekEnd);
        setTasks(prev => mergeAuditTasks(prev, data));
      } catch (err) {
        console.error('Polling auto-populate failed:', err);
      } finally {
        inFlightRef.current = false;
      }
    }, 20_000);

    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existing, weekStart, weekEnd]);

  if (!open) return null;

  // Identity key for React rendering AND inline-edit tracking. Falls back to a
  // per-section + index composite when no merge key is available (manual tasks).
  const taskKey = (section: SectionKey, t: ReportTask, idx: number): string => {
    const mk = mergeKey(t);
    return mk ? `${section}:${mk}` : `${section}:manual:${idx}`;
  };

  const addTaskToCompleted = () => {
    setTasks(prev => ({
      ...prev,
      completed: [...prev.completed, emptyTask('completed')],
    }));
  };

  // On-demand refresh so users don't have to wait for the 60s poll to pick up
  // activity (e.g. a ticket they just resolved in another tab).
  const refreshAuditTasks = async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setIsAutoPopulating(true);
    try {
      const data = await getAutoPopulateTickets(weekStart, weekEnd);
      setTasks(prev => mergeAuditTasks(prev, data));
    } catch (err) {
      console.error('Manual refresh failed:', err);
    } finally {
      setIsAutoPopulating(false);
      inFlightRef.current = false;
    }
  };

  const updateTask = (
    section: SectionKey,
    idx: number,
    field: keyof ReportTask,
    value: string | number,
  ) => {
    setTasks(prev => ({
      ...prev,
      [section]: prev[section].map((t, i) =>
        // Mark as userEdited so the real-time poll doesn't clobber it.
        i === idx ? { ...t, [field]: value, userEdited: true } : t,
      ),
    }));
  };

  const removeTask = (section: SectionKey, idx: number) => {
    setTasks(prev => ({
      ...prev,
      [section]: prev[section].filter((_, i) => i !== idx),
    }));
  };

  // Move a task between sections (cheap way to let users reclassify without
  // dragging). Status is updated to match the new section.
  const moveTask = (fromSection: SectionKey, idx: number, toSection: SectionKey) => {
    if (fromSection === toSection) return;
    setTasks(prev => {
      const moving = prev[fromSection][idx];
      if (!moving) return prev;
      return {
        ...prev,
        [fromSection]: prev[fromSection].filter((_, i) => i !== idx),
        [toSection]: [...prev[toSection], { ...moving, status: toSection }],
      };
    });
  };

  const buildInput = (): ReportCreateInput => ({
    weekStart,
    weekEnd,
    tasks,
    notes: notes || undefined,
  });

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      await onSave(buildInput(), false);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(buildInput(), true);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const totalCount = tasks.completed.length + tasks.inProgress.length + tasks.pending.length;

  const renderSection = (section: SectionKey) => {
    const items = tasks[section];
    const meta = sectionMeta[section];

    // Group tasks within this section by category so auditing is scannable
    // (all "Tickets" together, all "Borrowing" together, etc.). Preserve each
    // task's ORIGINAL array index so updateTask/removeTask/moveTask still work.
    const grouped = new Map<string, Array<{ task: ReportTask; idx: number }>>();
    items.forEach((task, idx) => {
      const cat = task.category || 'Other';
      const arr = grouped.get(cat);
      if (arr) arr.push({ task, idx });
      else grouped.set(cat, [{ task, idx }]);
    });
    // Sort groups: follow taskCategoryOptions order, unknown categories last.
    const categoryOrder = taskCategoryOptions as readonly string[];
    const sortedCategories = Array.from(grouped.keys()).sort((a, b) => {
      const ai = categoryOrder.indexOf(a);
      const bi = categoryOrder.indexOf(b);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });

    const renderCard = (task: ReportTask, idx: number) => {
      const key = taskKey(section, task, idx);
      const isEditing = editingKey === key;
      return (
        <div
          key={key}
          className="group rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 dark:border-gray-700 dark:bg-gray-800"
        >
                  <div className="flex items-center gap-1.5">
                    {isEditing ? (
                      <FloatingSelect
                        id={`weekly-report-task-category-${key}`}
                        value={task.category}
                        placeholder="Category"
                        options={taskCategoryOptions.map(c => ({ value: c, label: c }))}
                        onChange={value => updateTask(section, idx, 'category', value)}
                        className="w-28 shrink-0"
                        buttonClassName="rounded px-2 py-1 text-xs"
                      />
                    ) : (
                      <span className="shrink-0 rounded-full bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                        {task.category}
                      </span>
                    )}
                    {isEditing ? (
                      <input
                        type="text"
                        placeholder="Task title"
                        value={task.title}
                        onChange={e => updateTask(section, idx, 'title', e.target.value)}
                        required
                        className="min-w-0 flex-1 rounded border border-gray-300 bg-white p-1 px-2 text-xs text-gray-900 dark:border-[#334155] dark:bg-[#1e2939] dark:text-white"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditingKey(key)}
                        className="min-w-0 flex-1 truncate text-left text-xs font-medium text-gray-900 dark:text-white"
                        title={task.title || '(no title) — click to edit'}
                      >
                        {task.title || <span className="italic text-gray-400">(no title)</span>}
                      </button>
                    )}
                    {task.ticketId !== undefined && task.ticketId !== null && (
                      <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        #T{task.ticketId}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeTask(section, idx)}
                      className="shrink-0 p-0.5 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      aria-label="Remove task"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {isEditing ? (
                    <input
                      type="text"
                      placeholder="Description (optional)"
                      value={task.description}
                      onChange={e => updateTask(section, idx, 'description', e.target.value)}
                      onBlur={() => setEditingKey(null)}
                      autoFocus={!task.title}
                      className="mt-1 w-full rounded border border-gray-200 bg-white px-2 py-0.5 text-[11px] text-gray-700 placeholder:text-gray-400 dark:border-[#334155] dark:bg-[#1e2939] dark:text-gray-300"
                    />
                  ) : (
                    task.description ? (
                      <p
                        className="mt-0.5 truncate text-[11px] text-gray-600 dark:text-gray-400"
                        title={task.description}
                      >
                        {task.description}
                      </p>
                    ) : null
                  )}
                  {isEditing && (
                    <div className="mt-1 flex items-center gap-1 text-[10px]">
                      <span className="text-gray-500 dark:text-gray-400">Move to:</span>
                      {SECTION_KEYS.filter(s => s !== section).map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => {
                            moveTask(section, idx, s);
                            setEditingKey(null);
                          }}
                          className="rounded bg-gray-200 px-1.5 py-0.5 font-medium text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                        >
                          {sectionMeta[s].label}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setEditingKey(null)}
                        className="ml-auto rounded bg-indigo-600 px-1.5 py-0.5 font-medium text-white hover:bg-indigo-700"
                      >
                        Done
                      </button>
                    </div>
                  )}
                </div>
      );
    };

    return (
      <div key={section} className="mb-4">
        <div className={`mb-2 text-sm font-semibold ${meta.headingClass}`}>
          {meta.label} ({items.length})
        </div>
        {items.length === 0 ? (
          <div className="rounded-md border border-dashed border-gray-200 bg-gray-50/50 px-3 py-2 text-center text-xs text-gray-400 dark:border-gray-700 dark:bg-gray-800/30 dark:text-gray-500">
            {meta.emptyLabel}
          </div>
        ) : (
          <div className="space-y-3">
            {sortedCategories.map(cat => {
              const entries = grouped.get(cat) || [];
              return (
                <div key={cat}>
                  <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    <span>{cat}</span>
                    <span className="rounded-full bg-gray-200 px-1.5 py-[1px] text-[9px] font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                      {entries.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {entries.map(({ task, idx }) => renderCard(task, idx))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 grid place-items-center p-4 z-50 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-6 shadow-xl my-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            {existing ? 'Edit Weekly Report' : 'New Weekly Report'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Close"
            type="button"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Week range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Week Start
              </label>
              <input
                type="date"
                value={weekStart}
                onChange={e => setWeekStart(e.target.value)}
                required
                className="w-full rounded-md border border-gray-300 dark:border-[#334155] bg-white dark:bg-[#1e2939] text-gray-900 dark:text-white p-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Week End
              </label>
              <input
                type="date"
                value={weekEnd}
                onChange={e => setWeekEnd(e.target.value)}
                required
                className="w-full rounded-md border border-gray-300 dark:border-[#334155] bg-white dark:bg-[#1e2939] text-gray-900 dark:text-white p-2 text-sm"
              />
            </div>
          </div>

          {/* Tasks header */}
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tasks ({totalCount})
                </label>
                {isAutoPopulating && (
                  <span className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Syncing activity...
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={refreshAuditTasks}
                  disabled={isAutoPopulating}
                  className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
                  title="Pull the latest activity from the audit log"
                >
                  <RefreshCw className={`h-3 w-3 ${isAutoPopulating ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={addTaskToCompleted}
                  className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-700"
                >
                  <Plus className="h-3 w-3" />
                  Add Task
                </button>
              </div>
            </div>

            <div className="max-h-[22rem] overflow-y-auto pr-1">
              {renderSection('completed')}
              {renderSection('inProgress')}
              {renderSection('pending')}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Any additional notes..."
              className="w-full rounded-md border border-gray-300 dark:border-[#334155] bg-white dark:bg-[#1e2939] text-gray-900 dark:text-white p-2 text-sm resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              Save Draft
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
