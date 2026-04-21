import { useState, useRef, useEffect } from 'react';
import { BrowserQRCodeReader } from '@zxing/browser';
import { Edit3, Filter, Plus, QrCode, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Search from '@/components/Search';
import { type Item } from '@/types/inventory';
import type { Room } from '@/types/room';
import { createInventoryBulk, getInventory, updateInventoryItem } from '@/services/inventory';
import { getRooms } from '@/services/room';
import { buildInventoryItemPath, parseInventoryQrValue } from '@/utils/inventoryQr';
import { FloatingSelect } from '@/ui/FloatingSelect';
import toast from 'react-hot-toast';

type ModalMode = 'view' | 'edit' | 'add';

interface MobileInventoryModalProps {
    isOpen: boolean;
    mode: ModalMode;
    item: Item | null;
    rooms: Room[];
    itemTypes: string[];
    onClose: () => void;
    onEdit: () => void;
    onSave: (payload: {
        Item_Type: string;
        Brand: string;
        Serial_Number: string;
        Status: Item['Status'];
        Room_ID?: number;
        IsBorrowable: boolean;
    }) => Promise<void>;
}

const MobileInventoryModal = ({
    isOpen,
    mode,
    item,
    rooms,
    itemTypes,
    onClose,
    onEdit,
    onSave,
}: MobileInventoryModalProps) => {
    const [formData, setFormData] = useState({
        Item_Type: 'GENERAL',
        Brand: '',
        Serial_Number: '',
        Status: 'AVAILABLE' as Item['Status'],
        Room_ID: 0,
        IsBorrowable: false,
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        setFormData({
            Item_Type: item?.Item_Type || itemTypes[0] || 'GENERAL',
            Brand: item?.Brand || '',
            Serial_Number: item?.Serial_Number || '',
            Status: item?.Status || 'AVAILABLE',
            Room_ID: item?.Room_ID || rooms[0]?.Room_ID || 0,
            IsBorrowable: Boolean(item?.IsBorrowable),
        });
    }, [isOpen, item, itemTypes, rooms]);

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
                Item_Type: formData.Item_Type.trim().toUpperCase().replace(/[\s-]+/g, '_'),
                Brand: formData.Brand.trim(),
                Serial_Number: formData.Serial_Number.trim(),
                Room_ID: formData.Room_ID || undefined,
            });
        } finally {
            setSaving(false);
        }
    };

    const fieldClass = "w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:disabled:bg-gray-800";

    return (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={onClose}>
            <div
                className="max-h-[88vh] w-full overflow-hidden rounded-t-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-950"
                onClick={event => event.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-gray-200 px-4 py-4 dark:border-gray-800">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
                        {item?.Item_Code && (
                            <p className="mt-0.5 font-mono text-xs text-gray-500 dark:text-gray-400">{item.Item_Code}</p>
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

                <div className="max-h-[calc(88vh-145px)] overflow-y-auto px-4 py-4">
                    {readOnly ? (
                        <div className="space-y-3">
                            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
                                <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Item Type</p>
                                <p className="mt-1 text-base font-bold text-gray-900 dark:text-white">{formData.Item_Type || 'N/A'}</p>
                            </div>
                            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
                                <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Brand</p>
                                <p className="mt-1 text-base font-bold text-gray-900 dark:text-white">{formData.Brand || 'N/A'}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
                                    <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Status</p>
                                    <p className="mt-1 text-base font-bold text-gray-900 dark:text-white">{formData.Status}</p>
                                </div>
                                <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
                                    <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Room</p>
                                    <p className="mt-1 text-base font-bold text-gray-900 dark:text-white">{selectedRoom?.Name || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
                                <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Serial Number</p>
                                <p className="mt-1 break-all text-base font-bold text-gray-900 dark:text-white">{formData.Serial_Number || 'N/A'}</p>
                            </div>
                            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
                                <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Borrowable</p>
                                <p className="mt-1 text-base font-bold text-gray-900 dark:text-white">{formData.IsBorrowable ? 'Yes' : 'No'}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-200">Item Type</label>
                                <FloatingSelect
                                    id="mobile-item-modal-type"
                                    value={formData.Item_Type}
                                    placeholder="Select item type"
                                    options={itemTypes.map(type => ({ value: type, label: type }))}
                                    onChange={value => setFormData(prev => ({ ...prev, Item_Type: String(value) }))}
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-200">Brand</label>
                                <input
                                    value={formData.Brand}
                                    onChange={event => setFormData(prev => ({ ...prev, Brand: event.target.value }))}
                                    className={fieldClass}
                                    placeholder="Enter brand"
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-200">Serial Number</label>
                                <input
                                    value={formData.Serial_Number}
                                    onChange={event => setFormData(prev => ({ ...prev, Serial_Number: event.target.value }))}
                                    className={fieldClass}
                                    placeholder="Enter serial number"
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-200">Room</label>
                                <FloatingSelect
                                    id="mobile-item-modal-room"
                                    value={formData.Room_ID}
                                    placeholder="Select room"
                                    options={rooms.map(room => ({ value: room.Room_ID, label: room.Name }))}
                                    onChange={value => setFormData(prev => ({ ...prev, Room_ID: Number(value) }))}
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-200">Status</label>
                                <FloatingSelect
                                    id="mobile-item-modal-status"
                                    value={formData.Status}
                                    placeholder="Select status"
                                    options={['AVAILABLE', 'BORROWED', 'DEFECTIVE', 'LOST', 'REPLACED'].map(status => ({ value: status, label: status }))}
                                    onChange={value => setFormData(prev => ({ ...prev, Status: value as Item['Status'] }))}
                                />
                            </div>
                            <label className="flex items-center justify-between rounded-lg border border-gray-200 p-3 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-200">
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

                <div className="flex gap-2 border-t border-gray-200 px-4 py-4 dark:border-gray-800">
                    {readOnly ? (
                        <button
                            type="button"
                            onClick={onEdit}
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-yellow-600 px-4 py-3 text-sm font-bold text-white"
                        >
                            <Edit3 className="h-4 w-4" />
                            Edit
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => void handleSubmit()}
                            disabled={saving}
                            className="flex-1 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
                        >
                            {saving ? 'Saving...' : 'Save'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const InventoryMobilePage = () => {
    const navigate = useNavigate();
    const [isQrOpen, setIsQrOpen] = useState(false);
    const [inventory, setInventory] = useState<Item[]>([]);
    const [selectedItem, setSelectedItem] = useState<Item | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<ModalMode>('view');

    const [rooms, setRooms] = useState<Room[]>([]);
    const videoRef = useRef<HTMLVideoElement>(null);
    const codeReaderRef = useRef<BrowserQRCodeReader | null>(null);
    const qrControlsRef = useRef<{ stop: () => void } | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedType, setSelectedType] = useState('All Types');
    const [selectedStatus, setSelectedStatus] = useState('All Status');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const inventoryStatuses = ['AVAILABLE', 'BORROWED', 'DEFECTIVE'];
    const itemTypes = [...new Set(['GENERAL', 'HDMI', 'VGA', 'ADAPTER', 'PROJECTOR', 'EXTENSION', 'MOUSE', 'KEYBOARD', 'MONITOR', 'SYSTEM_UNIT', 'OTHER', ...inventory.map(item => item.Item_Type).filter(Boolean)])];

    const loadInventory = async () => {
        try {
            const data = await getInventory();
            setInventory(data.filter((item): item is Item => !!item));
        } catch (err) {
            console.error('Error fetching inventory:', err);
            toast.error('Failed to load inventory');
        }
    };

    // Load rooms for adding/updating items
    useEffect(() => {
        const loadRooms = async () => {
            try {
                const roomsData = await getRooms();
                setRooms(roomsData);
            } catch (err) {
                console.error('Error fetching rooms:', err);
            }
        };
        loadRooms();
    }, []);

    // Load inventory
    useEffect(() => {
        void loadInventory();
    }, []);

    const handleSaveItem = async (payload: {
        Item_Type: string;
        Brand: string;
        Serial_Number: string;
        Status: Item['Status'];
        Room_ID?: number;
        IsBorrowable: boolean;
    }) => {
        try {
            if (modalMode === 'edit' && selectedItem?.Item_ID) {
                await updateInventoryItem(selectedItem.Item_ID, payload);
                toast.success('Item updated');
            } else {
                const userId = Number(localStorage.getItem('userId') || 0);
                await createInventoryBulk([payload as Omit<Item, 'Item_ID'>], userId);
                toast.success('Item added');
            }
            setIsModalOpen(false);
            setSelectedItem(null);
            setModalMode('view');
            await loadInventory();
        } catch (error) {
            console.error('Error saving inventory item:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to save item');
        }
    };

    // Filtered inventory
    const filteredInventory = inventory.filter(item => {
        const matchesSearch = (item.Brand + item.Item_Code + (item.Item_Type ?? ''))
            .toLowerCase()
            .includes(searchTerm.toLowerCase());
        const matchesType = selectedType === 'All Types' || item.Item_Type === selectedType;
        const matchesStatus = selectedStatus === 'All Status' || item.Status?.toLowerCase() === selectedStatus.toLowerCase();
        return matchesSearch && matchesType && matchesStatus;
    });

    // QR Scanner setup
    useEffect(() => {
        if (!isQrOpen || !videoRef.current) return;

        const reader = new BrowserQRCodeReader();
        codeReaderRef.current = reader;

        let stopped = false;

        const start = async () => {
            try {
                const devices = await BrowserQRCodeReader.listVideoInputDevices();
                const backCamera =
                    devices.find(d => /back|rear|environment/i.test(d.label))?.deviceId ??
                    devices[0]?.deviceId;

                const controls = await reader.decodeFromVideoDevice(
                    backCamera,
                    videoRef.current!,
                    (result, error) => {
                        if (result && !stopped) {
                            const scan = parseInventoryQrValue(result.getText());

                            if (scan.isItemUrl && scan.itemCode) {
                                stopped = true;
                                qrControlsRef.current?.stop();
                                setIsQrOpen(false);
                                navigate(buildInventoryItemPath(scan.itemCode));
                                return;
                            }

                            const item = inventory.find(
                                i => i.Serial_Number === scan.rawValue || i.Item_Code === scan.rawValue
                            );

                            if (item) {
                                stopped = true;
                                qrControlsRef.current?.stop();
                                setIsQrOpen(false);
                                setSelectedItem(item);
                                setModalMode('view');
                                setIsModalOpen(true);
                            }
                        }

                        if (error && error.name !== 'NotFoundException') {
                            console.error(error);
                        }
                    }
                );

                qrControlsRef.current = controls;
            } catch (err) {
                console.error('QR start failed:', err);
            }
        };

        start();

        return () => {
            stopped = true;
            qrControlsRef.current?.stop();
            qrControlsRef.current = null;
            codeReaderRef.current = null;
        };
    }, [isQrOpen, inventory, navigate]);

    return (
        <div className="px-4 py-4 space-y-4">
            {/* Search + QR + Filter */}
            <div className="flex items-center gap-2">
                <Search searchTerm={searchTerm} onChange={setSearchTerm} showLabel={false} />
                <button
                    className="p-2 bg-gray-100 dark:bg-gray-800 rounded-md"
                    onClick={() => setIsQrOpen(true)}
                >
                    <QrCode className="w-5 h-5 text-gray-900 dark:text-gray-200" />
                </button>

                <button
                    className="p-2 bg-gray-100 dark:bg-gray-800 rounded-md flex items-center gap-1"
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                >
                    <Filter className="w-5 h-5 text-gray-900 dark:text-gray-200" />
                </button>
            </div>

            {/* Filter Modal */}
            {isFilterOpen && (
                <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)}>
                    <div
                        className="absolute top-32 left-4 right-4 bg-white dark:bg-gray-900 p-4 rounded-md shadow-lg border border-gray-300 dark:border-gray-700 z-50 space-y-3"
                        onClick={e => e.stopPropagation()}
                    >
                        <div>
                            <label className="text-sm font-medium text-gray-900 dark:text-white">Type</label>
                            <FloatingSelect
                                id="mobile-inventory-type"
                                value={selectedType}
                                placeholder="All Types"
                                options={[
                                    { value: 'All Types', label: 'All Types' },
                                    ...[...new Set(inventory.map(i => i.Item_Type).filter(Boolean))].map(type => ({
                                        value: type,
                                        label: type,
                                    })),
                                ]}
                                onChange={setSelectedType}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-900 dark:text-white">Status</label>
                            <FloatingSelect
                                id="mobile-inventory-status"
                                value={selectedStatus}
                                placeholder="All Status"
                                options={[
                                    { value: 'All Status', label: 'All Status' },
                                    ...inventoryStatuses.map(status => ({
                                        value: status,
                                        label: status,
                                    })),
                                ]}
                                onChange={setSelectedStatus}
                            />
                        </div>
                        <button
                            className="w-full bg-indigo-600 text-white mt-3 py-2 rounded-md"
                            onClick={() => setIsFilterOpen(false)}
                        >
                            Apply
                        </button>
                    </div>
                </div>
            )}

            {/* Add Item */}
            <button
                className="w-full flex items-center justify-center gap-2 rounded-md bg-indigo-600 text-white py-2"
                onClick={() => { setModalMode('add'); setIsModalOpen(true); }}
            >
                <Plus className="h-5 w-5" />
                Add Item
            </button>

            {/* Inventory List */}
            <div className="flex flex-col gap-3">
                {filteredInventory.map(item => (
                    <div
                        key={`${item.Item_ID}-${item.Item_Code}`}
                        onClick={() => { setSelectedItem({ ...item }); setModalMode('view'); setIsModalOpen(true); }}
                        className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm bg-white dark:bg-slate-900 cursor-pointer"
                    >
                        <div className="flex justify-between items-start mb-2">
                            <span className="font-semibold text-gray-900 dark:text-white">{item.Item_Code}</span>
                            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white">{item.Item_Type}</span>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">{item.Brand}</div>
                        <div className="flex justify-between mt-2">
                            <span
                                className={`text-xs px-2 py-1 rounded-full ${item.Status === 'AVAILABLE'
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                    : item.Status === 'BORROWED'
                                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                        : item.Status === 'DEFECTIVE'
                                            ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                                            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                                    }`}
                            >
                                {item.Status}
                            </span>
                            <span className="text-xs text-gray-600 dark:text-gray-400">{item.Room?.Name ?? '—'}</span>
                        </div>
                    </div>
                ))}
            </div>

            {isQrOpen && (
                <div
                    className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
                    onClick={() => setIsQrOpen(false)}
                >
                    <div
                        className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-xl border border-gray-200 dark:border-gray-700 max-w-sm w-full"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Scan QR Code</h3>
                            <button
                                onClick={() => setIsQrOpen(false)}
                                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="flex justify-center">
                            <video ref={videoRef} className="w-full aspect-square object-cover border border-gray-200 dark:border-gray-700 rounded-lg bg-black" />
                        </div>

                        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
                            Point your camera at a QR code to scan
                        </p>
                    </div>
                </div>
            )}

            <MobileInventoryModal
                isOpen={isModalOpen}
                item={modalMode !== 'add' ? selectedItem : null}
                mode={modalMode}
                rooms={rooms}
                itemTypes={itemTypes}
                onClose={() => { setIsModalOpen(false); setSelectedItem(null); }}
                onEdit={() => setModalMode('edit')}
                onSave={handleSaveItem}
            />
        </div>
    );
};

export default InventoryMobilePage;
