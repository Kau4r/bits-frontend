import { useState, useRef, useEffect } from 'react';
import { BrowserQRCodeReader } from '@zxing/browser';
import { QrCodeIcon, PlusIcon, FunnelIcon } from '@heroicons/react/24/outline';
import ItemModal from '@/components/inventory/ItemModal';
import Search from '@/components/Search';
import { type Item } from '@/types/inventory';
import type { Room } from '@/types/room';
import { useAuth } from '@/context/AuthContext';
import { fetchInventory } from '@/services/inventory';
import { getRooms } from '@/services/room';

const InventoryMobilePage = () => {
    const { } = useAuth();
    const [isQrOpen, setIsQrOpen] = useState(false);
    const [inventory, setInventory] = useState<Item[]>([]);
    const [selectedItem, setSelectedItem] = useState<Item | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'view' | 'edit' | 'add'>('view');

    const [rooms, setRooms] = useState<Room[]>([]);
    const videoRef = useRef<HTMLVideoElement>(null);
    const codeReaderRef = useRef<BrowserQRCodeReader | null>(null);
    const qrControlsRef = useRef<{ stop: () => void } | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedType, setSelectedType] = useState('All Types');
    const [selectedStatus, setSelectedStatus] = useState('All Status');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const inventoryStatuses = ['AVAILABLE', 'BORROWED', 'DEFECTIVE'];

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
        const loadInventory = async () => {
            try {
                const data = await fetchInventory();
                setInventory(data.filter((item): item is Item => !!item));
            } catch (err) {
                console.error('Error fetching inventory:', err);
            }
        };
        loadInventory();
    }, []);

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
                            const code = result.getText();
                            const item = inventory.find(
                                i => i.Serial_Number === code || i.Item_Code === code
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
    }, [isQrOpen, inventory]);

    return (
        <div className="px-4 py-4 space-y-4">
            {/* Search + QR + Filter */}
            <div className="flex items-center gap-2">
                <Search searchTerm={searchTerm} onChange={setSearchTerm} showLabel={false} />
                <button
                    className="p-2 bg-gray-100 dark:bg-gray-800 rounded-md"
                    onClick={() => setIsQrOpen(true)}
                >
                    <QrCodeIcon className="w-5 h-5 text-gray-900 dark:text-gray-200" />
                </button>

                <button
                    className="p-2 bg-gray-100 dark:bg-gray-800 rounded-md flex items-center gap-1"
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                >
                    <FunnelIcon className="w-5 h-5 text-gray-900 dark:text-gray-200" />
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
                            <select
                                className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                value={selectedType}
                                onChange={e => setSelectedType(e.target.value)}
                            >
                                <option>All Types</option>
                                {[...new Set(inventory.map(i => i.Item_Type).filter(Boolean))].map(type => (
                                    <option key={type}>{type}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-900 dark:text-white">Status</label>
                            <select
                                className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                value={selectedStatus}
                                onChange={e => setSelectedStatus(e.target.value)}
                            >
                                <option>All Status</option>
                                {inventoryStatuses.map(status => (
                                    <option key={status}>{status}</option>
                                ))}
                            </select>
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
                <PlusIcon className="h-5 w-5" />
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

            <ItemModal
                isOpen={isModalOpen}
                initMode={modalMode}
                item={modalMode !== 'add' ? selectedItem : null}
                items={inventory}
                rooms={rooms}
                onClose={() => { setIsModalOpen(false); setSelectedItem(null); }}
                onSave={() => { }}
            />
        </div>
    );
};

export default InventoryMobilePage;
