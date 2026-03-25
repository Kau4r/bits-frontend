import { useState, useEffect, useMemo } from 'react'
import { type Item } from '@/types/inventory'
import { Plus, Filter } from 'lucide-react'
import Table, { type SortConfig, type SortDirection } from '@/components/Table'
import ItemModal from '@/pages/labtech/components/ItemModal'
import Search from '@/components/Search'
import { getRooms } from "@/services/room";
import { getInventory, updateInventoryItem, createInventoryBulk, createInventoryItem } from "@/services/inventory"
import { inventoryStatuses } from "@/types/inventory"
import type { Room } from '@/types/room'
import { useAuth } from '@/context/AuthContext'
import InventoryMobilePage from '@/pages/labtech/InventoryMobile'

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
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'item_code', direction: 'asc' })

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
        const data = await getInventory()
        setInventory(data.filter((item): item is Item => !!item));
        console.log("Fetched inventory:", data);
      } catch (err) {
        console.error("Error fetching inventory:", err)
      }
    }
    loadInventory()
  }, [])

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        const nextDirection: SortDirection =
          prev.direction === 'asc' ? 'desc' :
            prev.direction === 'desc' ? null : 'asc'
        return { key, direction: nextDirection }
      }
      return { key, direction: 'asc' }
    })
  }

  // If mobile, render the mobile view immediately
  if (isMobile) {
    return <InventoryMobilePage />;
  }

  // const archiveStatuses: Item['Status'][] = ['AVAILABLE', 'BORROWED'];
  const filteredAndSortedInventory = useMemo(() => {
    let result = inventory.filter(item => {
      const matchesSearch = (item.Brand + item.Item_Code + (item.Item_Type ?? ''))
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesType = selectedType === 'All Types' || item.Item_Type === selectedType;

      const matchesStatus =
        selectedStatus === 'All Status' || item.Status?.toLowerCase() === selectedStatus.toLowerCase();

      return matchesSearch && matchesType && matchesStatus;
    });

    if (sortConfig.direction) {
      result = [...result].sort((a, b) => {
        let aValue: any = ''
        let bValue: any = ''

        switch (sortConfig.key) {
          case 'item_code':
            aValue = a.Item_Code?.toLowerCase() || ''
            bValue = b.Item_Code?.toLowerCase() || ''
            break
          case 'brand':
            aValue = a.Brand?.toLowerCase() || ''
            bValue = b.Brand?.toLowerCase() || ''
            break
          case 'type':
            aValue = a.Item_Type?.toLowerCase() || ''
            bValue = b.Item_Type?.toLowerCase() || ''
            break
          case 'status':
            aValue = a.Status?.toLowerCase() || ''
            bValue = b.Status?.toLowerCase() || ''
            break
          case 'room':
            aValue = (a.Room?.Name || (a as any).Computers?.[0]?.Room?.Name || '').toLowerCase()
            bValue = (b.Room?.Name || (b as any).Computers?.[0]?.Room?.Name || '').toLowerCase()
            break
          case 'updated':
            aValue = a.Updated_At ? new Date(a.Updated_At).getTime() : 0
            bValue = b.Updated_At ? new Date(b.Updated_At).getTime() : 0
            break
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }

    return result
  }, [inventory, searchTerm, selectedType, selectedStatus, sortConfig])


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
        const result = await createInventoryBulk(itemsToAdd, user?.User_ID ?? 0);
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

        const result = await createInventoryItem(itemToAdd, user?.User_ID ?? 0);
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

  const tableHeaders = [
    { label: 'Asset Code', key: 'item_code' },
    { label: 'Brand', key: 'brand' },
    { label: 'Item Type', key: 'type' },
    { label: 'Status', key: 'status' },
    { label: 'Room Name', key: 'room' },
    { label: 'Last Updated', key: 'updated' },
  ]



  return (
    <div className="flex h-full w-full flex-col bg-white p-6 sm:px-8 lg:px-10 dark:bg-gray-900">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventory Management</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Track and manage laboratory equipment and assets</p>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-500 hover:shadow-md focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none active:bg-indigo-700"
          onClick={() => {
            setModalMode('add')
            setIsModalOpen(true)
          }}
        >
          <Plus className="h-5 w-5" />
          Add Item
        </button>
      </div>

      {/* Filters Bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="min-w-[280px] flex-1">
          <Search searchTerm={searchTerm} onChange={setSearchTerm} showLabel={false} placeholder="Search by brand, code, or type..." />
        </div>

        {/* Type Filter */}
        <div className="relative">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-4 pr-10 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
          >
            <option key="all-types" value="All Types">All Types</option>
            {[...new Set(inventory.map(item => item.Item_Type).filter(Boolean))].map(type => (
              <option key={`type-${type}`} value={type}>
                {type}
              </option>
            ))}
          </select>
          <Filter className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-4 pr-10 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
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
          <Filter className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        </div>

        {/* Results Count */}
        <div className="ml-auto flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <span className="font-semibold text-gray-900 dark:text-white">{filteredAndSortedInventory.length}</span>
          <span>of {inventory.length} items</span>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <Table
          headers={tableHeaders}
          sortConfig={sortConfig}
          onSort={handleSort}
          columnWidths="1.5fr 1fr 1fr 1fr 1fr 1fr"
        >
          {filteredAndSortedInventory.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 w-full min-h-full" data-full-row>
              <div className="p-4 bg-gray-100 dark:bg-gray-800/50 rounded-full mb-4">
                <Filter className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                No items match your filters
              </h3>
              <button
                onClick={() => { setSearchTerm(''); setSelectedType('All Types'); setSelectedStatus('All Status'); }}
                className="mt-4 inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            filteredAndSortedInventory.map((item) => (
              <button
                key={item.Item_ID}
                type="button"
                className="group grid w-full cursor-pointer items-center px-6 py-4 text-left transition-all duration-150 hover:bg-indigo-50/50 focus:bg-indigo-50 focus:outline-none dark:hover:bg-indigo-900/10 dark:focus:bg-indigo-900/20"
                style={{ gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr 1fr' }}
                onClick={() => {
                  setSelectedItem({ ...item });
                  setModalMode('view');
                  setIsModalOpen(true);
                }}
              >
                <div className="truncate text-sm font-semibold text-gray-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
                  {item.Item_Code ?? '—'}
                </div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {item.Brand ?? '—'}
                </div>
                <div>
                  <span className="inline-flex items-center justify-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">
                    {item.Item_Type ?? '—'}
                  </span>
                </div>
                <div className="flex justify-center">
                  <span
                    className={`inline-flex items-center justify-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${item.Status === "AVAILABLE"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400"
                      : item.Status === "BORROWED"
                        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400"
                        : item.Status === "DEFECTIVE"
                          ? "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400"
                          : item.Status === "LOST"
                            ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400"
                            : item.Status === "REPLACED"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400"
                              : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                      }`}
                  >
                    {(item.Status ?? "AVAILABLE").charAt(0).toUpperCase() + (item.Status ?? "AVAILABLE").slice(1).toLowerCase()}
                  </span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {item.Room?.Name ?? ((item as any).Computers?.[0]?.Room?.Name) ?? '—'}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {item.Updated_At
                    ? new Date(item.Updated_At).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                    : '—'}
                </div>
              </button>
            ))
          )}
        </Table>
      </div>

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
