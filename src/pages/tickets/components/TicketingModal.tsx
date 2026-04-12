import { useState, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';
import type { Ticket, TicketStatus, TicketPriority, TicketCategory } from '@/types/tickets';
import { createTicket, updateTicket } from '@/services/tickets';
import { getRooms } from '@/services/room';
import type { Room } from '@/types/room';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';

// Asset type for item selection
interface Asset {
  Item_ID: number;
  Item_Code: string;
  Item_Type: string;
  Brand: string | null;
  Status: string;
  Room?: { Name: string } | null;
}

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
  const canManageTicketDetails = ['LAB_TECH', 'LAB_HEAD', 'FACULTY'].includes(user?.User_Role ?? '');

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
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditingExisting, setIsEditingExisting] = useState(false);

  // Local state for optimistic UI updates on technician assignment
  const [localTechnician, setLocalTechnician] = useState<Ticket['Technician'] | null>(null);
  const assignedTechnicianId = localTechnician?.User_ID ?? ticket?.Technician_ID;
  const hasAssignedLabTech = Boolean(assignedTechnicianId) &&
    (!localTechnician || localTechnician.User_Role === 'LAB_TECH') &&
    localTechnician?.Is_Active !== false;
  const canEditExistingTicket = !isCreating && isEditingExisting && canManageTicketDetails && hasAssignedLabTech;
  const canModifyTicketFields = isCreating || canEditExistingTicket;
  const showTicketManagementFields = canManageTicketDetails || (!isCreating && (Boolean(category) || Boolean(priority)));
  const selectClassName = "w-full pl-4 pr-11 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-none disabled:cursor-not-allowed disabled:opacity-70";
  const selectStyle = { backgroundImage: 'none' };
  const selectChevronClassName = "pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 dark:text-gray-400";
  const primaryButtonClassName = `px-4 py-2 text-white rounded-lg transition-colors text-sm font-medium shadow-sm disabled:bg-gray-400 disabled:cursor-not-allowed ${isCreating || isEditingExisting
    ? 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
    : 'bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2'
    }`;

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

  // Fetch assets when category is HARDWARE and location is selected
  useEffect(() => {
    const fetchAssets = async () => {
      if (category !== 'HARDWARE') {
        setAssets([]);
        return;
      }

      // Find room ID from location
      const selectedRoom = rooms.find(r => r.Name === formData.location);

      if (!selectedRoom) {
        setAssets([]);
        return;
      }

      setIsLoadingAssets(true);
      try {
        // Get items directly linked to the room
        const inventoryResponse = await api.get<Asset[]>('/inventory', { params: { roomId: selectedRoom.Room_ID } });

        // Also get items from computers in this room
        const computersResponse = await api.get<{
          Computer_ID: number;
          Name: string;
          Items: { Item_ID: number; Item_Code: string; Item_Type: string; Brand: string | null; Status: string }[];
        }[]>('/computers', { params: { roomId: selectedRoom.Room_ID } });

        // Map computer items to Asset format
        const computerItems: Asset[] = computersResponse.data.flatMap(computer =>
          computer.Items.map(item => ({
            Item_ID: item.Item_ID,
            Item_Code: item.Item_Code,
            Item_Type: item.Item_Type,
            Brand: item.Brand,
            Status: item.Status,
            Room: { Name: selectedRoom.Name },
          }))
        );

        // Combine both sources, avoiding duplicates
        const directItems = inventoryResponse.data;
        const allItems = [...directItems];

        computerItems.forEach(ci => {
          if (!allItems.some(item => item.Item_ID === ci.Item_ID)) {
            allItems.push(ci);
          }
        });

        // Filter to show only available/defective items
        const relevantAssets = allItems.filter(item =>
          ['AVAILABLE', 'BORROWED', 'DEFECTIVE'].includes(item.Status)
        );
        setAssets(relevantAssets);
      } catch (err) {
        console.error('Failed to fetch assets', err);
      } finally {
        setIsLoadingAssets(false);
      }
    };

    if (isOpen && category === 'HARDWARE' && formData.location) {
      fetchAssets();
    } else {
      setAssets([]);
    }
  }, [isOpen, category, formData.location, rooms]);

  // Populate form when editing or creating
  useEffect(() => {
    if (ticket && !isCreating) {
      setStatus(ticket.Status);
      setPriority(ticket.Priority || '');
      setCategory(ticket.Category || '');
      setFormData({
        reportProblem: ticket.Report_Problem,
        location: ticket.Location || ticket.Room?.Name || '',
        itemId: ticket.Item?.Item_ID ?? ticket.Item_ID,
        roomId: ticket.Room_ID || undefined,
      });
      setLocalTechnician(ticket.Technician || null);
      setIsEditingExisting(false);
    }

    if (isCreating) {
      setStatus('PENDING');
      setPriority('');
      setCategory('');
      setFormData({ reportProblem: '', location: '', itemId: undefined, roomId: undefined });
      setLocalTechnician(null);
      setIsEditingExisting(false);
    }
  }, [ticket, isCreating]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!isCreating && !isEditingExisting) {
      if (!hasAssignedLabTech) {
        setFeedbackMessage({
          text: 'Assign this ticket to a Lab Tech before updating details or status.',
          type: 'error',
        });
        return;
      }
      setIsEditingExisting(true);
      return;
    }

    if (!isCreating && !hasAssignedLabTech) {
      setFeedbackMessage({
        text: 'Assign this ticket to a Lab Tech before updating details or status.',
        type: 'error',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Find room ID if location matches a room name
      const selectedRoom = rooms.find(r => r.Name === formData.location);
      const unchangedExistingLocation = !isCreating && ticket &&
        formData.location === (ticket.Location || ticket.Room?.Name || '');
      const roomId = selectedRoom
        ? selectedRoom.Room_ID
        : unchangedExistingLocation
          ? formData.roomId
          : undefined;

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
          Report_Problem: formData.reportProblem,
          Location: formData.location || null,
          Item_ID: formData.itemId ?? null,
          Room_ID: roomId ?? null,
          ...(canManageTicketDetails ? { Priority: priority || undefined, Category: category || undefined } : {}),
        });
        onUpdate(updatedTicket);
      }
      onClose();
    } catch (err) {
      console.error('Error saving ticket', err);
      setFeedbackMessage({
        text: err instanceof Error ? err.message : 'Failed to save ticket',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEnterEditMode = () => {
    if (!hasAssignedLabTech) {
      setFeedbackMessage({
        text: 'Assign this ticket to a Lab Tech before updating details or status.',
        type: 'error',
      });
      return;
    }

    if (!canManageTicketDetails) {
      setFeedbackMessage({
        text: 'You do not have permission to update this ticket.',
        type: 'error',
      });
      return;
    }

    setIsEditingExisting(true);
  };

  const primaryButtonLabel = isSubmitting
    ? 'Saving...'
    : isCreating
      ? 'Create Ticket'
      : isEditingExisting
        ? 'Save Changes'
        : hasAssignedLabTech
          ? 'Update Ticket'
          : 'Assign before updating';

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-2xl flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {isCreating ? 'Report New Issue' : ticket ? `Ticket #${ticket.Ticket_ID}` : 'Loading...'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Feedback Message */}
          {feedbackMessage && (
            <div className={`mb-6 rounded-lg p-4 text-sm font-medium ${feedbackMessage.type === 'success'
              ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-800'
              : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-800'
              }`}>
              {feedbackMessage.text}
            </div>
          )}

          {ticket && !isCreating && !isEditingExisting && (
            <div className={`mb-6 rounded-lg border p-4 text-sm font-medium ${hasAssignedLabTech
              ? 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
              : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200'
              }`}>
              {hasAssignedLabTech
                ? 'Click Update Ticket to modify details or status.'
                : 'Assign this ticket to a Lab Tech before updating details or status.'}
            </div>
          )}

          {/* Ticket Meta Info */}
          {ticket && !isCreating && (
            <div className="mb-6 grid grid-cols-2 gap-4 rounded-lg bg-gray-100 dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Date Reported</p>
                <p className="font-medium text-gray-900 dark:text-white mt-1">
                  {new Date(ticket.Created_At).toLocaleDateString()}
                  <span className="ml-1 text-xs text-gray-500">
                    {new Date(ticket.Created_At).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </p>
              </div>

              {ticket.Status === 'RESOLVED' && (
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Date Resolved</p>
                  <p className="font-medium text-gray-900 dark:text-white mt-1">
                    {new Date(ticket.Updated_At).toLocaleDateString()}
                    <span className="ml-1 text-xs text-gray-500">
                      {new Date(ticket.Updated_At).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </p>
                </div>
              )}

              <div className="flex justify-between items-start col-span-2 pt-2">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Technician Assigned</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {localTechnician?.First_Name ? `${localTechnician.First_Name} ${localTechnician.Last_Name}` : 'None'}
                    </p>

                    {/* Unassign Button */}
                    {['LAB_TECH', 'LAB_HEAD', 'ADMIN'].includes(user?.User_Role ?? '') && localTechnician?.User_ID && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (!ticket) return;
                          const previousTechnician = localTechnician;
                          setLocalTechnician(null);
                          setStatus('PENDING');
                          try {
                            const updated = await updateTicket(ticket.Ticket_ID, {
                              Technician_ID: null as any,
                              Status: 'PENDING'
                            });
                            onUpdate(updated);
                            setIsEditingExisting(false);
                            setFeedbackMessage({ text: 'Ticket unassigned successfully', type: 'success' });
                          } catch (err) {
                            setLocalTechnician(previousTechnician);
                            setStatus(ticket.Status);
                            console.error("Failed to unassign ticket", err);
                            setFeedbackMessage({ text: 'Failed to unassign ticket', type: 'error' });
                          }
                        }}
                        className="text-xs text-red-600 hover:text-red-700 hover:underline font-medium ml-2"
                      >
                        Unassign
                      </button>
                    )}
                  </div>
                </div>

                {/* Assign to Me Button */}
                {user?.User_Role === 'LAB_TECH' && !localTechnician?.User_ID && ticket.Status !== 'RESOLVED' && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!ticket || !user) return;
                      const newTechnician = {
                        User_ID: user.User_ID,
                        First_Name: user.First_Name,
                        Last_Name: user.Last_Name,
                        User_Role: user.User_Role,
                        Email: user.Email,
                        Is_Active: user.Is_Active,
                      };
                      setLocalTechnician(newTechnician);
                      setStatus('IN_PROGRESS');
                      try {
                        const updated = await updateTicket(ticket.Ticket_ID, {
                          Status: 'IN_PROGRESS',
                          Technician_ID: user.User_ID
                        });
                        onUpdate(updated);
                        setFeedbackMessage({ text: 'Ticket assigned to you successfully', type: 'success' });
                      } catch (err) {
                        setLocalTechnician(null);
                        setStatus(ticket.Status);
                        console.error("Failed to assign ticket", err);
                        setFeedbackMessage({ text: 'Failed to assign ticket', type: 'error' });
                      }
                    }}
                    className="text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-1.5 rounded-md border border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-700 dark:hover:bg-indigo-900/50 transition-colors font-medium"
                  >
                    Assign to Me
                  </button>
                )}
              </div>
            </div>
          )}

          <form id="ticket-form" onSubmit={handleSubmit} className="space-y-5">
            {/* Category - First Position */}
            {showTicketManagementFields && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Category</label>
                <div className="relative">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as TicketCategory)}
                    className={selectClassName}
                    style={selectStyle}
                    disabled={!canModifyTicketFields}
                  >
                    <option value="">Select Category</option>
                    <option value="HARDWARE">Hardware</option>
                    <option value="SOFTWARE">Software</option>
                    <option value="FACILITY">Facility</option>
                    <option value="OTHER">Other</option>
                  </select>
                  <ChevronDown className={selectChevronClassName} strokeWidth={2.25} />
                </div>
              </div>
            )}

            {/* Location with Room Suggestions - Shows for all, required for HARDWARE */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Location {category === 'HARDWARE' && <span className="text-red-500">*</span>}
              </label>
              <input
                list="room-suggestions"
                type="text"
                value={formData.location}
                onChange={(e) => {
                  setFormData({ ...formData, location: e.target.value, itemId: undefined });
                }}
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!canModifyTicketFields}
                placeholder="Select a room or type location..."
                required={category === 'HARDWARE'}
              />
              <datalist id="room-suggestions">
                {rooms.map((room) => (
                  <option key={room.Room_ID} value={room.Name} />
                ))}
              </datalist>
            </div>

            {/* Asset/Item Selector - Only for HARDWARE category after location is selected */}
            {category === 'HARDWARE' && formData.location && rooms.some(r => r.Name === formData.location) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Affected Item (Optional)
                </label>
                <div className="relative">
                  <select
                    value={formData.itemId || ''}
                    onChange={(e) => setFormData({ ...formData, itemId: e.target.value ? parseInt(e.target.value) : undefined })}
                    className={selectClassName}
                    style={selectStyle}
                    disabled={isLoadingAssets || !canModifyTicketFields}
                  >
                    <option value="">Select an item...</option>
                    {assets.map((asset) => (
                      <option key={asset.Item_ID} value={asset.Item_ID}>
                        {asset.Item_Code} - {asset.Item_Type.replace('_', ' ')}
                        {asset.Brand ? ` (${asset.Brand})` : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className={selectChevronClassName} strokeWidth={2.25} />
                </div>
                {isLoadingAssets && (
                  <p className="mt-1.5 text-xs text-gray-500">Loading assets from {formData.location}...</p>
                )}
                {!isLoadingAssets && assets.length === 0 && (
                  <p className="mt-1.5 text-xs text-gray-500">No items found in this room</p>
                )}
              </div>
            )}

            {/* Priority - Third Position */}
            {showTicketManagementFields && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Priority</label>
                <div className="relative">
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TicketPriority)}
                    className={selectClassName}
                    style={selectStyle}
                    disabled={!canModifyTicketFields}
                  >
                    <option value="">Select Priority</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                  <ChevronDown className={selectChevronClassName} strokeWidth={2.25} />
                </div>
              </div>
            )}

            {/* Report Description - Fourth Position */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Report Description
              </label>
              <textarea
                rows={4}
                value={formData.reportProblem}
                onChange={(e) => setFormData({ ...formData, reportProblem: e.target.value })}
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!canModifyTicketFields}
                required
                placeholder="Describe the issue in detail..."
              />
            </div>

            {/* Status (Only for existing tickets) */}
            {!isCreating && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Status</label>
                <div className="relative">
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as TicketStatus)}
                    className={selectClassName}
                    style={selectStyle}
                    disabled={!canModifyTicketFields}
                  >
                    <option value="PENDING">Pending</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="RESOLVED">Resolved</option>
                  </select>
                  <ChevronDown className={selectChevronClassName} strokeWidth={2.25} />
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium"
          >
            Cancel
          </button>
          <button
            type={isCreating || isEditingExisting ? 'submit' : 'button'}
            form={isCreating || isEditingExisting ? 'ticket-form' : undefined}
            onClick={!isCreating && !isEditingExisting ? handleEnterEditMode : undefined}
            disabled={isSubmitting || (!isCreating && (!canManageTicketDetails || (!isEditingExisting && !hasAssignedLabTech)))}
            className={primaryButtonClassName}
          >
            {primaryButtonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
