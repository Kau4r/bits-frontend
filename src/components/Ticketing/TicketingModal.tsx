import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export interface Ticket {
  id: number;
  reportedBy: string;
  role: string;
  dateReported: string;
  location: string;
  type: string;
  assetCode: string;
  status: 'Pending' | 'In Progress' | 'Resolved';
  details: string;
  technician?: string;
  isArchived?: boolean;
}

interface TicketingModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: Ticket | null;
  onUpdate: (updatedTicket: Ticket) => void;
  isCreating: boolean;
}

const mockTechnicians = [
  { id: 1, name: 'John Tech' },
  { id: 2, name: 'Sarah Engineer' },
  { id: 3, name: 'Mike Specialist' },
];

export default function TicketingModal({ isOpen, onClose, ticket, onUpdate, isCreating }: TicketingModalProps) {
  const [status, setStatus] = useState<'Pending' | 'In Progress' | 'Resolved'>('Pending');
  const [assignedTechnician, setAssignedTechnician] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    location: '',
    type: '',
    assetCode: '',
    details: ''
  });

  useEffect(() => {
    if (ticket && !isCreating) {
      setStatus(ticket.status);
      setAssignedTechnician(ticket.technician || '');
    }
    if (isCreating) {
      setFormData({ location: '', type: '', assetCode: '', details: '' });
    }
  }, [ticket, isCreating]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    setIsSubmitting(true);

    const updatedTicket = isCreating
      ? {
          id: Date.now(),
          reportedBy: 'Current User',
          role: 'Lab Tech',
          dateReported: new Date().toISOString(),
          location: formData.location,
          type: formData.type,
          status: 'Pending',
          details: formData.details,
          assetCode: formData.assetCode,
          isArchived: false
        }
      : {
          ...ticket!,
          status,
          technician: assignedTechnician || ticket?.technician,
        };

    onUpdate(updatedTicket as Ticket);
    
    // Reset form if this was a new ticket
    if (isCreating) {
      setFormData({
        location: '',
        type: '',
        assetCode: '',
        details: ''
      });
    }
    
    setIsSubmitting(false);
    onClose();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose}></div>
        <div className="relative w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800 overflow-visible">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {isCreating ? 'Report New Issue' : ticket?.id ? `Ticket #${ticket.id}` : 'Loading...'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <form onSubmit={handleSubmit} className="space-y-4">
              {isCreating ? (
                <>
                  <div>
                    <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Location</label>
                    <input
                      type="text"
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
                    <select
                      id="type"
                      value={formData.type}
                      onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      required
                    >
                      <option value="">Select type...</option>
                      <option value="Computer">Computer</option>
                      <option value="Keyboard">Keyboard</option>
                      <option value="Monitor">Monitor</option>
                      <option value="Printer">Printer</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="assetCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Asset Code</label>
                    <input
                      type="text"
                      id="assetCode"
                      value={formData.assetCode}
                      onChange={(e) => setFormData(prev => ({ ...prev, assetCode: e.target.value }))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="details" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Details</label>
                    <textarea
                      id="details"
                      value={formData.details}
                      onChange={(e) => setFormData(prev => ({ ...prev, details: e.target.value }))}
                      rows={4}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      required
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Reported By</p>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">{ticket?.reportedBy}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Role</p>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">{ticket?.role}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Date Reported</p>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">{formatDate(ticket?.dateReported || '')}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Type</p>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">{ticket?.type}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Asset Code</p>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">{ticket?.assetCode}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Location</p>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">{ticket?.location}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Report Description</p>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white whitespace-pre-line">{ticket?.details}</p>
                  </div>

                  <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                    <select
                      id="status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as 'Pending' | 'In Progress' | 'Resolved')}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                  </div>

                  {(status === 'In Progress' || ticket?.technician) && (
                    <div>
                      <label htmlFor="technician" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Technician</label>
                      <select
                        id="technician"
                        value={assignedTechnician}
                        onChange={(e) => setAssignedTechnician(e.target.value)}
                        disabled={!!ticket?.technician}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      >
                        {!ticket?.technician && <option value="">Select technician</option>}
                        {mockTechnicians.map(tech => (
                          <option key={tech.id} value={tech.name}>{tech.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}

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
                  disabled={isSubmitting}
                  className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {isSubmitting ? (isCreating ? 'Creating...' : 'Updating...') : (isCreating ? 'Create Ticket' : 'Update')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
