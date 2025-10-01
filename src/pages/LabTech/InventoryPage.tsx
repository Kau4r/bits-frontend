import { useState, useEffect } from 'react'
import { type Item } from '@/types/inventory'
import { PlusIcon } from '@heroicons/react/24/outline'
import Table from '@/components/Table'
import ItemModal from '@/components/inventory/ItemModal'
import Search from '@/components/Search'
import { getRooms } from "@/services/room";
import { fetchInventory, updateInventoryItem, addInventoryBulk } from "@/services/inventory"
import { inventoryStatuses } from "@/types/inventory"
import type { Room } from '@/types/room'
import { useAuth } from '@/context/AuthContext'


const InventoryPage = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('')
  const [inventory, setInventory] = useState<Item[]>([])
  const [selectedType, setSelectedType] = useState('All Types')
  const [selectedStatus, setSelectedStatus] = useState('All Status')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'add'>('view')
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [rooms, setRooms] = useState<Room[]>([])

  useEffect(() => {
    const loadRoomsAndUsers = async () => {
      try {
        const roomsData = await getRooms();
        setRooms(roomsData);

      } catch (err) {
        console.error("Error fetching rooms or users:", err);
      }
    };

    loadRoomsAndUsers();
  }, []);

  // Fetch inventory from backend on mount
  useEffect(() => {
    const loadInventory = async () => {
      try {
        const data = await fetchInventory()
        setInventory(data.filter((item): item is Item => !!item));
        console.log("Fetched inventory:", data);
      } catch (err) {
        console.error("Error fetching inventory:", err)
      }
    }
    loadInventory()
  }, [])

  const archiveStatuses: Item['Status'][] = ['AVAILABLE', 'BORROWED'];
  const filteredInventory = inventory.filter(item => {
    const isArchive = archiveStatuses.includes(item.Status);
    const matchesSearch = (item.Brand + item.Item_Code + (item.Item_Type ?? ''))
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'All Types' || item.Item_Type === selectedType;
    const matchesStatus =
      selectedStatus === 'All Status' || item.Status?.toLowerCase() === selectedStatus.toLowerCase();
    return matchesSearch && matchesType && matchesStatus && (isArchive || selectedStatus !== 'All Status');
  });


  const handleSaveItem = async (
    payload: Item | Item[] | { id: number; data: Partial<Item> }
  ) => {
    try {
      // Bulk add
      if (Array.isArray(payload) && payload.every(p => !('id' in p))) {
        const savedItems = await addInventoryBulk(payload as Item[], user?.User_ID ?? 0);
        setInventory(prev => [...prev, ...savedItems]);
        setIsModalOpen(false);
        return;
      }

      // Single edit: either flat Item or { id, data }
      let itemId: number;
      let updateData: Partial<Item>;

      if ('id' in payload && 'data' in payload) {
        itemId = payload.id;
        updateData = payload.data;
      } else if ('Item_ID' in payload) {
        itemId = payload.Item_ID!;
        updateData = payload as Partial<Item>;
      } else {
        console.error("Cannot update: missing Item_ID", payload);
        return;
      }

      const updatedItem = await updateInventoryItem(itemId, updateData);

      // Find the room object from current rooms
      const roomObj = rooms.find(r => r.Room_ID === updatedItem.Room_ID);

      // Merge room object into updatedItem
      const mergedItem: Item = { ...updatedItem, Room: roomObj } as Item;

      // Update inventory state
      setInventory(prev =>
        prev.map(i => i.Item_ID === mergedItem.Item_ID ? mergedItem : i)
      );

      // Update selectedItem if modal is open
      if (selectedItem?.Item_ID === mergedItem.Item_ID) {
        setSelectedItem(mergedItem);
      }

      setIsModalOpen(false);

    } catch (err) {
      console.error("Error saving inventory item:", err);
    }
  };



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

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-lg border px-3 pr-7 py-2 text-gray-800 dark:bg-slate-900 dark:text-white w-auto"
          >
            <option value="All Status">
              All Status ({inventory.length})
            </option>
            {inventoryStatuses.map((status) => {
              const count = inventory.filter(i => i.Status === status).length;
              return (
                <option key={`status-${status}`} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()} ({count})
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

      <Table headers={['Asset Code', 'Brand', 'Item Type', 'Status', 'Room Name', 'Last Updated']}>
        {filteredInventory
          .map(item => {
            if (!item) return null;
            return (
              <div
                key={item.Item_ID}
                onClick={() => {
                  setSelectedItem({ ...item }); // clone to break reference
                  setModalMode('view');
                  setIsModalOpen(true);
                }}
                className="grid cursor-pointer grid-cols-6 items-center gap-x-4 px-6 py-4 transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <div className="truncate text-base font-semibold text-gray-800 dark:text-white">
                  {item.Item_Code ?? '—'}
                </div>
                <div className="text-base text-white dark:text-gray-300"><strong>{item.Brand ?? '—'}</strong></div>
                <div>
                  <span className="inline-flex items-center justify-center gap-1.5 rounded-full bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    {item.Item_Type ?? '—'}
                  </span>
                </div>
                <div>
                  <span
                    className={`inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${item.Status === "AVAILABLE"
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      : item.Status === "BORROWED"
                        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                        : item.Status === "DEFECTIVE"
                          ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                          : item.Status === "LOST"
                            ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                            : item.Status === "REPLACED"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                      }`}
                  >
                    {(item.Status ?? "AVAILABLE").charAt(0).toUpperCase() + (item.Status ?? "AVAILABLE").slice(1).toLowerCase()}
                  </span>

                </div>
                <div className="text-sm text-gray-700 dark:text-gray-300">{item.Room?.Name ?? '—'}</div>
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
            )
          }
          )}

      </Table>

      <ItemModal
        isOpen={isModalOpen}
        initMode={modalMode}
        item={modalMode !== 'add' ? selectedItem : null} // pass single item
        items={inventory} // full inventory for dropdowns
        rooms={rooms}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedItem(null)
        }}
        onSave={handleSaveItem}
        userId={user?.User_ID}
      />

    </div>
  )
}

export default InventoryPage
