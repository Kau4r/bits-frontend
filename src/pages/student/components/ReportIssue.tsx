import { useState } from 'react';
import type { FormEvent } from 'react';
import { FloatingSelect } from '@/ui/FloatingSelect';

interface ReportIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (description: string, issueType: string, equipment: string, pcNumber: string) => Promise<void>;
  room: string;
  pcNumber: string;
}

export default function ReportIssueModal({
  isOpen,
  onClose,
  onSubmit,
  room,
  pcNumber
}: ReportIssueModalProps) {
  const [description, setDescription] = useState('');
  const [issueType, setIssueType] = useState('hardware');
  const [equipment, setEquipment] = useState('monitor');
  const isPlaceholderPc = !pcNumber || /^(unknown|n\/?a|none|-+)$/i.test(pcNumber.trim());
  const [editablePcNumber, setEditablePcNumber] = useState(isPlaceholderPc ? '' : pcNumber);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!description || !equipment) return;

    setIsSubmitting(true);
    try {
      await onSubmit(description.trim(), issueType, equipment, editablePcNumber.trim());
      setDescription('');
      setEquipment('monitor');
      setEditablePcNumber(isPlaceholderPc ? '' : pcNumber);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900 w-full max-w-md">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Report an Issue</h2>
          </div>
          <button
            onClick={onClose}
            className="text-3xl text-gray-500 hover:text-black dark:hover:text-white"
            aria-label="Close"
            disabled={isSubmitting}
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Room
            </label>
            <input
              type="text"
              value={room}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-100 dark:bg-gray-700 dark:text-gray-300 cursor-not-allowed"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              PC Number
            </label>
            <input
              type="text"
              value={editablePcNumber}
              onChange={(e) => setEditablePcNumber(e.target.value)}
              placeholder="Enter PC number"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              disabled={isSubmitting}
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Issue
            </label>
            <FloatingSelect
              id="report-issue-type"
              value={issueType}
              placeholder="Select issue"
              options={[
                { value: 'hardware', label: 'Hardware' },
                { value: 'software', label: 'Software' },
                { value: 'network', label: 'Network' },
                { value: 'other', label: 'Other' },
              ]}
              onChange={setIssueType}
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Select Equipment
            </label>
            <FloatingSelect
              id="equipment"
              value={equipment}
              placeholder="Select equipment"
              options={[
                { value: 'monitor', label: 'Monitor' },
                { value: 'keyboard', label: 'Keyboard' },
                { value: 'mouse', label: 'Mouse' },
                { value: 'system-unit', label: 'System Unit' },
                { value: 'headset', label: 'Headset' },
              ]}
              onChange={setEquipment}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Please provide detailed information about the issue..."
              required
              disabled={isSubmitting}
            />
          </div>



          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:bg-slate-900 dark:text-white dark:hover:bg-gray-800 disabled:opacity-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center justify-center w-full rounded-lg border border-transparent bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting || !description || !equipment}
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
