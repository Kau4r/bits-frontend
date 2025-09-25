import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Ticket, TicketStatus, TicketPriority, TicketCategory } from '@/types/tickets';
import { createTicket, updateTicket } from '@/services/tickets';
import { useAuth } from '@/context/AuthContext';

interface TicketingModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: Ticket | null;
  onUpdate: (updatedTicket: Ticket) => void;
  isCreating: boolean;
}

export default function TicketingModal({
  isOpen,
  onClose,
  ticket,
  onUpdate,
  isCreating,
}: TicketingModalProps) {
  const { user } = useAuth();
  const canEditTicketDetails = ['LAB_TECH', 'LAB_HEAD', 'FACULTY'].includes(user?.User_Role ?? '');

  const [status, setStatus] = useState<TicketStatus>('PENDING');
  const [priority, setPriority] = useState<TicketPriority | ''>('');
  const [category, setCategory] = useState<TicketCategory | ''>('');
  const [formData, setFormData] = useState({
    reportProblem: '',
    location: '',
    itemId: undefined as number | undefined,
  });

  // Populate form when editing or creating
  useEffect(() => {
    if (ticket && !isCreating) {
      setStatus(ticket.Status);
      setPriority(ticket.Priority || '');
      setCategory(ticket.Category || '');
      setFormData({
        reportProblem: ticket.Report_Problem,
        location: ticket.Location || '',
        itemId: ticket.Item?.Item_ID,
      });
    }

    if (isCreating) {
      setStatus('PENDING');
      setPriority('');
      setCategory('');
      setFormData({ reportProblem: '', location: '', itemId: undefined });
    }
  }, [ticket, isCreating]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (isCreating) {
        const newTicket = await createTicket({
          Reported_By_ID: user?.User_ID ?? 0,
          Report_Problem: formData.reportProblem,
          Location: formData.location || undefined,
          Item_ID: formData.itemId,
          Status: 'PENDING',
        });
        onUpdate(newTicket);
      } else if (ticket) {
        const updatedTicket = await updateTicket(ticket.Ticket_ID, {
          Status: status,
          ...(canEditTicketDetails ? { Priority: priority || undefined, Category: category || undefined } : {}),
        });
        onUpdate(updatedTicket);
      }

    } catch (err) {
      console.error('Error saving ticket', err);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {isCreating ? 'Report New Issue' : ticket ? `Ticket #${ticket.Ticket_ID}` : 'Loading...'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Report Problem */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Report Problem
              </label>
              <textarea
                rows={4}
                value={formData.reportProblem}
                onChange={(e) => setFormData({ ...formData, reportProblem: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            {/* Status */}
            {!isCreating && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TicketStatus)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="PENDING">Pending</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved</option>
                </select>
              </div>
            )}

            {/* Priority */}
            {!isCreating && canEditTicketDetails && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TicketPriority)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">Select Priority</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>
            )}

            {/* Category */}
            {!isCreating && canEditTicketDetails && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as TicketCategory)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">Select Category</option>
                  <option value="HARDWARE">Hardware</option>
                  <option value="SOFTWARE">Software</option>
                  <option value="FACILITY">Facility</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            )}

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {isCreating ? 'Create Ticket' : 'Update Ticket'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
