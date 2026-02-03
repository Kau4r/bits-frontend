import { createPortal } from 'react-dom'
import type { Room } from '@/types/room'
import { useState, useEffect } from 'react'

// RoomModal props
interface RoomModalProps {
  mode: 'add' | 'edit' | 'view';
  initialData?: Room;
  onSubmit: (room: Room) => void;
  onClose: (room?: Room) => void;
  onEditMode?: () => void; // NEW
}


export default function RoomModal({
  mode,
  initialData,
  onSubmit,
  onClose,
  onEditMode,   // <-- add this
}: RoomModalProps) {
  const [room, setRoom] = useState<Room>({
    Room_ID: initialData?.Room_ID ?? 0,
    Name: initialData?.Name ?? '',
    Room_Type: initialData?.Room_Type ?? 'LECTURE',
    Status: initialData?.Status ?? 'AVAILABLE',
    Capacity: initialData?.Capacity ?? 30,
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
      })
    }
  }, [initialData])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setRoom((prev) => ({
      ...prev,
      [name]:
        name === 'Capacity'
          ? Number(value)
          : value,
    }))
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
    onClose(room); // pass the current room back
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 px-8 dark:border-gray-700 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {mode === 'add'
              ? 'Add Room'
              : mode === 'edit'
                ? 'Edit Room'
                : 'Room Details'}
          </h2>
          <button
            onClick={() => onClose(room)}
            className="text-3xl text-gray-500 hover:text-black dark:hover:text-white"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Room Name
            </label>
            <input
              type="text"
              name="Name"
              value={room.Name}
              onChange={handleChange}
              required
              readOnly={readOnly}
              className={`w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white ${readOnly ? 'bg-gray-100 dark:bg-gray-800' : ''
                }`}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Room Type
            </label>
            <select
              name="Room_Type"
              value={room.Room_Type}
              onChange={handleChange}
              disabled={readOnly}
              className={`w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white ${readOnly ? 'bg-gray-100 dark:bg-gray-800' : ''
                }`}
            >
              <option value="CONSULTATION">Consultation</option>
              <option value="LECTURE">Lecture</option>
              <option value="LAB">Lab</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Status
            </label>
            <select
              name="Status"
              value={room.Status}
              onChange={handleChange}
              disabled={readOnly}
              className={`w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white ${readOnly ? 'bg-gray-100 dark:bg-gray-800' : ''
                }`}
            >
              <option value="AVAILABLE">Available</option>
              <option value="IN_USE">In Use</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="OCCUPIED">Occupied</option>
              <option value="RESERVED">Reserved</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Capacity
            </label>
            <input
              type="number"
              name="Capacity"
              value={room.Capacity}
              onChange={handleChange}
              required
              readOnly={readOnly}
              className={`w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white ${readOnly ? 'bg-gray-100 dark:bg-gray-800' : ''
                }`}
            />
          </div>

          {!readOnly && (
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:bg-slate-900 dark:text-white dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none dark:bg-indigo-700 dark:hover:bg-indigo-600"
              >
                Save
              </button>
            </div>
          )}
        </form>

        {mode === 'view' && (
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={onEditMode}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Edit
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
