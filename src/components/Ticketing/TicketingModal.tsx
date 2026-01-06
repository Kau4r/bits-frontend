import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Ticket, TicketStatus, TicketPriority, TicketCategory } from '@/types/tickets';
import { createTicket, updateTicket } from '@/services/tickets';
import { getRooms } from '@/services/room';
import type { Room } from '@/types/room';
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
  const [rooms, setRooms] = useState<Room[]>([]);
  const [formData, setFormData] = useState({
    reportProblem: '',
    location: '',
    itemId: undefined as number | undefined,
    roomId: undefined as number | undefined,
  });
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Clear feedback after 3 seconds
  useEffect(() => {
    if (feedbackMessage) {
      const timer = setTimeout(() => setFeedbackMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [feedbackMessage]);

  // Fetch rooms on mount
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const data = await getRooms();
        setRooms(data);
      } catch (err) {
        console.error('Failed to fetch rooms', err);
      }
    };
    if (isOpen) {
      fetchRooms();
    }
  }, [isOpen]);

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
        roomId: ticket.Room_ID || undefined,
      });
    }

    if (isCreating) {
      setStatus('PENDING');
      setPriority('');
      setCategory('');
      setFormData({ reportProblem: '', location: '', itemId: undefined, roomId: undefined });
    }
  }, [ticket, isCreating]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Find room ID if location matches a room name
      const selectedRoom = rooms.find(r => r.Name === formData.location);
      const roomId = selectedRoom ? selectedRoom.Room_ID : formData.roomId;

      if (isCreating) {
        const newTicket = await createTicket({
          Reported_By_ID: user?.User_ID ?? 0,
          Report_Problem: formData.reportProblem,
          Location: formData.location || undefined,
          Item_ID: formData.itemId,
          Room_ID: roomId,
          Status: 'PENDING',
          Priority: priority || undefined,
          Category: category || undefined,
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

          {/* Feedback Message */}
          {feedbackMessage && (
            <div className={`mb-4 rounded-md p-3 text-sm font-medium ${feedbackMessage.type === 'success'
              ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300'
              : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'
              }`}>
              {feedbackMessage.text}
            </div>
          )}

          {/* Ticket Meta Info */}
          {ticket && !isCreating && (
            <div className="mb-6 grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-700/50">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Date Reported</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {new Date(ticket.Created_At).toLocaleDateString()}
                  <span className="ml-1 text-xs text-gray-500">
                    {new Date(ticket.Created_At).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </p>
              </div>

              {ticket.Status === 'RESOLVED' && (
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Date Resolved</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {new Date(ticket.Updated_At).toLocaleDateString()}
                    <span className="ml-1 text-xs text-gray-500">
                      {new Date(ticket.Updated_At).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </p>
                </div>
              )}

              <div className="flex justify-between items-start col-span-2">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Technician Assigned</p>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {ticket.Technician?.First_Name ? `${ticket.Technician.First_Name} ${ticket.Technician.Last_Name}` : 'None'}
                    </p>

                    {/* Unassign Button */}
                    {['LAB_TECH', 'LAB_HEAD', 'ADMIN'].includes(user?.User_Role ?? '') && ticket.Technician?.User_ID && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (!ticket) return;
                          try {
                            const updated = await updateTicket(ticket.Ticket_ID, {
                              Technician_ID: null as any, // Cast to any to bypass strict type check if needed, or update type
                              Status: 'PENDING'
                            });
                            onUpdate(updated);
                            setStatus('PENDING');
                            setFeedbackMessage({ text: 'Ticket unassigned successfully', type: 'success' });
                          } catch (err) {
                            console.error("Failed to unassign ticket", err);
                            setFeedbackMessage({ text: 'Failed to unassign ticket', type: 'error' });
                          }
                        }}
                        className="text-xs text-red-600 hover:text-red-800 hover:underline"
                      >
                        (Unassign)
                      </button>
                    )}
                  </div>
                </div>

                {/* Assign to Me Button */}
                {['LAB_TECH', 'LAB_HEAD', 'ADMIN'].includes(user?.User_Role ?? '') && !ticket.Technician?.User_ID && ticket.Status !== 'RESOLVED' && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!ticket || !user) return;
                      try {
                        const updated = await updateTicket(ticket.Ticket_ID, {
                          Status: 'IN_PROGRESS',
                          Technician_ID: user.User_ID
                        });
                        onUpdate(updated);
                        setStatus('IN_PROGRESS'); // Update local state immediately
                        setFeedbackMessage({ text: 'Ticket assigned to you successfully', type: 'success' });
                      } catch (err) {
                        console.error("Failed to assign ticket", err);
                        setFeedbackMessage({ text: 'Failed to assign ticket', type: 'error' });
                      }
                    }}
                    className="text-xs bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-2 py-1 rounded border border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-700 dark:hover:bg-indigo-900/50"
                  >
                    Assign to Me
                  </button>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Category - First Position */}
            {canEditTicketDetails && (
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

            {/* Location with Room Suggestions - Second Position */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Location</label>
              <input
                list="room-suggestions"
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Select a room or type location..."
              />
              <datalist id="room-suggestions">
                {rooms.map((room) => (
                  <option key={room.Room_ID} value={room.Name} />
                ))}
              </datalist>
            </div>

            {/* Priority - Third Position */}
            {canEditTicketDetails && (
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

            {/* Report Description - Fourth Position */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Report Description
              </label>
              <textarea
                rows={4}
                value={formData.reportProblem}
                onChange={(e) => setFormData({ ...formData, reportProblem: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
              />
            </div>

            {/* Status (Only for existing tickets) */}
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
