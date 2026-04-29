import { useEffect, useState } from 'react';
import type { FC, FormEvent } from 'react';
import { X } from 'lucide-react';
import { FloatingSelect } from '@/ui/FloatingSelect';
import type { ReportTask, TaskStatus } from '@/types/report';
import { taskCategoryOptions } from '@/types/report';

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd: (task: ReportTask, section: TaskStatus) => void;
}

const SECTION_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'completed', label: 'Completed' },
  { value: 'inProgress', label: 'In Progress' },
  { value: 'pending', label: 'Pending' },
];

export const AddTaskModal: FC<Props> = ({ open, onClose, onAdd }) => {
  const [section, setSection] = useState<TaskStatus>('completed');
  const [category, setCategory] = useState<string>('Maintenance');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setSection('completed');
      setCategory('Maintenance');
      setTitle('');
      setDescription('');
      setError('');
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Title is required.');
      return;
    }
    onAdd(
      {
        title: trimmed,
        description: description.trim(),
        status: section,
        category,
      },
      section,
    );
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 grid place-items-center p-4 z-[60]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-5 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Add Task
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Section
              </label>
              <FloatingSelect
                id="add-task-section"
                value={section}
                placeholder="Section"
                options={SECTION_OPTIONS}
                onChange={value => setSection(value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <FloatingSelect
                id="add-task-category"
                value={category}
                placeholder="Category"
                options={taskCategoryOptions.map(c => ({ value: c, label: c }))}
                onChange={value => setCategory(value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={e => {
                setTitle(e.target.value);
                if (error) setError('');
              }}
              placeholder="Task title"
              autoFocus
              className="w-full rounded-md border border-gray-300 dark:border-[#334155] bg-white dark:bg-[#1e2939] text-gray-900 dark:text-white p-2 text-sm"
            />
            {error && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Details..."
              className="w-full rounded-md border border-gray-300 dark:border-[#334155] bg-white dark:bg-[#1e2939] text-gray-900 dark:text-white p-2 text-sm resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
            >
              Add Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
