import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { type Item, type InventoryStatus } from '@/types/inventory'
import { Plus, Filter, Package, Pencil, Tag, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { LoadingSkeleton, Skeleton } from '@/ui/LoadingSkeleton'
import { EmptyState } from '@/ui/EmptyState'
import { FloatingSelect } from '@/ui/FloatingSelect'
import Table, { type SortConfig, type SortDirection } from '@/components/Table'
import ItemModal from '@/pages/labtech/components/ItemModal'
import Search from '@/components/Search'
import { getRooms } from "@/services/room";
import { getInventory, updateInventoryItem, createInventoryBulk, createInventoryItem } from "@/services/inventory"
import { inventoryStatuses } from "@/types/inventory"
import type { Room } from '@/types/room'
import { useAuth } from '@/context/AuthContext'
import InventoryMobilePage from '@/pages/labtech/InventoryMobile'
import InventoryDashboard from '@/pages/labtech/components/InventoryDashboard'
import { formatItemType, resolveItemType, formatBrand } from '@/lib/utils'

type InventoryView = 'list' | 'information'

const resolveView = (param: string | null): InventoryView =>
  param === 'list' ? 'list' : 'information'

const statusBorder: Record<InventoryStatus, string> = {
  AVAILABLE: 'border-l-green-500',
  BORROWED: 'border-l-blue-500',
  DEFECTIVE: 'border-l-orange-500',
  LOST: 'border-l-red-500',
  REPLACED: 'border-l-gray-400',
  DISPOSED: 'border-l-slate-500',
}

const InventoryPage = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('')
  const [inventory, setInventory] = useState<Item[]>([])
  const [selectedType, setSelectedType] = useState('All Types')
  const [selectedStatus, setSelectedStatus] = useState('All Status')
  const [selectedRoomFilter, setSelectedRoomFilter] = useState('All Rooms')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'add'>('view')
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'item_code', direction: 'asc' })
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [statusPopoverItemId, setStatusPopoverItemId] = useState<number | null>(null)
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false)
  const [bulkRoomOpen, setBulkRoomOpen] = useState(false)
  const [bulkBrandOpen, setBulkBrandOpen] = useState(false)
  const [bulkBrandValue, setBulkBrandValue] = useState('')
  const [bulkBusy, setBulkBusy] = useState(false)
  const [searchParams] = useSearchParams()
  const activeView: InventoryView = resolveView(searchParams.get('view'))

  // Responsive state
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Reset selection when filters change
  useEffect(() => {
    setSelectedIds(new Set())
  }, [searchTerm, selectedType, selectedStatus, selectedRoomFilter])

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

  const loadInventory = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getInventory()
      setInventory(data.filter((item): item is Item => !!item));
      console.log("Fetched inventory:", data);
    } catch (err) {
      console.error("Error fetching inventory:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch inventory from backend on mount
  useEffect(() => {
    loadInventory()
  }, [loadInventory])

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

  const existingBrands = useMemo(() => {
    const brands = new Set<string>()
    for (const item of inventory) {
      const trimmed = (item.Brand ?? '').trim()
      if (trimmed) brands.add(trimmed)
    }
    return Array.from(brands).sort((a, b) => a.localeCompare(b))
  }, [inventory])

  // const archiveStatuses: Item['Status'][] = ['AVAILABLE', 'BORROWED'];
  const filteredAndSortedInventory = useMemo(() => {
    let result = inventory.filter(item => {
      const matchesSearch = (item.Brand + item.Item_Code + (item.Item_Type ?? '') + (item.Location ?? '') + (item.Room?.Name ?? ''))
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesType = selectedType === 'All Types' || resolveItemType(item.Item_Type) === selectedType;

      const matchesStatus =
        selectedStatus === 'All Status' || item.Status?.toLowerCase() === selectedStatus.toLowerCase();
      const itemRoomId = item.Room_ID ?? item.Room?.Room_ID ?? (item as any).Computers?.[0]?.Room_ID;
      const matchesRoom = selectedRoomFilter === 'All Rooms' || String(itemRoomId ?? '') === selectedRoomFilter;

      return matchesSearch && matchesType && matchesStatus && matchesRoom;
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
            aValue = (a.Location || a.Room?.Name || (a as any).Computers?.[0]?.Room?.Name || '').toLowerCase()
            bValue = (b.Location || b.Room?.Name || (b as any).Computers?.[0]?.Room?.Name || '').toLowerCase()
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
  }, [inventory, searchTerm, selectedType, selectedStatus, selectedRoomFilter, sortConfig])

  // Pagination removed — show all filtered results
  const paginatedInventory = filteredAndSortedInventory

  // If mobile, render the mobile view immediately
  if (isMobile) {
    return <InventoryMobilePage />;
  }

  const handleSaveItem = async (
    payload: Partial<Item> | Partial<Item>[] | { id: number; data: Partial<Item> }
  ) => {
    const sanitizeItemPayload = (item: Partial<Item>): Partial<Item> => ({
      Item_Type: item.Item_Type,
      Brand: item.Brand,
      Serial_Number: item.Serial_Number ?? "",
      Status: item.Status,
      Room_ID: item.Room_ID,
      IsBorrowable: item.IsBorrowable,
    })

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
          updateData = sanitizeItemPayload(payload.data);
        } else if ('Item_ID' in payload && payload.Item_ID != null) {
          itemId = payload.Item_ID;
          updateData = sanitizeItemPayload(payload as Partial<Item>);
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
            Location: updatedItem.Location ?? null,
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
          Location: item.Location ?? null,
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

    } catch (err: any) {
      console.error("Error saving inventory item:", err);
      const body = err?.response?.data || {};
      const status = err?.response?.status;
      const detail = body.message || body.error || err?.message;
      const code = body.code ? ` [${body.code}]` : '';
      console.error(`Inventory save failed [${status}]${code}: ${detail}`, body);
      toast.error(`Save failed${status ? ` (${status})` : ''}${code}: ${detail || 'Unknown error'}`);
    }
  };

  // Column layout: [checkbox] [asset code] [brand] [type] [status] [location] [updated] [actions]
  const columnWidths = '56px 1.3fr 1fr 1fr 1fr 1fr 1fr 110px'

  const toggleSelectOne = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const visibleItemIds = filteredAndSortedInventory
    .map(i => i.Item_ID)
    .filter((id): id is number => id != null)
  const allVisibleSelected =
    visibleItemIds.length > 0 && visibleItemIds.every(id => selectedIds.has(id))
  const someVisibleSelected =
    !allVisibleSelected && visibleItemIds.some(id => selectedIds.has(id))

  const toggleSelectAllVisible = () => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (allVisibleSelected) {
        visibleItemIds.forEach(id => next.delete(id))
      } else {
        visibleItemIds.forEach(id => next.add(id))
      }
      return next
    })
  }

  const handleInlineStatusChange = async (item: Item, newStatus: InventoryStatus) => {
    if (item.Item_ID == null) return
    setStatusPopoverItemId(null)
    try {
      const updated = await updateInventoryItem(item.Item_ID, { Status: newStatus })
      if (updated && 'Item_ID' in updated) {
        setInventory(prev =>
          prev.map(i =>
            i.Item_ID === item.Item_ID
              ? { ...i, Status: (updated as Item).Status ?? newStatus, Updated_At: (updated as Item).Updated_At ?? new Date().toISOString() }
              : i,
          ),
        )
      }
    } catch (err) {
      console.error('Inline status update failed:', err)
    }
  }

  const runBulkUpdate = async (patch: Partial<Item>, labelForToast: string) => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    setBulkBusy(true)
    let ok = 0
    let fail = 0
    try {
      // Sequential loop — simpler error accounting and avoids hammering the API.
      // NOTE: updateInventoryItem already fires its own per-item success toast; we can't
      // suppress it without changing the service. We fire ONE additional summary toast
      // at the end so the user sees the aggregate outcome.
      for (const id of ids) {
        try {
          const updated = await updateInventoryItem(id, patch)
          if (updated && 'Item_ID' in updated) {
            setInventory(prev =>
              prev.map(i =>
                i.Item_ID === id
                  ? {
                      ...i,
                      ...patch,
                      Updated_At: (updated as Item).Updated_At ?? new Date().toISOString(),
                      Room: patch.Room_ID != null ? rooms.find(r => r.Room_ID === patch.Room_ID) ?? i.Room : i.Room,
                    }
                  : i,
              ),
            )
          }
          ok++
        } catch (err) {
          console.error('Bulk update failed for item', id, err)
          fail++
        }
      }
      if (fail === 0) {
        toast.success(`${labelForToast}: updated ${ok} items`)
      } else {
        toast.error(`${labelForToast}: ${ok} updated, ${fail} failed`)
      }
      setSelectedIds(new Set())
    } finally {
      setBulkBusy(false)
      setBulkStatusOpen(false)
      setBulkRoomOpen(false)
      setBulkBrandOpen(false)
      setBulkBrandValue('')
    }
  }

  const showDashboard =
    user?.User_Role === 'LAB_TECH' || user?.User_Role === 'LAB_HEAD'

  const handleFilterByStatus = (status: InventoryStatus | null) => {
    if (status === null) {
      setSelectedStatus('All Status')
    } else if (selectedStatus === status) {
      setSelectedStatus('All Status')
    } else {
      setSelectedStatus(status)
    }
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-white p-4 sm:px-6 lg:px-8 dark:bg-gray-900">
      {/* Header */}
      <div className="mb-3 flex shrink-0 flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventory Management</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Track and manage laboratory equipment and assets</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
      </div>

      {activeView === 'information' && showDashboard ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <LoadingSkeleton rows={6} type="card" />
          ) : (
            <InventoryDashboard
              inventory={inventory}
              onFilterByStatus={handleFilterByStatus}
              activeStatusFilter={selectedStatus}
            />
          )}
        </div>
      ) : (
        <>
      {/* Filters Bar */}
      <div className="mb-3 flex shrink-0 flex-wrap items-center gap-3">
        {/* Search */}
        <div className="min-w-[280px] flex-1">
          <Search searchTerm={searchTerm} onChange={setSearchTerm} showLabel={false} placeholder="Search by brand, code, or type..." />
        </div>

        {/* Type Filter */}
        <div className="min-w-44">
          <FloatingSelect
            id="inventory-type-filter"
            value={selectedType}
            placeholder="All Types"
            options={[
              { value: 'All Types', label: 'All Types' },
              ...[...new Set(inventory.map(item => resolveItemType(item.Item_Type)))].map(type => ({
                value: type,
                label: formatItemType(type) || type,
              })),
            ]}
            onChange={setSelectedType}
          />
        </div>

        {/* Status Filter */}
        <div className="min-w-48">
          <FloatingSelect
            id="inventory-status-filter"
            value={selectedStatus}
            placeholder="All Status"
            options={[
              { value: 'All Status', label: `All Status (${inventory.length})` },
              ...inventoryStatuses.map((status) => {
                const count = inventory.filter(i => i.Status === status).length;
                return {
                  value: status,
                  label: `${status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()} (${count})`,
                };
              }),
            ]}
            onChange={setSelectedStatus}
          />
        </div>

        {/* Room Filter */}
        <div className="min-w-48">
          <FloatingSelect
            id="inventory-room-filter"
            value={selectedRoomFilter}
            placeholder="All Rooms"
            options={[
              { value: 'All Rooms', label: 'All Rooms' },
              ...rooms.map(room => ({ value: String(room.Room_ID), label: room.Name })),
            ]}
            onChange={setSelectedRoomFilter}
          />
        </div>

      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div
          className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm dark:border-indigo-900/40 dark:bg-indigo-950/30"
        >
          <span className="font-semibold text-indigo-900 dark:text-indigo-200">
            {selectedIds.size} selected
          </span>

          {/* Change Status */}
          <div className="relative">
            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => { setBulkStatusOpen(v => !v); setBulkRoomOpen(false); setBulkBrandOpen(false); }}
              className="inline-flex items-center gap-1.5 rounded-md border border-indigo-300 bg-white px-3 py-1.5 text-xs font-medium text-indigo-700 shadow-sm hover:bg-indigo-50 disabled:opacity-50 dark:border-indigo-700 dark:bg-gray-800 dark:text-indigo-300 dark:hover:bg-gray-700"
            >
              <Tag className="h-3.5 w-3.5" />
              Change Status
            </button>
            {bulkStatusOpen && (
              <div className="absolute left-0 top-full z-20 mt-1 min-w-[160px] overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                {inventoryStatuses.map(status => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => runBulkUpdate({ Status: status }, `Status → ${formatItemType(status)}`)}
                    className="block w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    {formatItemType(status)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Move to Room */}
          <div className="relative">
            <button
              type="button"
              disabled={bulkBusy || rooms.length === 0}
              onClick={() => { setBulkRoomOpen(v => !v); setBulkStatusOpen(false); setBulkBrandOpen(false); }}
              className="inline-flex items-center gap-1.5 rounded-md border border-indigo-300 bg-white px-3 py-1.5 text-xs font-medium text-indigo-700 shadow-sm hover:bg-indigo-50 disabled:opacity-50 dark:border-indigo-700 dark:bg-gray-800 dark:text-indigo-300 dark:hover:bg-gray-700"
            >
              Move to Room
            </button>
            {bulkRoomOpen && (
              <div className="absolute left-0 top-full z-20 mt-1 max-h-64 min-w-[200px] overflow-auto rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                {rooms.map(room => (
                  <button
                    key={room.Room_ID}
                    type="button"
                    onClick={() => runBulkUpdate({ Room_ID: room.Room_ID }, `Moved to ${room.Name}`)}
                    className="block w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    {room.Name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Change Brand */}
          <div className="relative">
            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => { setBulkBrandOpen(v => !v); setBulkStatusOpen(false); setBulkRoomOpen(false); }}
              className="inline-flex items-center gap-1.5 rounded-md border border-indigo-300 bg-white px-3 py-1.5 text-xs font-medium text-indigo-700 shadow-sm hover:bg-indigo-50 disabled:opacity-50 dark:border-indigo-700 dark:bg-gray-800 dark:text-indigo-300 dark:hover:bg-gray-700"
            >
              <Pencil className="h-3.5 w-3.5" />
              Change Brand
            </button>
            {bulkBrandOpen && (
              <div className="absolute left-0 top-full z-20 mt-1 min-w-[240px] overflow-hidden rounded-md border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                <input
                  type="text"
                  autoFocus
                  list="existing-brand-options"
                  value={bulkBrandValue}
                  onChange={(e) => setBulkBrandValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && bulkBrandValue.trim() && !bulkBusy) {
                      runBulkUpdate({ Brand: bulkBrandValue.trim() }, `Brand → ${bulkBrandValue.trim()}`)
                    } else if (e.key === 'Escape') {
                      setBulkBrandOpen(false)
                      setBulkBrandValue('')
                    }
                  }}
                  placeholder="Brand name (type or pick existing)"
                  className="mb-2 w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
                />
                <datalist id="existing-brand-options">
                  {existingBrands.map(b => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
                <div className="flex justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => { setBulkBrandOpen(false); setBulkBrandValue('') }}
                    disabled={bulkBusy}
                    className="rounded-md px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => runBulkUpdate({ Brand: bulkBrandValue.trim() }, `Brand → ${bulkBrandValue.trim()}`)}
                    disabled={bulkBusy || !bulkBrandValue.trim()}
                    className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={bulkBusy}
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-gray-600 hover:bg-white/60 hover:text-gray-900 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-800/60 dark:hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </button>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col">
          <Table
            density="compact"
            scrollShadow
            headers={[
            {
              label: (
                <div className="flex items-center justify-center">
                  <input
                    type="checkbox"
                    aria-label="Select all visible items"
                    checked={allVisibleSelected}
                    ref={el => { if (el) el.indeterminate = someVisibleSelected }}
                    onChange={toggleSelectAllVisible}
                    onClick={(e) => e.stopPropagation()}
                    disabled={visibleItemIds.length === 0}
                    className="h-4 w-4 cursor-pointer rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:bg-gray-700"
                  />
                </div>
              ),
              align: 'center' as const,
            },
            { label: 'Asset Code', key: 'item_code', align: 'center' as const },
            { label: 'Brand', key: 'brand' },
            { label: 'Item Type', key: 'type' },
            { label: 'Status', key: 'status' },
            { label: 'Location', key: 'room' },
            { label: 'Last Updated', key: 'updated' },
            { label: '', align: 'right' as const },
            ]}
            sortConfig={sortConfig}
            onSort={handleSort}
            columnWidths={columnWidths}
          >
            {loading ? (
              <div data-full-row>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="border-b border-gray-100 px-6 py-3 dark:border-gray-800"
                    style={{ display: 'grid', gridTemplateColumns: columnWidths }}
                  >
                    <Skeleton className="mx-auto h-4 w-4" />            {/* checkbox */}
                    <Skeleton className="h-4 w-28" />                   {/* asset code */}
                    <Skeleton className="h-4 w-20" />                   {/* brand */}
                    <Skeleton className="h-4 w-24" />                   {/* item type */}
                    <Skeleton className="h-6 w-20 rounded-full" />      {/* status pill */}
                    <Skeleton className="h-4 w-24" />                   {/* location */}
                    <Skeleton className="h-4 w-28" />                   {/* last updated */}
                    <Skeleton className="ml-auto h-8 w-8 rounded-md" /> {/* action */}
                  </div>
                ))}
              </div>
            ) : filteredAndSortedInventory.length === 0 && inventory.length === 0 ? (
              <EmptyState
                icon={Package}
                title="No inventory items"
                description="Add your first item to get started."
                action={{ label: 'Add Item', onClick: () => { setModalMode('add'); setSelectedItem(null); setIsModalOpen(true); } }}
              />
            ) : filteredAndSortedInventory.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 w-full min-h-full" data-full-row>
                <div className="p-4 bg-gray-100 dark:bg-gray-800/50 rounded-full mb-4">
                  <Filter className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                  No items match your filters
                </h3>
                <button
                  onClick={() => { setSearchTerm(''); setSelectedType('All Types'); setSelectedStatus('All Status'); setSelectedRoomFilter('All Rooms'); }}
                  className="mt-4 inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              paginatedInventory.map((item) => {
              const border = item.Status ? statusBorder[item.Status] : 'border-l-gray-300'
              const isSelected = item.Item_ID != null && selectedIds.has(item.Item_ID)
              const openRow = () => {
                setSelectedItem({ ...item });
                setModalMode('view');
                setIsModalOpen(true);
              }
              return (
                <div
                  key={item.Item_ID}
                  data-full-row
                  role="button"
                  tabIndex={0}
                  onClick={openRow}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      openRow()
                    }
                  }}
                  className={`group relative grid w-full cursor-pointer items-center border-b border-l-4 ${border} border-gray-200 py-3 text-left transition-all duration-150 hover:bg-indigo-50/50 focus:bg-indigo-50 focus:outline-none dark:border-gray-700/50 dark:hover:bg-indigo-900/10 dark:focus:bg-indigo-900/20 [&>*]:px-4 ${isSelected ? 'bg-indigo-50/60 dark:bg-indigo-900/20' : ''}`}
                  style={{ display: 'grid', gridTemplateColumns: columnWidths }}
                >
                  {/* Checkbox */}
                  <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      aria-label={`Select ${item.Item_Code ?? 'item'}`}
                      checked={isSelected}
                      onChange={() => item.Item_ID != null && toggleSelectOne(item.Item_ID)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 cursor-pointer rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700"
                    />
                  </div>

                  {/* Asset Code */}
                  <div className="min-w-0 text-center">
                    <div className="truncate text-sm font-semibold text-gray-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
                      {item.Item_Code ?? '—'}
                    </div>
                    {(() => {
                      const pcName = (item as any).Computers?.[0]?.Name as string | undefined
                      return pcName ? (
                        <div className="truncate text-[11px] text-indigo-600 dark:text-indigo-400">
                          PC: {pcName}
                        </div>
                      ) : null
                    })()}
                  </div>

                  {/* Brand */}
                  <div className="flex justify-center text-sm font-medium text-gray-700 dark:text-gray-300">
                    {formatBrand(item.Brand)}
                  </div>

                  {/* Item Type (title-cased display; legacy "-"/"GENERAL" shown as Other) */}
                  <div className="flex justify-center">
                    <span className="inline-flex items-center justify-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">
                      {formatItemType(resolveItemType(item.Item_Type))}
                    </span>
                  </div>

                  {/* Status pill */}
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
                                : item.Status === "DISPOSED"
                                  ? "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                                  : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                        }`}
                    >
                      {(item.Status ?? "AVAILABLE").charAt(0).toUpperCase() + (item.Status ?? "AVAILABLE").slice(1).toLowerCase()}
                    </span>
                  </div>

                  {/* Location (resolved to Room) */}
                  <div className="flex justify-center text-sm text-gray-600 dark:text-gray-400">
                    {item.Room?.Name || ((item as any).Computers?.[0]?.Room?.Name) || '—'}
                  </div>

                  {/* Updated */}
                  <div className="flex justify-center text-sm text-gray-600 dark:text-gray-400">
                    {item.Updated_At
                      ? new Date(item.Updated_At).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                      : '—'}
                  </div>

                  {/* Hover actions */}
                  <div
                    className="relative flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      title="Edit"
                      aria-label="Edit item"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedItem({ ...item });
                        setModalMode('edit');
                        setIsModalOpen(true);
                      }}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-500 hover:bg-indigo-100 hover:text-indigo-700 dark:text-gray-400 dark:hover:bg-indigo-900/40 dark:hover:text-indigo-300"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Change status"
                      aria-label="Change status"
                      onClick={(e) => {
                        e.stopPropagation()
                        setStatusPopoverItemId(
                          statusPopoverItemId === item.Item_ID ? null : item.Item_ID ?? null,
                        )
                      }}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-500 hover:bg-indigo-100 hover:text-indigo-700 dark:text-gray-400 dark:hover:bg-indigo-900/40 dark:hover:text-indigo-300"
                    >
                      <Tag className="h-3.5 w-3.5" />
                    </button>

                    {statusPopoverItemId === item.Item_ID && (
                      <div
                        className="absolute right-0 top-full z-20 mt-1 min-w-[140px] overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {inventoryStatuses.map(status => (
                          <button
                            key={status}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleInlineStatusChange(item, status)
                            }}
                            className={`block w-full px-3 py-1.5 text-left text-xs hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-gray-700 ${item.Status === status ? 'bg-indigo-50 font-semibold text-indigo-700 dark:bg-gray-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-200'}`}
                          >
                            {formatItemType(status)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
              })
            )}
          </Table>
        </div>

      </div>
        </>
      )}

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
