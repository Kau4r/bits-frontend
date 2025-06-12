import { createPortal } from 'react-dom'
import { type InventoryItem } from '@/types/inventory'
import { useState } from 'react'

interface ItemModalProps {
  mode: 'add' | 'edit' | 'view'
  initialData?: InventoryItem
  onSubmit: (item: InventoryItem) => void
  onClose: () => void
}

export default function ItemModal({ mode, initialData, onSubmit, onClose }: ItemModalProps) {
  const [item, setItem] = useState<InventoryItem>(
    initialData ?? {
      assetCode: '',
      brand: '',
      itemType: '',
      location: '',
      status: 'Available',
      lastUpdated: new Date().toISOString(),
      assignedTo: '',
    }
  )
  const [currentMode, setCurrentMode] = useState(mode)

  const readOnly = currentMode === 'view'

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setItem((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (currentMode === 'view') return
    onSubmit(item)
    onClose()
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative rounded-xl border border-gray-200 bg-white p-6 px-8 dark:border-gray-700 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex flex-row items-center justify-between">
          {currentMode === 'view' ? (
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              View Item Details
            </h2>
          ) : currentMode === 'edit' ? (
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Edit Item</h2>
          ) : (
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Add New Item</h2>
          )}
          <button
            onClick={onClose}
            className="text-3xl text-gray-500 hover:text-black dark:hover:text-white"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-row gap-4">
            <div>
              <label
                htmlFor="assetCode"
                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Asset Code
              </label>
              <input
                type="text"
                id="assetCode"
                name="assetCode"
                value={item.assetCode}
                onChange={handleChange}
                required
                className={`w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white ${readOnly ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
                placeholder="Enter asset code"
                readOnly={readOnly}
              />
            </div>

            <div>
              <label
                htmlFor="brand"
                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Brand
              </label>
              <input
                type="text"
                id="brand"
                name="brand"
                value={item.brand}
                onChange={handleChange}
                required
                className={`w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white ${readOnly ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
                placeholder="Enter brand"
                readOnly={readOnly}
              />
            </div>

            <div>
              <label
                htmlFor="itemType"
                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Item Type
              </label>
              <input
                type="text"
                id="itemType"
                name="itemType"
                value={item.itemType}
                onChange={handleChange}
                required
                className={`w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white ${readOnly ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
                placeholder="Enter item type"
                readOnly={readOnly}
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="location"
              className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Location
            </label>
            <input
              type="text"
              id="location"
              name="location"
              value={item.location}
              onChange={handleChange}
              required
              className={`w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white ${readOnly ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
              placeholder="Enter location"
              readOnly={readOnly}
            />
          </div>
          <div className="flex flex-row gap-4">
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
                value={item.status}
                onChange={handleChange}
                disabled={readOnly}
                className={`flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white ${readOnly ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
              >
                <option value="Available">Available</option>
                <option value="In Use">In Use</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Defective">Defective</option>
              </select>
            </div>

            <div className="w-full">
              <label
                htmlFor="assignedTo"
                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Assigned To (optional)
              </label>
              <input
                type="text"
                id="assignedTo"
                name="assignedTo"
                value={item.assignedTo}
                onChange={handleChange}
                className={`w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white ${readOnly ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
                placeholder="Enter assigned to"
                readOnly={readOnly}
              />
            </div>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-end">
            {currentMode !== 'view' && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:bg-slate-900 dark:text-white dark:hover:bg-gray-800"
              >
                Cancel
              </button>
            )}
            {currentMode !== 'view' && (
              <button
                type="submit"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none dark:bg-indigo-700 dark:hover:bg-indigo-600"
              >
                Save
              </button>
            )}
          </div>
        </form>
        {currentMode === 'view' && (
          <div className="flex flex-row-reverse">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setCurrentMode('edit')
              }}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none dark:bg-indigo-700 dark:hover:bg-indigo-600"
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
