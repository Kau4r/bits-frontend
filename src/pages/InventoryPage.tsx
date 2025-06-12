import { useState } from 'react'
import { type InventoryItem } from '@/types/inventory'
import { PlusIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import InventoryTable from '@/components/inventory/InventoryTable'
import ItemModal from '@/components/inventory/ItemModal'

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
        <div className="flex-1">
          <label
            htmlFor="search"
            className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Search
          </label>
          <input
            type="text"
            id="search"
            className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

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

      <InventoryTable
        items={filteredInventory}
        onRowClick={(item) => {
          setSelectedItem(item)
          setIsModalOpen(true)
          setModalMode('view')
        }}
      />
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
