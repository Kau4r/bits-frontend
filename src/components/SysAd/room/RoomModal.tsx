import { createPortal } from 'react-dom'
import type { Room } from '@/types/room'
import { useState, useEffect } from 'react'

// RoomModal props
interface RoomModalProps {
  mode: 'add' | 'edit' | 'view';
  initialData?: Room;
  onSubmit: (room: Room) => void;
  onClose: (room?: Room) => void;
  onEditMode?: () => void;
}


export default function RoomModal({
  mode,
  initialData,
  onSubmit,
  onClose,
  onEditMode,
}: RoomModalProps) {
  const [room, setRoom] = useState<Room>({
    Room_ID: initialData?.Room_ID ?? 0,
    Name: initialData?.Name ?? '',
    Room_Type: initialData?.Room_Type ?? 'LECTURE',
    Status: initialData?.Status ?? 'AVAILABLE',
    Capacity: initialData?.Capacity ?? 30,
    Lab_Type: initialData?.Lab_Type ?? undefined,
  })

  const readOnly = mode === 'view'

  useEffect(() => {
    if (initialData) {
      setRoom({
        Room_ID: initialData.Room_ID,
        Name: initialData.Name ?? '',
        Room_Type: initialData.Room_Type ?? 'LECTURE',
        Status: initialData.Status ?? 'AVAILABLE',
        Capacity: initialData.Capacity ?? 30,
        Lab_Type: initialData.Lab_Type ?? undefined,
      })
    }
  }, [initialData])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setRoom((prev) => {
      const updated = {
        ...prev,
        [name]: name === 'Capacity' ? Number(value) : value,
      };
      // Clear Lab_Type when switching away from LAB
      if (name === 'Room_Type' && value !== 'LAB') {
        updated.Lab_Type = undefined;
      }
      return updated;
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
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
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60"
                />
              </div>

              <div className="flex flex-col">
                <label className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Room Type
                </label>
                <select
                  name="Room_Type"
                  value={room.Room_Type}
                  onChange={handleChange}
                  disabled={readOnly}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60"
                >
                  <option value="CONSULTATION">Consultation</option>
                  <option value="LECTURE">Lecture</option>
                  <option value="LAB">Lab</option>
                </select>
              </div>

              {room.Room_Type === 'LAB' && (
                <div className="flex flex-col">
                  <label className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Lab Type {mode === 'add' && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    name="Lab_Type"
                    value={room.Lab_Type || ''}
                    onChange={handleChange}
                    disabled={readOnly}
                    required={mode === 'add'}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60"
                  >
                    <option value="">Select Lab Type</option>
                    <option value="WINDOWS">Windows</option>
                    <option value="MAC">Mac</option>
                  </select>
                </div>
              )}

              <div className="flex flex-col">
                <label className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Status
                </label>
                <select
                  name="Status"
                  value={room.Status}
                  onChange={handleChange}
                  disabled={readOnly}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60"
                >
                  <option value="AVAILABLE">Available</option>
                  <option value="IN_USE">In Use</option>
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="OCCUPIED">Occupied</option>
                  <option value="RESERVED">Reserved</option>
                </select>
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
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60"
                />
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
