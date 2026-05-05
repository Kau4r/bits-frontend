import { useState, useEffect, useRef } from 'react';
import type { FormEvent } from 'react';
import { X } from 'lucide-react';
import type { Ticket, TicketStatus, TicketPriority, TicketCategory } from '@/types/tickets';
import { createTicket, updateTicket } from '@/services/tickets';
import { getRooms } from '@/services/room';
import type { Room } from '@/types/room';
import { useAuth } from '@/context/AuthContext';
import { FloatingSelect } from '@/ui/FloatingSelect';
import { FloatingCombobox } from '@/ui/FloatingCombobox';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { parseTicketDescriptionTag, parseTicketTag, buildTicketDescription } from '@/lib/ticketLocation';

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
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, isOpen);
  const canManageTicketDetails = ['LAB_TECH', 'LAB_HEAD', 'FACULTY'].includes(user?.User_Role ?? '');

  const [status, setStatus] = useState<TicketStatus>('PENDING');
  const [priority, setPriority] = useState<TicketPriority | ''>('');
  const [category, setCategory] = useState<TicketCategory | ''>('');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [formData, setFormData] = useState({
    reportProblem: '',
    pcNumber: '',
    equipmentLabel: '',
    location: '',
    itemId: undefined as number | undefined,
    roomId: undefined as number | undefined,
  });
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const [editBaseline, setEditBaseline] = useState<{
    status: TicketStatus;
    priority: TicketPriority | '';
    category: TicketCategory | '';
    reportProblem: string;
    pcNumber: string;
    equipmentLabel: string;
    location: string;
    itemId: number | undefined;
  } | null>(null);

  // Local state for optimistic UI updates on technician assignment
  const [localTechnician, setLocalTechnician] = useState<Ticket['Technician'] | null>(null);
  const assignedTechnicianId = localTechnician?.User_ID ?? ticket?.Technician_ID;
  const hasAssignedLabTech = Boolean(assignedTechnicianId) &&
    (!localTechnician || localTechnician.User_Role === 'LAB_TECH') &&
    localTechnician?.Is_Active !== false;
  const canEditExistingTicket = !isCreating && isEditingExisting && canManageTicketDetails && hasAssignedLabTech;
  const canModifyTicketFields = isCreating || canEditExistingTicket;
  const showTicketManagementFields = canManageTicketDetails || (!isCreating && (Boolean(category) || Boolean(priority)));
  const editButtonClassName = "px-4 py-2 text-white rounded-xl transition-colors text-sm font-medium shadow-sm bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed";
  const activeEditButtonClassName = "px-4 py-2 text-white rounded-xl transition-colors text-sm font-medium shadow-sm bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2";
  const saveButtonClassName = "px-4 py-2 text-white rounded-xl transition-colors text-sm font-medium shadow-sm bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed";
  const readOnlyFieldClass = "w-full px-4 py-3 bg-gray-50 dark:bg-[#1e2939] border border-gray-200 dark:border-[#334155] rounded-lg text-gray-900 dark:text-white";
  const categoryLabels: Record<string, string> = { HARDWARE: 'Hardware', SOFTWARE: 'Software', FACILITY: 'Facility', OTHER: 'Other' };
  const priorityLabels: Record<string, string> = { HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' };
  const statusLabels: Record<string, string> = { PENDING: 'Pending', IN_PROGRESS: 'In Progress', RESOLVED: 'Resolved' };

  const hasTicketChanges = !isCreating && Boolean(editBaseline) && (
    status !== editBaseline?.status ||
    (priority || '') !== (editBaseline?.priority || '') ||
    (category || '') !== (editBaseline?.category || '') ||
    formData.reportProblem !== (editBaseline?.reportProblem || '') ||
    formData.pcNumber !== (editBaseline?.pcNumber || '') ||
    formData.equipmentLabel !== (editBaseline?.equipmentLabel || '') ||
    formData.location !== (editBaseline?.location || '') ||
    (formData.itemId ?? undefined) !== (editBaseline?.itemId ?? undefined)
  );

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
      // Split the stored "[Equipment · PC] body" string into editable parts so
      // the textarea shows just the body and PC has its own input.
      const parsed = parseTicketDescriptionTag(ticket.Report_Problem);
      const { equipment, pcNumber } = parseTicketTag(parsed.tag);
      setFormData({
        reportProblem: parsed.body,
        pcNumber: pcNumber ?? '',
        equipmentLabel: equipment ?? '',
        location: ticket.Location || ticket.Room?.Name || '',
        itemId: ticket.Item?.Item_ID ?? ticket.Item_ID ?? undefined,
        roomId: ticket.Room_ID ?? undefined,
      });
      setLocalTechnician(ticket.Technician || null);
      setIsEditingExisting(false);
      setEditBaseline(null);
    }

    if (isCreating) {
      setStatus('PENDING');
      setPriority('');
      setCategory('');
      setFormData({ reportProblem: '', pcNumber: '', equipmentLabel: '', location: '', itemId: undefined, roomId: undefined });
      setLocalTechnician(null);
      setIsEditingExisting(false);
      setEditBaseline(null);
    }
  }, [ticket, isCreating]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!isCreating && !isEditingExisting) {
      setFeedbackMessage({
        text: 'Click Edit before saving changes.',
        type: 'error',
      });
      return;
    }

    if (!isCreating && !hasAssignedLabTech) {
      setFeedbackMessage({
        text: 'Assign this ticket to a Lab Tech before updating details or status.',
        type: 'error',
      });
      return;
    }

    if (!isCreating && !hasTicketChanges) {
      setFeedbackMessage({
        text: 'Change the ticket details before saving.',
        type: 'error',
      });
      return;
    }

    const reportBody = formData.reportProblem.trim();
    const nextFieldErrors: Record<string, string> = {};

    if (category === 'HARDWARE' && !formData.location.trim()) {
      nextFieldErrors.location = 'Location is required for hardware tickets.';
    }

    if (!reportBody) {
      nextFieldErrors.reportProblem = 'Report description cannot be empty.';
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      return;
    }

    // Re-fold equipment + PC into the "[Equipment · PC] body" tag prefix on the
    // way out. PC only gets carried through when the category supports it.
    const supportsPc = category === 'HARDWARE' || category === 'SOFTWARE';
    const finalEquipment = formData.equipmentLabel.trim() || null;
    const finalPc = supportsPc ? (formData.pcNumber.trim() || null) : null;
    const finalDescription = buildTicketDescription(finalEquipment, finalPc, reportBody);

    setFieldErrors({});
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
        if (!user?.User_ID) {
          setFeedbackMessage({ text: 'You must be logged in to create a ticket.', type: 'error' });
          return;
        }

        const newTicket = await createTicket({
          Reported_By_ID: user.User_ID,
          Report_Problem: finalDescription,
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
          Report_Problem: finalDescription,
          Location: formData.location || null,
          Item_ID: formData.itemId ?? null,
          Room_ID: roomId ?? null,
          ...(canManageTicketDetails ? { Priority: priority || null, Category: category || null } : {}),
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

    setEditBaseline({
      status,
      priority,
      category,
      reportProblem: formData.reportProblem,
      pcNumber: formData.pcNumber,
      equipmentLabel: formData.equipmentLabel,
      location: formData.location,
      itemId: formData.itemId,
    });
    setIsEditingExisting(true);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
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
              ? 'Click Edit to modify details or status.'
                : 'Assign this ticket to a Lab Tech before updating details or status.'}
            </div>
          )}

          {ticket && !isCreating && isEditingExisting && (
            <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm font-medium text-blue-800 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
              Editing is active. Change the ticket details; Save will appear after a change.
            </div>
          )}

          {/* Ticket Meta Info */}
          {ticket && !isCreating && (
            <div className="mb-6 grid grid-cols-2 gap-4 rounded-lg bg-gray-100 dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Reported By</p>
                <p className="font-medium text-gray-900 dark:text-white mt-1 truncate">
                  {ticket.Reporter_Identifier
                    ? ticket.Reporter_Identifier
                    : `${ticket.Reported_By.First_Name} ${ticket.Reported_By.Last_Name}`}
                </p>
              </div>
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
                            setEditBaseline(null);
                            setFeedbackMessage({ text: 'Ticket unassigned successfully', type: 'success' });
                          } catch (err) {
                            setLocalTechnician(previousTechnician);
                            setStatus(ticket.Status);
                            console.error("Failed to unassign ticket", err);
                            setFeedbackMessage({ text: err instanceof Error ? err.message : 'Failed to unassign ticket', type: 'error' });
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
                        setFeedbackMessage({ text: err instanceof Error ? err.message : 'Failed to assign ticket', type: 'error' });
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

          <form id="ticket-form" onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Row 1: Status | Category */}
            {(!isCreating || showTicketManagementFields) && (
              <div className="grid grid-cols-2 gap-4">
                {!isCreating && (
                  <div className={!showTicketManagementFields ? 'col-span-2' : ''}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Status</label>
                    {canModifyTicketFields ? (
                      <FloatingSelect
                        id="ticket-status"
                        value={status}
                        placeholder="Select status"
                        options={[
                          { value: 'PENDING', label: 'Pending' },
                          { value: 'IN_PROGRESS', label: 'In Progress' },
                          { value: 'RESOLVED', label: 'Resolved' },
                        ]}
                        onChange={(value) => setStatus(value as TicketStatus)}
                      />
                    ) : (
                      <div className={readOnlyFieldClass}>{statusLabels[status] || status}</div>
                    )}
                  </div>
                )}
                {showTicketManagementFields && (
                  <div className={isCreating ? 'col-span-2' : ''}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Category</label>
                    {canModifyTicketFields ? (
                      <FloatingSelect
                        id="ticket-category"
                        value={category}
                        placeholder="Select Category"
                        options={[
                          { value: 'HARDWARE', label: 'Hardware' },
                          { value: 'SOFTWARE', label: 'Software' },
                          { value: 'FACILITY', label: 'Facility' },
                          { value: 'OTHER', label: 'Other' },
                        ]}
                        onChange={(value) => {
                          setCategory(value as TicketCategory);
                          setFieldErrors(prev => ({ ...prev, location: '' }));
                        }}
                      />
                    ) : (
                      <div className={readOnlyFieldClass}>{category ? categoryLabels[category] : 'None'}</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Row 2: Location | Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div className={!showTicketManagementFields ? 'col-span-2' : ''}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Location {category === 'HARDWARE' && <span className="text-red-500">*</span>}
                </label>
                {canModifyTicketFields ? (
                  <FloatingCombobox
                    id="ticket-location"
                    value={formData.location}
                    placeholder="Select a room or type location..."
                    options={rooms.map((room) => ({ value: room.Name, label: room.Name }))}
                    onChange={(value) => {
                      setFormData({ ...formData, location: value, itemId: undefined });
                      setFieldErrors(prev => ({ ...prev, location: '' }));
                    }}
                    required={category === 'HARDWARE'}
                  />
                ) : (
                  <div className={readOnlyFieldClass}>{formData.location || 'None'}</div>
                )}
                {fieldErrors.location && (
                  <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">{fieldErrors.location}</p>
                )}
              </div>
              {showTicketManagementFields && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Priority</label>
                  {canModifyTicketFields ? (
                    <FloatingSelect
                      id="ticket-priority"
                      value={priority}
                      placeholder="Select Priority"
                      options={[
                        { value: 'HIGH', label: 'High' },
                        { value: 'MEDIUM', label: 'Medium' },
                        { value: 'LOW', label: 'Low' },
                      ]}
                      onChange={(value) => setPriority(value as TicketPriority)}
                    />
                  ) : (
                    <div className={readOnlyFieldClass}>{priority ? priorityLabels[priority] : 'Not set'}</div>
                  )}
                </div>
              )}
            </div>

            {/* PC Number - only relevant for hardware/software issues */}
            {(category === 'HARDWARE' || category === 'SOFTWARE') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  PC <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                {canModifyTicketFields ? (
                  <input
                    type="text"
                    value={formData.pcNumber}
                    onChange={(e) => setFormData({ ...formData, pcNumber: e.target.value })}
                    maxLength={50}
                    placeholder="e.g. PC-12"
                    className="w-full px-4 py-3 bg-white dark:bg-[#1e2939] border border-gray-300 dark:border-[#334155] rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <div className={readOnlyFieldClass}>{formData.pcNumber || 'None'}</div>
                )}
              </div>
            )}

            {/* Report Description */}
            <div>
              <div className="mb-1.5 flex items-center gap-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Report Description
                </label>
                {(() => {
                  const parts: string[] = [];
                  if (formData.equipmentLabel) parts.push(formData.equipmentLabel);
                  const supportsPc = category === 'HARDWARE' || category === 'SOFTWARE';
                  if (supportsPc && formData.pcNumber.trim()) parts.push(formData.pcNumber.trim());
                  return parts.length > 0 ? (
                    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">
                      {parts.join(' · ')}
                    </span>
                  ) : null;
                })()}
              </div>
              <textarea
                rows={4}
                value={formData.reportProblem}
                onChange={(e) => {
                  setFormData({ ...formData, reportProblem: e.target.value });
                  setFieldErrors(prev => ({ ...prev, reportProblem: '' }));
                }}
                className="w-full px-4 py-3 bg-white dark:bg-[#1e2939] border border-gray-300 dark:border-[#334155] rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!canModifyTicketFields}
                required
                placeholder="Describe the issue in detail..."
              />
              {fieldErrors.reportProblem && (
                <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">{fieldErrors.reportProblem}</p>
              )}
            </div>

          </form>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium"
          >
            Cancel
          </button>
          {!isCreating && !isEditingExisting ? (
            <button
              type="button"
              onClick={handleEnterEditMode}
              disabled={!canManageTicketDetails || !hasAssignedLabTech}
              className={editButtonClassName}
            >
              {hasAssignedLabTech ? 'Edit' : 'Assign before editing'}
            </button>
          ) : !isCreating && !hasTicketChanges ? (
            <button
              type="button"
              onClick={() => setFeedbackMessage({ text: 'Change the ticket details before saving.', type: 'error' })}
              className={activeEditButtonClassName}
            >
              Editing
            </button>
          ) : (
            <button
              type="submit"
              form="ticket-form"
              disabled={isSubmitting}
              className={saveButtonClassName}
            >
              {isSubmitting ? 'Saving...' : isCreating ? 'Create Ticket' : 'Save'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
