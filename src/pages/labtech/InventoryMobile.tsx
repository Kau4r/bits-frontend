import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Edit3, Filter, Plus, X, ScanLine } from 'lucide-react';
import Search from '@/components/Search';
import { inventoryStatuses, statusColors, type Item } from '@/types/inventory';
import type { Room } from '@/types/room';
import { createInventoryBulk, getInventory, updateInventoryItem } from '@/services/inventory';
import { getRooms } from '@/services/room';
import { FloatingSelect } from '@/ui/FloatingSelect';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { formatItemType, resolveItemType, formatBrand } from '@/lib/utils';
import { isLabStaffRole } from '@/types/user';

type ModalMode = 'view' | 'edit' | 'add';

type InventoryFormData = {
    Item_Type: string;
    Brand: string;
    Location: string;
    Serial_Number: string;
    Status: Item['Status'];
    Room_ID: number;
    IsBorrowable: boolean;
};

interface MobileInventoryModalProps {
    isOpen: boolean;
    mode: ModalMode;
    item: Item | null;
    rooms: Room[];
    canEdit: boolean;
    onClose: () => void;
    onEdit: () => void;
    onSave: (payload: {
        Item_Type: string;
        Brand: string;
        Location?: string | null;
        Serial_Number: string;
        Status: Item['Status'];
        Room_ID?: number;
        IsBorrowable: boolean;
    }) => Promise<void>;
}

const normalizeItemType = (value: string) => {
    const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, '_');
    return normalized === 'SYSTEM_UNIT' ? 'MINI_PC' : normalized;
};

const getDefaultFormData = (item: Item | null, rooms: Room[]): InventoryFormData => ({
    Item_Type: item?.Item_Type || '',
    Brand: item?.Brand || '',
    Location: item?.Location || '',
    Serial_Number: item?.Serial_Number || '',
    Status: item?.Status || 'AVAILABLE',
    Room_ID: item?.Room_ID || rooms[0]?.Room_ID || 0,
    IsBorrowable: Boolean(item?.IsBorrowable),
});

const MobileInventoryModal = ({
    isOpen,
    mode,
    item,
    rooms,
    canEdit,
    onClose,
    onEdit,
    onSave,
}: MobileInventoryModalProps) => {
    const [formData, setFormData] = useState<InventoryFormData>(() => getDefaultFormData(item, rooms));
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setFormData(getDefaultFormData(item, rooms));
    }, [isOpen, item, rooms]);

    if (!isOpen) return null;

    const readOnly = mode === 'view';
    const title = mode === 'add' ? 'Add Item' : mode === 'edit' ? 'Edit Item' : 'Item Details';
    const selectedRoom = rooms.find(room => room.Room_ID === formData.Room_ID);

    const handleSubmit = async () => {
        if (!formData.Item_Type.trim()) {
            toast.error('Item type is required');
            return;
        }
        if (!formData.Brand.trim()) {
            toast.error('Brand is required');
            return;
        }

        setSaving(true);
        try {
            await onSave({
                ...formData,
                Item_Type: normalizeItemType(formData.Item_Type),
                Brand: formData.Brand.trim(),
                Serial_Number: formData.Serial_Number.trim(),
                Room_ID: formData.Room_ID || undefined,
            });
        } finally {
            setSaving(false);
        }
    };

    const fieldClass = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm font-semibold text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white';
    const detailCardClass = 'rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900';

    return (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="max-h-[90vh] w-full overflow-hidden rounded-t-lg border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-950"
                onClick={event => event.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-950">
                    <div>
                        <h2 className="text-lg font-black text-gray-900 dark:text-white">{title}</h2>
                        {item?.Item_Code && (
                            <p className="mt-0.5 font-mono text-xs font-semibold text-gray-500 dark:text-gray-400">{item.Item_Code}</p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                        aria-label="Close item modal"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="max-h-[calc(90vh-145px)] overflow-y-auto px-4 py-4">
                    {readOnly ? (
                        <div className="space-y-3">
                            <div className={detailCardClass}>
                                <p className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Item Type</p>
                                <p className="mt-1 text-base font-black text-gray-900 dark:text-white">{formatItemType(formData.Item_Type) || 'N/A'}</p>
                            </div>
                            <div className={detailCardClass}>
                                <p className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Brand</p>
                                <p className="mt-1 text-base font-black text-gray-900 dark:text-white">{formatBrand(formData.Brand)}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className={detailCardClass}>
                                    <p className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Status</p>
                                    <p className="mt-1 text-base font-black text-gray-900 dark:text-white">{formatItemType(formData.Status)}</p>
                                </div>
                                <div className={detailCardClass}>
                                    <p className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Location</p>
                                    <p className="mt-1 text-base font-black text-gray-900 dark:text-white">{formData.Location || selectedRoom?.Name || 'N/A'}</p>
                                </div>
                            </div>
                            <div className={detailCardClass}>
                                <p className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Serial Number</p>
                                <p className="mt-1 break-all text-base font-black text-gray-900 dark:text-white">{formData.Serial_Number || 'N/A'}</p>
                            </div>
                            <div className={detailCardClass}>
                                <p className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Borrowable</p>
                                <p className="mt-1 text-base font-black text-gray-900 dark:text-white">{formData.IsBorrowable ? 'Yes' : 'No'}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <label className="mb-1.5 block text-sm font-bold text-gray-700 dark:text-gray-200">Item Type</label>
                                <input
                                    value={formData.Item_Type}
                                    onChange={event => setFormData(prev => ({ ...prev, Item_Type: event.target.value }))}
                                    className={fieldClass}
                                    placeholder="HDMI, PROJECTOR, OTHER"
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-sm font-bold text-gray-700 dark:text-gray-200">Brand</label>
                                <input
                                    value={formData.Brand}
                                    onChange={event => setFormData(prev => ({ ...prev, Brand: event.target.value }))}
                                    className={fieldClass}
                                    placeholder="Enter brand"
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-sm font-bold text-gray-700 dark:text-gray-200">Serial Number</label>
                                <input
                                    value={formData.Serial_Number}
                                    onChange={event => setFormData(prev => ({ ...prev, Serial_Number: event.target.value }))}
                                    className={fieldClass}
                                    placeholder="Enter serial number"
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-sm font-bold text-gray-700 dark:text-gray-200">Location</label>
                                <FloatingSelect
                                    id="mobile-item-modal-room"
                                    value={formData.Room_ID}
                                    placeholder="Select location"
                                    options={rooms.map(room => ({ value: room.Room_ID, label: room.Name }))}
                                    onChange={value => setFormData(prev => ({ ...prev, Room_ID: Number(value) }))}
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-sm font-bold text-gray-700 dark:text-gray-200">Status</label>
                                <FloatingSelect
                                    id="mobile-item-modal-status"
                                    value={formData.Status}
                                    placeholder="Select status"
                                    options={inventoryStatuses.map(status => ({ value: status, label: formatItemType(status) }))}
                                    onChange={value => setFormData(prev => ({ ...prev, Status: value as Item['Status'] }))}
                                />
                            </div>
                            <label className="flex items-center justify-between rounded-lg border border-gray-200 p-3 text-sm font-bold text-gray-700 dark:border-gray-700 dark:text-gray-200">
                                Borrowable Item
                                <input
                                    type="checkbox"
                                    checked={formData.IsBorrowable}
                                    onChange={event => setFormData(prev => ({ ...prev, IsBorrowable: event.target.checked }))}
                                    className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                            </label>
                        </div>
                    )}
                </div>

                <div className="flex gap-2 border-t border-gray-200 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-950">
                    {readOnly && canEdit ? (
                        <button
                            type="button"
                            onClick={onEdit}
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-bold text-white"
                        >
                            <Edit3 className="h-4 w-4" />
                            Edit
                        </button>
                    ) : !readOnly ? (
                        <button
                            type="button"
                            onClick={() => void handleSubmit()}
                            disabled={saving}
                            className="flex-1 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
                        >
                            {saving ? 'Saving...' : 'Save'}
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-bold text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                        >
                            Close
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const InventoryMobilePage = () => {
    const { user, userRole } = useAuth();
    const canEditInventory = isLabStaffRole(userRole);
    const [inventory, setInventory] = useState<Item[]>([]);
    const [selectedItem, setSelectedItem] = useState<Item | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<ModalMode>('view');

    const [rooms, setRooms] = useState<Room[]>([]);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedType, setSelectedType] = useState('All Types');
    const [selectedStatus, setSelectedStatus] = useState('All Status');
    // Empty until rooms load; then defaulted to the first room. Inventory
    // is fetched lazily per-room — other rooms are never preloaded.
    const [selectedRoomFilter, setSelectedRoomFilter] = useState('');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const loadInventory = async (roomId: number) => {
        try {
            const data = await getInventory(roomId);
            setInventory(data.filter((item): item is Item => !!item && 'Item_Code' in item));
        } catch (err) {
            console.error('Error fetching inventory:', err);
            toast.error('Failed to load inventory');
        }
    };

    useEffect(() => {
        const loadRooms = async () => {
            try {
                const roomsData = await getRooms();
                setRooms(roomsData);
                const firstId = roomsData[0]?.Room_ID;
                if (firstId != null) {
                    setSelectedRoomFilter(prev => prev || String(firstId));
                }
            } catch (err) {
                console.error('Error fetching rooms:', err);
            }
        };
        loadRooms();
    }, []);

    useEffect(() => {
        if (!selectedRoomFilter) return;
        const roomId = Number(selectedRoomFilter);
        if (Number.isNaN(roomId)) return;
        void loadInventory(roomId);
    }, [selectedRoomFilter]);

    const handleSaveItem = async (payload: {
        Item_Type: string;
        Brand: string;
        Location?: string | null;
        Serial_Number: string;
        Status: Item['Status'];
        Room_ID?: number;
        IsBorrowable: boolean;
    }) => {
        try {
            if (modalMode === 'edit' && selectedItem?.Item_ID) {
                await updateInventoryItem(selectedItem.Item_ID, payload);
            } else {
                const userId = user?.User_ID ?? Number(localStorage.getItem('userId') || 0);
                await createInventoryBulk([payload as Omit<Item, 'Item_ID'>], userId);
                toast.success('Item added');
            }
            setIsModalOpen(false);
            setSelectedItem(null);
            setModalMode('view');
            const activeRoomId = Number(selectedRoomFilter);
            if (!Number.isNaN(activeRoomId)) {
                await loadInventory(activeRoomId);
            }
        } catch (error) {
            console.error('Error saving inventory item:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to save item');
        }
    };

    const filteredInventory = inventory.filter(item => {
        const matchesSearch = (item.Brand + item.Item_Code + (item.Item_Type ?? '') + (item.Location ?? '') + (item.Room?.Name ?? ''))
            .toLowerCase()
            .includes(searchTerm.toLowerCase());
        const matchesType = selectedType === 'All Types' || resolveItemType(item.Item_Type) === selectedType;
        const matchesStatus = selectedStatus === 'All Status' || item.Status?.toLowerCase() === selectedStatus.toLowerCase();
        // Room scope is enforced server-side via getInventory(roomId).
        return matchesSearch && matchesType && matchesStatus;
    });

    return (
        <div className="flex min-h-full flex-col gap-4 bg-gray-50 px-4 py-4 dark:bg-gray-950">
            <header className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                <p className="text-xs font-bold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">Inventory Management</p>
                <h1 className="mt-1 text-xl font-black text-gray-900 dark:text-white">Mobile Inventory</h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Scan, search, and update laboratory assets.</p>
            </header>

            <Link
                to="/inventory-audit"
                className="flex items-center justify-between rounded-lg border border-indigo-200 bg-indigo-50 p-4 shadow-sm transition-colors hover:bg-indigo-100 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/60"
            >
                <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-indigo-600 p-2 text-white">
                        <ScanLine className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-sm font-black text-indigo-900 dark:text-indigo-200">Start Semestral Audit</p>
                        <p className="text-xs text-indigo-700 dark:text-indigo-300/80">Scan QR codes to check room inventory</p>
                    </div>
                </div>
                <span className="text-indigo-600 dark:text-indigo-300">→</span>
            </Link>

            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-2 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                <div className="min-w-0 flex-1">
                    <Search searchTerm={searchTerm} onChange={setSearchTerm} showLabel={false} />
                </div>
                <button
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                    onClick={() => setIsFilterOpen(true)}
                    aria-label="Open inventory filters"
                >
                    <Filter className="h-5 w-5" />
                </button>
            </div>

            {isFilterOpen && (
                <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setIsFilterOpen(false)}>
                    <div
                        className="absolute bottom-0 left-0 right-0 z-50 space-y-4 rounded-t-lg border border-gray-200 bg-white p-4 shadow-2xl dark:border-gray-700 dark:bg-gray-950"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between">
                            <h2 className="text-base font-black text-gray-900 dark:text-white">Filters</h2>
                            <button
                                type="button"
                                onClick={() => setIsFilterOpen(false)}
                                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-bold text-gray-900 dark:text-white">Type</label>
                            <FloatingSelect
                                id="mobile-inventory-type"
                                value={selectedType}
                                placeholder="All Types"
                                options={[
                                    { value: 'All Types', label: 'All Types' },
                                    ...[...new Set(inventory.map(i => resolveItemType(i.Item_Type)))]
                                        .map(type => ({
                                            value: type,
                                            label: formatItemType(type),
                                        }))
                                        .sort((a, b) => a.label.localeCompare(b.label)),
                                ]}
                                onChange={setSelectedType}
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-bold text-gray-900 dark:text-white">Status</label>
                            <FloatingSelect
                                id="mobile-inventory-status"
                                value={selectedStatus}
                                placeholder="All Status"
                                options={[
                                    { value: 'All Status', label: 'All Status' },
                                    ...inventoryStatuses.map(status => ({
                                        value: status,
                                        label: formatItemType(status),
                                    })),
                                ]}
                                onChange={setSelectedStatus}
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-bold text-gray-900 dark:text-white">Location</label>
                            <FloatingSelect
                                id="mobile-inventory-room"
                                value={selectedRoomFilter}
                                placeholder="Select room"
                                options={[...rooms]
                                    .sort((a, b) => a.Name.localeCompare(b.Name))
                                    .map(room => ({ value: String(room.Room_ID), label: room.Name }))}
                                onChange={setSelectedRoomFilter}
                            />
                        </div>
                        <button
                            className="mt-2 w-full rounded-lg bg-indigo-600 py-3 text-sm font-bold text-white"
                            onClick={() => setIsFilterOpen(false)}
                        >
                            Apply Filters
                        </button>
                    </div>
                </div>
            )}

            {canEditInventory && (
                <button
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-3 text-sm font-bold text-white shadow-sm"
                    onClick={() => { setSelectedItem(null); setModalMode('add'); setIsModalOpen(true); }}
                >
                    <Plus className="h-5 w-5" />
                    Add Item
                </button>
            )}

            <div className="flex flex-col gap-3">
                {filteredInventory.length > 0 ? filteredInventory.map(item => (
                    <div
                        key={`${item.Item_ID}-${item.Item_Code}`}
                        onClick={() => { setSelectedItem({ ...item }); setModalMode('view'); setIsModalOpen(true); }}
                        className="cursor-pointer rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-colors active:bg-indigo-50 dark:border-gray-700 dark:bg-gray-900 dark:active:bg-indigo-950/30"
                    >
                        <div className="mb-2 flex items-start justify-between gap-3">
                            <span className="font-mono text-sm font-black text-gray-900 dark:text-white">{item.Item_Code}</span>
                            <span className="rounded-full bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-200">{formatItemType(resolveItemType(item.Item_Type))}</span>
                        </div>
                        <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">{formatBrand(item.Brand)}</div>
                        <div className="mt-3 flex items-center justify-between gap-3">
                            <span className={`rounded-full px-2 py-1 text-xs font-bold ${statusColors[item.Status] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'}`}>
                                {formatItemType(item.Status)}
                            </span>
                            <span className="truncate text-xs font-medium text-gray-600 dark:text-gray-400">{item.Location || item.Room?.Name || '-'}</span>
                        </div>
                    </div>
                )) : (
                    <div className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center dark:border-gray-700 dark:bg-gray-900">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">No inventory items found</p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Try changing your search or filters.</p>
                    </div>
                )}
            </div>

            <MobileInventoryModal
                isOpen={isModalOpen}
                item={modalMode !== 'add' ? selectedItem : null}
                mode={modalMode}
                rooms={rooms}
                canEdit={canEditInventory}
                onClose={() => { setIsModalOpen(false); setSelectedItem(null); setModalMode('view'); }}
                onEdit={() => setModalMode('edit')}
                onSave={handleSaveItem}
            />
        </div>
    );
};

export default InventoryMobilePage;
