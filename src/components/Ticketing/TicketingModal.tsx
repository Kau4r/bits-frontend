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
}

interface TicketingModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: Ticket | null;
  onUpdate: (updatedTicket: Ticket) => void;
}

// Mock technicians data
const mockTechnicians = [
  { id: 1, name: 'John Tech' },
  { id: 2, name: 'Sarah Engineer' },
  { id: 3, name: 'Mike Specialist' },
];

export default function TicketingModal({ isOpen, onClose, ticket, onUpdate }: TicketingModalProps) {
  const [status, setStatus] = useState<'Pending' | 'In Progress' | 'Resolved'>('Pending');
  const [assignedTechnician, setAssignedTechnician] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when ticket changes
  useEffect(() => {
    if (ticket) {
      setStatus(ticket.status);
      setAssignedTechnician(ticket.technician || '');
    }
  }, [ticket]);

  if (!isOpen || !ticket) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      const updatedTicket = {
        ...ticket,
        status,
        technician: status === 'In Progress' && !ticket.technician 
          ? 'Current User' // In a real app, this would be the logged-in user
          : status === 'In Progress' 
            ? ticket.technician 
            : ticket.technician
      };
      onUpdate(updatedTicket);
      setIsSubmitting(false);
      onClose();
    }, 500);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose}></div>
        <div className="relative w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800 overflow-visible">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Ticket #{ticket.id}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Reported By</p>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">{ticket.reportedBy}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Role</p>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">{ticket.role}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Date Reported</p>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">{formatDate(ticket.dateReported)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Type</p>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">{ticket.type}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Asset Code</p>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">{ticket.assetCode}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Location</p>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">{ticket.location}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Report Description</p>
              <p className="mt-1 text-sm text-gray-900 dark:text-white whitespace-pre-line">{ticket.details}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 relative z-0">
              <div className="relative">
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Status
                </label>
                <div className="relative mt-1">
                  <select
                    id="status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'Pending' | 'In Progress' | 'Resolved')}
                    className="appearance-none block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white pr-10 py-2 pl-3"
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                    </svg>
                  </div>
                </div>
              </div>

              {(status === 'In Progress' || ticket.technician) && (
                <div>
                  <label htmlFor="technician" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Technician
                  </label>
                  <select
                    id="technician"
                    value={assignedTechnician}
                    onChange={(e) => setAssignedTechnician(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    disabled={!!ticket.technician}
                  >
                    {!ticket.technician && <option value="">Select a technician</option>}
                    {mockTechnicians.map((tech) => (
                      <option key={tech.id} value={tech.name}>
                        {tech.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {isSubmitting ? 'Updating...' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}