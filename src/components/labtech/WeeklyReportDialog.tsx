import React, { useState, useEffect } from 'react';
import type { WeeklyReport, ReportCreateInput, ReportUpdateInput, ReportTask, ReportTasks, AutoPopulateResponse } from '@/types/report';
import { taskCategoryOptions } from '@/types/report';
import { getAutoPopulateTickets } from '@/services/reports';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (input: ReportCreateInput | ReportUpdateInput, submitNow?: boolean) => Promise<void>;
  existing?: WeeklyReport | null;
}

const emptyTask = (): ReportTask => ({
  title: '',
  description: '',
  status: 'completed',
  category: 'Maintenance',
});

const getMonday = (d: Date) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return date;
};

const toDateInput = (d: Date) => d.toISOString().slice(0, 10);

export const WeeklyReportDialog: React.FC<Props> = ({ open, onClose, onSave, existing }) => {
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
  const [activeSection, setActiveSection] = useState<'completed' | 'pending' | 'inProgress'>('completed');
  const [isAutoPopulating, setIsAutoPopulating] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (existing) {
      setWeekStart(existing.Week_Start.slice(0, 10));
      setWeekEnd(existing.Week_End.slice(0, 10));
      setNotes(existing.Notes ?? '');
      setTasks(existing.Tasks as ReportTasks);
    } else {
      setWeekStart(toDateInput(monday));
      setWeekEnd(toDateInput(sunday));
      setNotes('');
      setTasks({ completed: [], pending: [], inProgress: [] });
    }
    setActiveSection('completed');
    setSaving(false);
  }, [open, existing]);

  // Auto-populate from tickets when creating a new report
  useEffect(() => {
    if (!open || existing) return; // Only for new reports
    const autoPopulate = async () => {
      setIsAutoPopulating(true);
      try {
        const data = await getAutoPopulateTickets(weekStart, weekEnd);
        if (data.completed.length || data.inProgress.length || data.pending.length) {
          setTasks({
            completed: data.completed.map(t => ({ ...t, status: 'completed' as const })),
            inProgress: data.inProgress.map(t => ({ ...t, status: 'inProgress' as const })),
            pending: data.pending.map(t => ({ ...t, status: 'pending' as const })),
          });
        }
      } catch (err) {
        console.error('Failed to auto-populate:', err);
      } finally {
        setIsAutoPopulating(false);
      }
    };
    autoPopulate();
  }, [open, existing, weekStart, weekEnd]);

  if (!open) return null;

  const addTask = () => {
    setTasks(prev => ({
      ...prev,
      [activeSection]: [...prev[activeSection], emptyTask()],
    }));
  };

  const updateTask = (idx: number, field: keyof ReportTask, value: string | number) => {
    setTasks(prev => {
      const updated = prev[activeSection].map((t, i) =>
        i === idx ? { ...t, [field]: value } : t
      );
      return { ...prev, [activeSection]: updated };
    });
  };

  const removeTask = (idx: number) => {
    setTasks(prev => ({
      ...prev,
      [activeSection]: prev[activeSection].filter((_, i) => i !== idx),
    }));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(buildInput(), true);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const sectionLabels: Record<'completed' | 'pending' | 'inProgress', string> = {
    completed: 'Completed',
    pending: 'Pending',
    inProgress: 'In Progress',
  };

  const currentTasks = tasks[activeSection];

  return (
    <div
      className="fixed inset-0 bg-black/40 grid place-items-center p-4 z-50 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-6 shadow-xl my-4"
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
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
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
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white p-2 text-sm"
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
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white p-2 text-sm"
              />
            </div>
          </div>

          {/* Tasks section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tasks</label>
                {isAutoPopulating && (
                  <span className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400">
                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Loading tickets...
                  </span>
                )}
              </div>
              <div className="flex gap-1 text-xs">
                {(['completed', 'pending', 'inProgress'] as const).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setActiveSection(s)}
                    className={`px-2.5 py-1 rounded-full font-medium transition-colors ${
                      activeSection === s
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {sectionLabels[s]} ({tasks[s].length})
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
              {currentTasks.length === 0 && (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
                  No {sectionLabels[activeSection].toLowerCase()} tasks. Click + Add Task to add one.
                </p>
              )}
              {currentTasks.map((task, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-3 space-y-2"
                >
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Task title"
                      value={task.title}
                      onChange={e => updateTask(idx, 'title', e.target.value)}
                      required
                      className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-1.5 text-sm"
                    />
                    <select
                      value={task.category}
                      onChange={e => updateTask(idx, 'category', e.target.value)}
                      className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-1.5 text-sm"
                    >
                      {taskCategoryOptions.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => removeTask(idx)}
                      className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1"
                      aria-label="Remove task"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Description (optional)"
                    value={task.description}
                    onChange={e => updateTask(idx, 'description', e.target.value)}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-1.5 text-sm"
                  />
                  {task.ticketId && (
                    <span className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      Ticket #{task.ticketId}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addTask}
              className="mt-2 flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Task
            </button>
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
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white p-2 text-sm resize-none"
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
