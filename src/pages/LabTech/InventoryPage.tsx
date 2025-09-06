
import { useState, useEffect } from 'react'
import { type InventoryItem } from '@/types/inventory'
import { PlusIcon } from '@heroicons/react/24/outline'
import Table from '@/components/Table'
import ItemModal from '@/components/inventory/ItemModal'
import Search from '@/components/Search'
import { fetchInventory, addInventoryItem, updateInventoryItem } from "@/services/inventory"

// const mockInventory: InventoryItem[] = [
//   {
//     Item_Code: 'MON-2025-1',
//     Item_Type: 'Monitor',
//     Brand: 'Dell',
//     Room_ID: 'LB468',
//     serialNumber: "Ser1",
//     Status: 'Available',
//     Updated_At: new Date().toISOString(),
//   },
//   {
//     Item_Code: 'KEY-2025-1',
//     Item_Type: 'Keyboard',
//     Brand: 'Logitech',
//     Room_ID: 'LB467',
//     serialNumber: "Ser2",
//     Status: 'In Use',
//     Updated_At: new Date().toISOString(),
//   },
// ]

const InventoryPage = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [selectedType, setSelectedType] = useState('All Types')
  const [selectedStatus, setSelectedStatus] = useState('All Status')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'add'>('view')
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)

  // Fetch inventory from backend on mount
  useEffect(() => {
    const loadInventory = async () => {
      try {
        const data = await fetchInventory()
        setInventory(data)
        console.log(inventory)
      } catch (err) {
        console.error("Error fetching inventory:", err)
      }
    }
    loadInventory()
  }, [])

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = (item.Brand + item.Item_Code + (item.Item_Type ?? '')).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'All Types' || item.Item_Type === selectedType;
    const matchesStatus =
      selectedStatus === 'All Status'
        ? true
        : item.Status?.toLowerCase() === selectedStatus.toLowerCase();

    return matchesSearch && matchesType && matchesStatus;
  });

  // const handleSave = (data: InventoryItem | InventoryItem[]) => {
  //   if (Array.isArray(data)) {
  //     // Add multiple items
  //     setInventory(prev => [...prev, ...data]);
  //   } else {
  //     // Single item
  //     setInventory(prev => {
  //       const existingIndex = prev.findIndex(i => i.Item_Code === data.Item_Code);
  //       if (existingIndex !== -1) {
  //         // Key fields edit -> replace
  //         return prev.map((i, idx) => (idx === existingIndex ? data : i));
  //       } else {
  //         // Room_ID change -> append new item
  //         return [...prev, data];
  //       }
  //     });
  //   }
  // };
  const handleSave = async (data: InventoryItem | InventoryItem[]) => {
    try {
      if (Array.isArray(data)) {
        // Bulk add only
        const saved = await Promise.all(data.map(item => addInventoryItem(item)))
        setInventory(prev => [...prev, ...saved])
      } else {
        if (modalMode === "edit" && data.Item_Code) {
          // Update existing
          const updated = await updateInventoryItem(data.Item_Code, data)
          setInventory(prev =>
            prev.map(item => (item.Item_Code === updated.Item_Code ? updated : item))
          )
        } else {
          // Add new
          const saved = await addInventoryItem(data)
          setInventory(prev => [...prev, saved])
        }
      }
    } catch (err) {
      console.error("Error saving inventory item:", err)
    }
  }



  return (
    <div className="px-6 py-4 sm:px-8 lg:px-10">
      <div className="mb-4 flex items-end justify-between gap-6">
        <Search searchTerm={searchTerm} onChange={setSearchTerm} showLabel={false} />
        <div className="flex gap-3">
          {/* Type dropdown */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="rounded-lg border px-3 pr-7 py-2 text-gray-800 dark:bg-slate-900 dark:text-white w-auto"
          >
            <option key="all-types" value="All Types">All Types</option>
            {[...new Set(inventory.map(item => item.Item_Type).filter(Boolean))].map(type => (
              <option key={`type-${type}`} value={type}>
                {type}
              </option>
            ))}
          </select>


          {/* Status dropdown */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-lg border px-3 pr-7 py-2 text-gray-800 dark:bg-slate-900 dark:text-white w-auto"
          >
            <option key="all-status" value="All Status">All Status ({inventory.length})</option>
            {['Available', 'In Use', 'Maintenance', 'Defective'].map((status) => {
              // Normalize count regardless of case
              const count = inventory.filter(i => i.Status?.toLowerCase() === status.toLowerCase()).length;
              return (
                <option key={`status-${status}`} value={status}>
                  {status} ({count})
                </option>
              );
            })}
          </select>


          <button
            className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none dark:bg-indigo-700 dark:hover:bg-indigo-600"
            onClick={() => {
              setModalMode('add')
              setIsModalOpen(true)
            }}
          >
            <PlusIcon className="mr-2 h-5 w-5" />
            Add Item
          </button>
        </div>
      </div>

      <Table headers={['Asset Code', 'Brand', 'Item Type', 'Status', 'Room_ID', 'Last Updated']}>
        {filteredInventory.map(item => (
          <div
            key={item.Item_ID}
            onClick={() => {
              setSelectedItem(item)
              setModalMode('view')
              setIsModalOpen(true)
            }}
            className="grid cursor-pointer grid-cols-6 items-center gap-x-4 px-6 py-4 transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <div className="truncate text-base font-semibold text-gray-800 dark:text-white">{item.Item_Code}</div>
            <div className="text-base text-white dark:text-gray-300"><strong>{item.Brand}</strong></div>
            <div>
              <span className="inline-flex items-center justify-center gap-1.5 rounded-full bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                {item.Item_Type}
              </span>
            </div>
            <div>
              <span
                className={`inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${item.Status?.toLowerCase() === 'available'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : item.Status?.toLowerCase() === 'in use'
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    : item.Status?.toLowerCase() === 'maintenance'
                      ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}
              >
                {item.Status
                  ? item.Status.charAt(0).toUpperCase() + item.Status.slice(1).toLowerCase()
                  : 'Unknown'}
              </span>
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-300">{item.Room_ID}</div>
            <div className="text-sm text-gray-700 dark:text-gray-300">
              {item.Updated_At
                ? new Date(item.Updated_At).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })
                : '—'}
            </div>

          </div>
        ))}
      </Table>

      <ItemModal
        isOpen={isModalOpen}
        initMode={modalMode}
        item={modalMode !== 'add' ? selectedItem : null} // pass single item
        items={inventory} // full inventory for dropdowns
        rooms={['LB467', 'LB468', 'LB469', 'LB470']}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedItem(null)
        }}
        onSave={handleSave}
      />

    </div>
  )
}

export default InventoryPage
