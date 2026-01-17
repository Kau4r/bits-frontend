import { useState, useEffect } from 'react'
import { type Item } from '@/types/inventory'
import { PlusIcon } from '@heroicons/react/24/outline'
import Table from '@/components/Table'
import ItemModal from '@/components/inventory/ItemModal'
import Search from '@/components/Search'
import { getRooms } from "@/services/room";
import { fetchInventory, updateInventoryItem, addInventoryBulk, addInventoryItem } from "@/services/inventory"
import { inventoryStatuses } from "@/types/inventory"
import type { Room } from '@/types/room'
import { useAuth } from '@/context/AuthContext'
import InventoryMobilePage from './InventoryMobile'

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

  // Responsive state
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // If mobile, render the mobile view immediately
  if (isMobile) {
    return <InventoryMobilePage />;
  }

  // const archiveStatuses: Item['Status'][] = ['AVAILABLE', 'BORROWED'];
  const filteredInventory = inventory.filter(item => {
    // const isArchive = archiveStatuses.includes(item.Status);
    const matchesSearch = (item.Brand + item.Item_Code + (item.Item_Type ?? ''))
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'All Types' || item.Item_Type === selectedType;

    const matchesStatus =
      selectedStatus === 'All Status' || item.Status?.toLowerCase() === selectedStatus.toLowerCase();

    // Remove the (isArchive || selectedStatus !== 'All Status') or else replace with a condition
    // that allows all items to show when selectedStatus === 'All Status'

    return matchesSearch && matchesType && matchesStatus;
  });


  const handleSaveItem = async (
    payload: Partial<Item> | Partial<Item>[] | { id: number; data: Partial<Item> }
  ) => {
    try {
      let savedItems: Item[] = [];

      // ---- BULK ADD ----
      if (Array.isArray(payload)) {
        // Convert payload to proper format
        const itemsToAdd: Omit<Item, "Item_ID">[] = payload.map(p => ({
          Item_Type: p.Item_Type!,
          Brand: p.Brand!,
          Serial_Number: p.Serial_Number ?? "",
          Status: p.Status ?? "AVAILABLE",
          Room_ID: p.Room_ID ?? rooms?.[0]?.Room_ID ?? 0,
          Updated_At: p.Updated_At ?? new Date().toISOString(),
          IsBorrowable: p.IsBorrowable ?? false,
          Item_Code: p.Item_Code ?? "",
        }));

        // Send bulk request
        const result = await addInventoryBulk(itemsToAdd, user?.User_ID ?? 0);
        savedItems = Array.isArray(result) ? result : [result as Item];
      }

      // ---- SINGLE ADD ----
      else if (!('id' in payload) && !('Item_ID' in payload)) {
        const itemToAdd: Omit<Item, "Item_ID"> = {
          Item_Type: payload.Item_Type!,
          Brand: payload.Brand!,
          Serial_Number: payload.Serial_Number ?? "",
          Status: payload.Status ?? "AVAILABLE",
          Room_ID: payload.Room_ID ?? rooms?.[0]?.Room_ID ?? 0,
          Updated_At: payload.Updated_At ?? new Date().toISOString(),
          IsBorrowable: payload.IsBorrowable ?? false,
          Item_Code: payload.Item_Code ?? "",
        };

        const result = await addInventoryItem(itemToAdd, user?.User_ID ?? 0);
        savedItems = Array.isArray(result) ? result : [result as Item];
      }

      // ---- UPDATE EXISTING ITEM ----
      else {
        let itemId: number;
        let updateData: Partial<Item>;

        if ('id' in payload && 'data' in payload) {
          itemId = payload.id;
          updateData = payload.data;
        } else if ('Item_ID' in payload && payload.Item_ID != null) {
          itemId = payload.Item_ID;
          updateData = payload as Partial<Item>;
        } else {
          console.error("Cannot update: missing Item_ID", payload);
          return;
        }

        const updatedItem = await updateInventoryItem(itemId, updateData);
        function isItem(obj: any): obj is Item {
          return obj && 'Item_ID' in obj;
        }
        if (isItem(updatedItem)) {
          const mergedItem: Item = {
            Item_ID: updatedItem.Item_ID,
            Item_Code: updatedItem.Item_Code ?? "",
            Item_Type: updatedItem.Item_Type ?? "Unknown",
            Brand: updatedItem.Brand ?? "Unknown",
            Serial_Number: updatedItem.Serial_Number ?? "",
            Status: updatedItem.Status ?? "AVAILABLE",
            Room_ID: updatedItem.Room_ID,
            Updated_At: updatedItem.Updated_At ?? new Date().toISOString(),
            IsBorrowable: updatedItem.IsBorrowable ?? false,
            User_ID: updatedItem.User_ID,
            Room: rooms.find(r => r.Room_ID === updatedItem.Room_ID),
          };
          setInventory(prev =>
            prev.map(i => (i.Item_ID === mergedItem.Item_ID ? mergedItem : i))
          );
          setSelectedItem(mergedItem);
          // Replace in inventory
          setInventory(prev =>
            prev.map(i => (i.Item_ID === mergedItem.Item_ID ? mergedItem : i))
          );

          if (selectedItem?.Item_ID === mergedItem.Item_ID || modalMode === 'add') {
            setSelectedItem(mergedItem);
          }
        }

        setIsModalOpen(false);
        return;
      }

      // ---- PROCESS SAVED ITEMS (single or bulk) ----
      if (savedItems.length > 0) {
        const itemsWithRooms: Item[] = savedItems.map(item => ({
          Item_ID: item.Item_ID,
          Item_Code: item.Item_Code ?? "",
          Item_Type: item.Item_Type ?? "Unknown",
          Brand: item.Brand ?? "Unknown",
          Serial_Number: item.Serial_Number ?? "",
          Status: item.Status ?? "AVAILABLE",
          Room_ID: item.Room_ID,
          Updated_At: item.Updated_At ?? new Date().toISOString(),
          IsBorrowable: item.IsBorrowable ?? false,
          User_ID: item.User_ID,
          Room: rooms.find(r => r.Room_ID === item.Room_ID),
        }));

        setInventory(prev => [...prev, ...itemsWithRooms]);

        // If single add, select the item
        if (itemsWithRooms.length === 1) {
          setSelectedItem(itemsWithRooms[0]);
          setSelectedType('All Types');
          setSelectedStatus('All Status');
        }

        setIsModalOpen(false);
      }

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
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  {item.Room?.Name ?? ((item as any).Computers?.[0]?.Room?.Name) ?? '—'}
                </div>
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
        item={modalMode !== "add" ? selectedItem : null}
        items={inventory}
        rooms={rooms}
        onClose={() => { setIsModalOpen(false); setSelectedItem(null); }}
        onSave={handleSaveItem}
      />

    </div>
  )
}

export default InventoryPage
