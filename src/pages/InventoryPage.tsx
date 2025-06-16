import { useState } from 'react'
import { type InventoryItem } from '@/types/inventory'
import { PlusIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import Table from '@/components/Table'
import ItemModal from '@/components/inventory/ItemModal'
import Search from '@/components/Search'

const mockInventory: InventoryItem[] = [
  {
    assetCode: 'KEB101',
    brand: 'Dell',
    itemType: 'Keyboard',
    location: 'LB467',
    status: 'Available',
    lastUpdated: '2023-06-02',
  },
  {
    assetCode: 'MOU101',
    brand: 'Logitech',
    itemType: 'Mouse',
    location: 'LB467',
    status: 'In Use',
    lastUpdated: '2023-06-01',
    assignedTo: 'John Doe',
  },
  {
    assetCode: 'KEB102',
    brand: 'Dell',
    itemType: 'Keyboard',
    location: 'LB467',
    status: 'Maintenance',
    lastUpdated: '2023-05-30',
  },
  {
    assetCode: 'MOU102',
    brand: 'Logitech',
    itemType: 'Mouse',
    location: 'LB467',
    status: 'Defective',
    lastUpdated: '2023-05-28',
  },
]

const InventoryPage = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [inventory, setInventory] = useState<InventoryItem[]>(mockInventory)
  const [selectedType, setSelectedType] = useState('All Types')
  const [selectedStatus, setSelectedStatus] = useState('All Status')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'add'>('view')
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)

  const filteredInventory = inventory.filter(
    (item) =>
      (item.brand + item.assetCode).toLowerCase().includes(searchTerm.toLowerCase()) &&
      (selectedType === 'All Types' || item.itemType === selectedType) &&
      (selectedStatus === 'All Status' || item.status === selectedStatus)
  )

  const addItem = (item: InventoryItem) => {
    setInventory((prev) => [...prev, item])
  }

  const handleUpdate = (updatedItem: InventoryItem) => {
    setInventory((prev) => {
      const index = prev.findIndex((i) => i.assetCode === updatedItem.assetCode)
      if (index === -1) return [...prev, updatedItem] // Add
      const newList = [...prev]
      newList[index] = updatedItem
      return newList
    })
    setIsModalOpen(false)
  }

  return (
    <div className="px-6 py-4 sm:px-8 lg:px-10">
      <div className="mb-8 flex items-end justify-between gap-6">
        <Search searchTerm={searchTerm} onChange={setSearchTerm} />
        <div className="flex gap-3">
          <button className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-base text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:bg-slate-900 dark:text-white dark:hover:bg-gray-800">
            Sort By
            <ChevronDownIcon className="h-5 w-5" />
          </button>
          <button className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-base text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:bg-slate-900 dark:text-white dark:hover:bg-gray-800">
            {selectedType}
            <ChevronDownIcon className="h-5 w-5" />
          </button>
          <button className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-base text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:bg-slate-900 dark:text-white dark:hover:bg-gray-800">
            {selectedStatus}
            <ChevronDownIcon className="h-5 w-5" />
          </button>
          <button
            className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none dark:bg-indigo-700 dark:hover:bg-indigo-600"
            onClick={() => {
              setSelectedItem(null)
              setModalMode('add')
              setIsModalOpen(true)
            }}
          >
            <PlusIcon className="mr-2 h-5 w-5" />
            Add Item
          </button>
        </div>
      </div>

      <Table headers={['Asset Code', 'Brand', 'Item Type', 'Location', 'Status', 'Last Updated']}>
        {filteredInventory.map((item) => (
          <div
            key={item.assetCode}
            onClick={() => {
              setSelectedItem(item)
              setIsModalOpen(true)
              setModalMode('view')
            }}
            className="grid cursor-pointer grid-cols-6 items-center gap-x-4 px-6 py-4 transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <div className="truncate text-base font-semibold text-gray-800 dark:text-white">
              {item.assetCode}
            </div>

            <div className="text-sm text-gray-700 dark:text-gray-300">{item.brand}</div>

            <div>
              <span className="inline-flex items-center justify-center gap-1.5 rounded-full bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                {item.itemType}
              </span>
            </div>

            <div>
              <span
                className={`inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
                  item.status === 'Available'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : item.status === 'In Use'
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      : item.status === 'Maintenance'
                        ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}
              >
                {item.status}
              </span>
            </div>

            <div className="text-sm text-gray-700 dark:text-gray-300">{item.location}</div>

            <div className="text-sm text-gray-700 dark:text-gray-300">
              {new Date(item.lastUpdated).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </div>
          </div>
        ))}
      </Table>
      {isModalOpen && (
        <ItemModal
          mode={modalMode}
          initialData={selectedItem ?? undefined}
          onClose={() => {
            setIsModalOpen(false)
            setSelectedItem(null)
          }}
          onSubmit={(updatedItem) => {
            handleUpdate(updatedItem)
            setSelectedItem(null)
          }}
        />
      )}
    </div>
  )
}

export default InventoryPage
