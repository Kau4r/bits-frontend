import { createPortal } from 'react-dom'
import type { Room } from '@/types/room'
import { useState, useEffect, useRef } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { FloatingSelect } from '@/ui/FloatingSelect'
import { useFocusTrap } from '@/hooks/useFocusTrap'

// RoomModal props
interface RoomModalProps {
  mode: 'add' | 'edit' | 'view';
  initialData?: Room;
  onSubmit: (room: Room) => void;
  onClose: (room?: Room) => void;
  onEditMode?: () => void;
}

// Helper function to get default capacity based on room type
const getDefaultCapacity = (roomType: string): number => {
  switch (roomType) {
    case 'CONSULTATION':
      return 5;
    case 'CONFERENCE':
      return 10;
    case 'LECTURE':
      return 40;
    case 'LAB':
      return 30;
    case 'OTHER':
      return 0;
    default:
      return 30;
  }
};

export default function RoomModal({
  mode,
  initialData,
  onSubmit,
  onClose,
  onEditMode,
}: RoomModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  useFocusTrap(dialogRef, true)
  const [room, setRoom] = useState<Room>({
    Room_ID: initialData?.Room_ID ?? 0,
    Name: initialData?.Name ?? '',
    Room_Type: initialData?.Room_Type ?? 'LECTURE',
    Status: initialData?.Status ?? 'AVAILABLE',
    Capacity: initialData?.Capacity ?? getDefaultCapacity(initialData?.Room_Type ?? 'LECTURE'),
    Lab_Type: initialData?.Lab_Type ?? undefined,
    Is_Bookable: initialData?.Is_Bookable ?? true,
  })

  const readOnly = mode === 'view'
  const capacityMin = room.Room_Type === 'OTHER' ? 0 : 1;

  useEffect(() => {
    if (initialData) {
      setRoom({
        Room_ID: initialData.Room_ID,
        Name: initialData.Name ?? '',
        Room_Type: initialData.Room_Type ?? 'LECTURE',
        Status: initialData.Status ?? 'AVAILABLE',
        Capacity: initialData.Capacity ?? getDefaultCapacity(initialData.Room_Type ?? 'LECTURE'),
        Lab_Type: initialData.Lab_Type ?? undefined,
        Is_Bookable: initialData.Is_Bookable ?? true,
      })
    }
  }, [initialData])

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setRoom((prev) => {
      const updated = {
        ...prev,
        [name]: name === 'Capacity' ? Number(value) : value,
      };

      // Handle room type changes
      if (name === 'Room_Type') {
        // Clear Lab_Type when switching away from LAB
        if (value !== 'LAB') {
          updated.Lab_Type = undefined;
        }
        // Set default capacity for the new room type (only in add mode)
        if (mode === 'add') {
          updated.Capacity = getDefaultCapacity(value);
        }
      }

      return updated;
    })
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (readOnly) return;
    console.log("Submitting from modal:", room);
    onSubmit({
      ...room,
      Room_Type: room.Room_Type ?? 'LECTURE',
      Status: room.Status ?? 'AVAILABLE',
    })
  }

  const handleClose = () => {
    onClose(room);
  };

  const modeTitle = mode === 'add' ? 'Add Room' : mode === 'edit' ? 'Edit Room' : 'Room Details';

  return createPortal(
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      onClick={handleClose}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-xl bg-white dark:bg-gray-900 shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {modeTitle}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-4">
              <div className="flex flex-col">
                <label className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Room Name
                </label>
                <input
                  type="text"
                  name="Name"
                  value={room.Name}
                  onChange={handleChange}
                  required
                  readOnly={readOnly}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-[#334155] bg-white dark:bg-[#1e2939] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60"
                />
              </div>

              <div className="flex flex-col">
                <label className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Room Type
                </label>
                <FloatingSelect
                  id="room-modal-type"
                  value={room.Room_Type}
                  disabled={readOnly}
                  placeholder="Select room type"
                  options={[
                    { value: 'CONSULTATION', label: 'Consultation' },
                    { value: 'CONFERENCE', label: 'Conference' },
                    { value: 'LECTURE', label: 'Lecture' },
                    { value: 'LAB', label: 'Lab' },
                    { value: 'OTHER', label: 'Other' },
                  ]}
                  onChange={(value) => {
                    const roomType = value as Room['Room_Type'];
                    setRoom((prev) => ({
                      ...prev,
                      Room_Type: roomType,
                      Lab_Type: roomType === 'LAB' ? prev.Lab_Type : undefined,
                      Capacity: mode === 'add' ? getDefaultCapacity(roomType) : prev.Capacity,
                    }))
                  }}
                />
              </div>

              {room.Room_Type === 'LAB' && (
                <div className="flex flex-col">
                  <label className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Lab Type {mode === 'add' && <span className="text-red-500">*</span>}
                  </label>
                  <FloatingSelect
                    id="room-modal-lab-type"
                    value={room.Lab_Type || ''}
                    disabled={readOnly}
                    placeholder="Select Lab Type"
                    options={[
                      { value: 'WINDOWS', label: 'Windows' },
                      { value: 'MAC', label: 'Mac' },
                    ]}
                    onChange={(value) => setRoom((prev) => ({ ...prev, Lab_Type: value as Room['Lab_Type'] }))}
                  />
                </div>
              )}

              <div className="flex flex-col">
                <label className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Status
                </label>
                <FloatingSelect
                  id="room-modal-status"
                  value={room.Status}
                  disabled={readOnly}
                  placeholder="Select status"
                  options={[
                    { value: 'AVAILABLE', label: 'Available' },
                    { value: 'IN_USE', label: 'In Use' },
                    { value: 'MAINTENANCE', label: 'Maintenance' },
                    { value: 'RESERVED', label: 'Reserved' },
                    { value: 'CLOSED', label: 'Closed' },
                  ]}
                  onChange={(value) => setRoom((prev) => ({ ...prev, Status: value as Room['Status'] }))}
                />
              </div>

              <div className="flex flex-col">
                <label className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Capacity
                </label>
                <input
                  type="number"
                  name="Capacity"
                  value={room.Capacity}
                  onChange={handleChange}
                  required
                  readOnly={readOnly}
                  min={capacityMin}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-[#334155] bg-white dark:bg-[#1e2939] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60"
                />
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                  Default capacity: {getDefaultCapacity(room.Room_Type)} (can be customized)
                </p>
              </div>

              <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/60">
                <input
                  id="room-modal-bookable"
                  type="checkbox"
                  checked={room.Is_Bookable !== false}
                  onChange={(e) => setRoom((prev) => ({ ...prev, Is_Bookable: e.target.checked }))}
                  disabled={readOnly}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600"
                />
                <div className="flex-1">
                  <label htmlFor="room-modal-bookable" className="block text-sm font-medium text-gray-800 dark:text-gray-200">
                    Bookable
                  </label>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    When unchecked, this room will not appear in the booking flow.
                    Use for storage, control rooms, dept office, faculty office, green room, etc.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Cancel
            </button>
            {mode === 'view' && (
              <button
                type="button"
                onClick={onEditMode}
                className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors"
              >
                Edit
              </button>
            )}
            {mode !== 'view' && (
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Save
              </button>
            )}
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
