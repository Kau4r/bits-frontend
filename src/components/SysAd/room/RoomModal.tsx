import { createPortal } from 'react-dom'
import type { Room } from '@/types/Room'
import { useState } from 'react'

interface RoomModalProps {
  mode: 'add' | 'edit' | 'view'
  initialData?: Room
  onSubmit: (room: Room) => void
  onClose: () => void
}

export default function RoomModal({ mode, initialData, onSubmit, onClose }: RoomModalProps) {
  const [room, setRoom] = useState<Room>(
    initialData ?? {
      code: '',
      type: 'Consultation Room',
      status: 'Available',
    }
  )
  const [currentMode, setCurrentMode] = useState(mode)
  const readOnly = currentMode === 'view'

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setRoom((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (readOnly) return
    onSubmit(room)
    onClose()
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 px-8 dark:border-gray-700 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {currentMode === 'add'
              ? 'Add Room'
              : currentMode === 'edit'
                ? 'Edit Room'
                : 'Room Details'}
          </h2>
          <button
            onClick={onClose}
            className="text-3xl text-gray-500 hover:text-black dark:hover:text-white"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="code"
              className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Room Code
            </label>
            <input
              type="text"
              id="code"
              name="code"
              value={room.code}
              onChange={handleChange}
              required
              readOnly={readOnly}
              className={`w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white ${readOnly ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
            />
          </div>

          <div>
            <label
              htmlFor="type"
              className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Room Type
            </label>
            <select
              id="type"
              name="type"
              value={room.type}
              onChange={handleChange}
              disabled={readOnly}
              className={`w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white ${readOnly ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
            >
              <option value="Consultation Room">Consultation Room</option>
              <option value="Conference Room">Conference Room</option>
              <option value="Lecture Room">Lecture Room</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="status"
              className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Status
            </label>
            <select
              id="status"
              name="status"
              value={room.status}
              onChange={handleChange}
              disabled={readOnly}
              className={`w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white ${readOnly ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
            >
              <option value="Available">Available</option>
              <option value="In Use">In Use</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Defective">Defective</option>
            </select>
          </div>

          {!readOnly && (
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
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

        {readOnly && (
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={() => setCurrentMode('edit')}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600"
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
