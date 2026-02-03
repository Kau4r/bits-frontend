import { useState, useEffect } from 'react';
import type { Room, RoomSession } from '@/types/room';
import { fetchComputers, createComputer, updateComputer, deleteComputer, type Computer, type CreateComputerPayload, type UpdateComputerPayload } from '@/services/computers';
import api from '@/services/api';
import { useModal } from '@/context/ModalContext';
import Table from '@/components/Table';
import InventoryItemCombobox from '@/components/labtech/InventoryItemCombobox';

// Asset/Item type from inventory
interface RoomAsset {
    Item_ID: number;
    Item_Code: string;
    Item_Type: string;
    Brand: string | null;
    Serial_Number: string | null;
    Status: string;
    IsBorrowable: boolean;
    Created_At: string;
    ComputerName?: string | null;  // Which PC this item belongs to
}

interface RoomDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    room: Room;
    sessions?: RoomSession[];
}

// Mock Schedule Data with columns
const timeSlots = [
    '7:30', '8:00', '8:30', '9:00', '9:30', '10:00', '10:30', '11:00', '11:30', '12:00',
    '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00',
    '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'
];

const ITEM_TYPES = ['KEYBOARD', 'MOUSE', 'MONITOR', 'SYSTEM_UNIT'] as const;

const formatItemType = (type: string) => {
    return type.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
};

export default function RoomDetailModal({ isOpen, onClose, room, sessions = [] }: RoomDetailModalProps) {
    const modal = useModal();
    const [activeTab, setActiveTab] = useState<'Computers' | 'Assets' | 'Schedule'>('Computers');
    const [computers, setComputers] = useState<Computer[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Add Computer Dialog State
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [newComputerName, setNewComputerName] = useState('');
    interface InventoryItem {
        Item_ID: number;
        Item_Code: string;
        Item_Type: string;
        Brand: string | null;
        Serial_Number: string | null;
        Status: string;
    }

    const [selectedItems, setSelectedItems] = useState<Record<string, InventoryItem | null>>({
        KEYBOARD: null,
        MOUSE: null,
        MONITOR: null,
        SYSTEM_UNIT: null,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Edit Computer Dialog State
    const [editingComputer, setEditingComputer] = useState<Computer | null>(null);
    const [editName, setEditName] = useState('');
    const [editStatus, setEditStatus] = useState<Computer['Status']>('AVAILABLE');
    const [editItems, setEditItems] = useState<{ itemId?: number; itemType: string; brand: string; serialNumber: string }[]>([]);

    // Hover state for showing components
    const [hoveredPc, setHoveredPc] = useState<number | null>(null);

    // Assets state
    const [assets, setAssets] = useState<RoomAsset[]>([]);
    const [isLoadingAssets, setIsLoadingAssets] = useState(false);

    // Fetch computers when modal opens
    useEffect(() => {
        if (isOpen && room?.Room_ID) {
            loadComputers();
        }
    }, [isOpen, room?.Room_ID]);

    // Load assets after computers are loaded
    useEffect(() => {
        if (isOpen && room?.Room_ID && !isLoading) {
            loadAssets();
        }
    }, [isOpen, room?.Room_ID, computers, isLoading]);

    const loadAssets = async () => {
        setIsLoadingAssets(true);
        try {
            // Get items from inventory API (direct room items)
            const inventoryResponse = await api.get<RoomAsset[]>('/inventory', { params: { roomId: room.Room_ID } });

            // Also gather items from computers in this room
            const computerItems: RoomAsset[] = computers.flatMap(computer =>
                computer.Item.map(item => ({
                    Item_ID: item.Item_ID,
                    Item_Code: item.Item_Code,
                    Item_Type: item.Item_Type,
                    Brand: item.Brand,
                    Serial_Number: item.Serial_Number,
                    Status: item.Status,
                    IsBorrowable: false,
                    Created_At: '',
                    ComputerName: computer.Name,  // Add computer name reference
                }))
            );

            // Combine both sources, avoiding duplicates by Item_ID
            const inventoryItems = inventoryResponse.data;
            const allItems = [...inventoryItems];

            computerItems.forEach(ci => {
                if (!allItems.some(item => item.Item_ID === ci.Item_ID)) {
                    allItems.push(ci);
                }
            });

            setAssets(allItems);
        } catch (err) {
            console.error('Failed to load assets:', err);
        } finally {
            setIsLoadingAssets(false);
        }
    };

    const loadComputers = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await fetchComputers(room.Room_ID);
            setComputers(data);
        } catch (err) {
            console.error('Failed to load computers:', err);
            setError('Failed to load computers');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddComputer = async () => {
        if (!newComputerName.trim()) {
            return;
        }

        // Check if at least one component is selected
        const hasAnyComponent = Object.values(selectedItems).some(item => item !== null);
        if (!hasAnyComponent) {
            setError('Please select at least one component');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload: CreateComputerPayload = {
                name: newComputerName,
                roomId: room.Room_ID,
                items: Object.entries(selectedItems)
                    .filter(([_, item]) => item !== null)
                    .map(([itemType, item]) => ({
                        itemType: itemType as 'KEYBOARD' | 'MOUSE' | 'MONITOR' | 'SYSTEM_UNIT',
                        itemId: item!.Item_ID, // Use existing item ID
                    }))
            };

            await createComputer(payload);
            await loadComputers();

            // Reset form
            setNewComputerName('');
            setSelectedItems({
                KEYBOARD: null,
                MOUSE: null,
                MONITOR: null,
                SYSTEM_UNIT: null,
            });
            setShowAddDialog(false);
        } catch (err) {
            console.error('Failed to create computer:', err);
            setError('Failed to create computer');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditClick = (pc: Computer) => {
        setEditingComputer(pc);
        setEditName(pc.Name);
        setEditStatus(pc.Status);
        // Map existing items or create placeholders for missing types
        const existingItems = ITEM_TYPES.map(type => {
            const existing = pc.Item.find(i => i.Item_Type === type);
            return {
                itemId: existing?.Item_ID,
                itemType: type,
                brand: existing?.Brand || '',
                serialNumber: existing?.Serial_Number || '',
            };
        });
        setEditItems(existingItems);
    };

    const handleUpdateComputer = async () => {
        if (!editingComputer || !editName.trim()) return;

        setIsSubmitting(true);
        try {
            const payload: UpdateComputerPayload = {
                name: editName,
                status: editStatus,
                items: editItems.map(item => ({
                    itemId: item.itemId,
                    itemType: item.itemType,
                    brand: item.brand || undefined,
                    serialNumber: item.serialNumber || undefined,
                }))
            };

            await updateComputer(editingComputer.Computer_ID, payload);
            await loadComputers();
            setEditingComputer(null);
        } catch (err) {
            console.error('Failed to update computer:', err);
            setError('Failed to update computer');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteComputer = async (computerId: number, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent triggering edit
        const confirmed = await modal.showConfirm('Are you sure you want to delete this computer?', 'Delete Computer');
        if (!confirmed) return;

        try {
            await deleteComputer(computerId);
            await loadComputers();
        } catch (err) {
            console.error('Failed to delete computer:', err);
            setError('Failed to delete computer');
        }
    };

    const updateEditItem = (index: number, field: 'brand' | 'serialNumber', value: string) => {
        setEditItems(prev => prev.map((item, i) =>
            i === index ? { ...item, [field]: value } : item
        ));
    };

    if (!isOpen) return null;

    // Stats from real data
    const available = computers.filter(pc => pc.Status === 'AVAILABLE').length;
    const inUse = computers.filter(pc => pc.Status === 'IN_USE').length;
    const maintenance = computers.filter(pc => pc.Status === 'MAINTENANCE' || pc.Status === 'DECOMMISSIONED').length;

    const getStatusColor = (status: Computer['Status']) => {
        switch (status) {
            case 'AVAILABLE': return 'green';
            case 'IN_USE': return 'gray';
            case 'MAINTENANCE': return 'yellow';
            case 'DECOMMISSIONED': return 'red';
            default: return 'gray';
        }
    };

    const getStatusLabel = (status: Computer['Status']) => {
        switch (status) {
            case 'AVAILABLE': return 'Available';
            case 'IN_USE': return 'In Use';
            case 'MAINTENANCE': return 'Maintenance';
            case 'DECOMMISSIONED': return 'Damaged';
            default: return status;
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl border border-gray-200 dark:border-gray-700"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 pb-4 flex justify-between items-start border-b border-gray-200 dark:border-gray-800">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{room.Name}</h2>
                        <p className="text-gray-500 dark:text-gray-400">{room.Room_Type}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 p-2">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Tabs & Stats Header */}
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 flex flex-col md:flex-row justify-between items-center gap-4 border-b border-gray-200 dark:border-gray-800">
                    {/* Stats */}
                    {activeTab === 'Computers' && (
                        <div className="flex gap-6 text-sm font-medium">
                            <span className="text-gray-600 dark:text-gray-300">Available: <span className="text-green-600 dark:text-green-400 font-bold text-lg">{available}</span></span>
                            <span className="text-gray-600 dark:text-gray-300">In Use: <span className="text-gray-900 dark:text-gray-100 font-bold text-lg">{inUse}</span></span>
                            <span className="text-gray-600 dark:text-gray-300">Damaged: <span className="text-red-600 dark:text-red-400 font-bold text-lg">{maintenance}</span></span>
                        </div>
                    )}
                    {activeTab !== 'Computers' && <div></div>}

                    {/* Tabs Segmented Control */}
                    <div className="flex bg-gray-200 dark:bg-gray-800 p-1 rounded-lg">
                        {(['Computers', 'Assets', 'Schedule'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-6 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === tab
                                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-gray-900">
                    {activeTab === 'Computers' && (
                        <div className="flex-1 overflow-y-auto p-6">
                            {/* Add Computer Button */}
                            <div className="mb-4 flex justify-end">
                                <button
                                    onClick={() => setShowAddDialog(true)}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                                >
                                    + Add Computer
                                </button>
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                                    {error}
                                </div>
                            )}

                            {/* Loading State */}
                            {isLoading ? (
                                <div className="flex items-center justify-center h-48">
                                    <div className="text-gray-400">Loading computers...</div>
                                </div>
                            ) : computers.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-gray-700 rounded-xl">
                                    <p className="text-gray-500 text-lg mb-2">No computers in this room</p>
                                    <p className="text-gray-600 text-sm">Click "Add Computer" to get started</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                    {computers.map(pc => {
                                        const statusColor = getStatusColor(pc.Status);
                                        const isHovered = hoveredPc === pc.Computer_ID;
                                        return (
                                            <div
                                                key={pc.Computer_ID}
                                                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex flex-col gap-3 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md transition-all group relative cursor-pointer"
                                                onClick={() => handleEditClick(pc)}
                                                onMouseEnter={() => setHoveredPc(pc.Computer_ID)}
                                                onMouseLeave={() => setHoveredPc(null)}
                                            >
                                                {/* Delete button (appears on hover) */}
                                                <button
                                                    onClick={(e) => handleDeleteComputer(pc.Computer_ID, e)}
                                                    className="absolute top-2 right-2 p-1 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                                    title="Delete computer"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>

                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2.5 h-2.5 rounded-full ${statusColor === 'green' ? 'bg-green-500' :
                                                        statusColor === 'yellow' ? 'bg-yellow-500' :
                                                            statusColor === 'red' ? 'bg-red-500' : 'bg-gray-500'
                                                        }`} />
                                                    <span className={`text-xs font-medium ${statusColor === 'green' ? 'text-green-400' :
                                                        statusColor === 'yellow' ? 'text-yellow-400' :
                                                            statusColor === 'red' ? 'text-red-400' : 'text-gray-400'
                                                        }`}>
                                                        {getStatusLabel(pc.Status)}
                                                    </span>
                                                </div>

                                                <div className="flex flex-col items-center py-2">
                                                    <svg className={`w-12 h-12 mb-2 ${statusColor === 'green' ? 'text-green-500' :
                                                        statusColor === 'yellow' ? 'text-yellow-500' :
                                                            statusColor === 'red' ? 'text-red-500' : 'text-gray-500'
                                                        }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                    </svg>
                                                    <span className="text-gray-900 dark:text-white font-bold text-lg">{pc.Name}</span>
                                                </div>

                                                {/* Items count / Click to edit hint */}
                                                <div className="border-t border-gray-700 pt-2 mt-auto">
                                                    <p className="text-[10px] text-gray-500 font-medium">
                                                        {pc.Item.length} component{pc.Item.length !== 1 ? 's' : ''} • Click to edit
                                                    </p>
                                                </div>

                                                {/* Hover Tooltip - Component Details */}
                                                {isHovered && pc.Item.length > 0 && (
                                                    <div className="absolute left-full ml-2 top-0 z-20 bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-xl min-w-[200px]">
                                                        <p className="text-xs font-bold text-white mb-2">Components:</p>
                                                        <div className="space-y-1.5">
                                                            {pc.Item.map(item => (
                                                                <div key={item.Item_ID} className="text-xs">
                                                                    <span className="text-gray-400">{formatItemType(item.Item_Type)}:</span>
                                                                    <span className="text-white ml-1">{item.Brand || 'N/A'}</span>
                                                                    {item.Serial_Number && (
                                                                        <span className="text-gray-500 ml-1">({item.Serial_Number})</span>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'Assets' && (
                        <div className="flex-1 flex flex-col min-h-0 p-6">
                            {isLoadingAssets ? (
                                <div className="flex items-center justify-center h-48">
                                    <div className="text-gray-400">Loading assets...</div>
                                </div>
                            ) : assets.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-gray-700 rounded-xl">
                                    <p className="text-gray-500 text-lg mb-2">No assets in this room</p>
                                    <p className="text-gray-600 text-sm">Add computers or inventory items to see them here</p>
                                </div>
                            ) : (
                                <Table
                                    headers={[
                                        { label: 'Item Code', key: 'Item_Code', align: 'left' },
                                        { label: 'Type', key: 'Item_Type', align: 'left' },
                                        { label: 'Brand', key: 'Brand', align: 'left' },
                                        { label: 'Serial Number', key: 'Serial_Number', align: 'left' },
                                        { label: 'PC', key: 'ComputerName', align: 'left' },
                                        { label: 'Status', key: 'Status', align: 'left' },
                                        { label: 'Borrowable', key: 'IsBorrowable', align: 'left' }
                                    ]}
                                    columnWidths=".5fr .5fr .5fr 1fr .5fr .5fr .5fr"
                                >
                                    {assets.map(asset => (
                                        <div
                                            key={asset.Item_ID}
                                            className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                                        >
                                            <div className="text-sm text-gray-900 dark:text-white font-mono w-full truncate" title={asset.Item_Code}>{asset.Item_Code}</div>
                                            <div className="text-sm text-gray-600 dark:text-gray-300 w-full truncate" title={formatItemType(asset.Item_Type)}>{formatItemType(asset.Item_Type)}</div>
                                            <div className="text-sm text-gray-600 dark:text-gray-300 w-full truncate" title={asset.Brand || ''}>{asset.Brand || '-'}</div>
                                            <div className="text-sm text-gray-400 font-mono w-full truncate" title={asset.Serial_Number || ''}>{asset.Serial_Number || '-'}</div>
                                            <div className="text-sm w-full truncate">
                                                {asset.ComputerName ? (
                                                    <span className="text-blue-400" title={asset.ComputerName}>{asset.ComputerName}</span>
                                                ) : (
                                                    <span className="text-gray-500">-</span>
                                                )}
                                            </div>
                                            <div>
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${asset.Status === 'AVAILABLE' ? 'bg-green-500/20 text-green-400' :
                                                    asset.Status === 'BORROWED' ? 'bg-blue-500/20 text-blue-400' :
                                                        asset.Status === 'DEFECTIVE' ? 'bg-red-500/20 text-red-400' :
                                                            'bg-gray-500/20 text-gray-400'
                                                    }`}>
                                                    {asset.Status}
                                                </span>
                                            </div>
                                            <div className="text-sm text-gray-400">
                                                {asset.IsBorrowable ? 'Yes' : 'No'}
                                            </div>
                                        </div>
                                    ))}
                                </Table>
                            )}
                        </div>
                    )}

                    {activeTab === 'Schedule' && (
                        <div className="flex-1 overflow-y-auto p-6">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Today's Schedule</h3>

                            {/* Schedule Container */}
                            <div className="overflow-x-auto pb-4">
                                <div className="min-w-[1200px]">
                                    {/* Time Header Row */}
                                    <div className="grid grid-cols-[repeat(28,minmax(80px,1fr))] gap-2 mb-4">
                                        {timeSlots.map(time => (
                                            <div key={time} className="bg-gray-100 dark:bg-gray-800 py-3 rounded-lg text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                {time}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Events Rows */}
                                    <div className="relative space-y-4 min-h-[100px]">
                                        <div className="h-24 bg-gray-50 dark:bg-gray-800/30 rounded-lg relative border border-gray-200 dark:border-gray-700">
                                            {sessions.length === 0 ? (
                                                <div className="flex items-center justify-center h-full text-gray-500 italic">
                                                    No schedules or bookings for today
                                                </div>
                                            ) : (
                                                sessions.map((session, index) => {
                                                    // Calculate position
                                                    const start = new Date(session.startTime);
                                                    const end = new Date(session.endTime);

                                                    // Grid starts at 7:30 (450 mins from midnight)
                                                    // Each slot is 30 mins
                                                    const gridStartMins = 7 * 60 + 30;

                                                    const startMins = start.getHours() * 60 + start.getMinutes();
                                                    const endMins = end.getHours() * 60 + end.getMinutes();

                                                    // Calculate column index (0-based) form 7:30
                                                    // 28 columns total representing 7:30 to 21:30
                                                    const colStart = (startMins - gridStartMins) / 30;
                                                    const durationSlots = (endMins - startMins) / 30;

                                                    // CSS Grid placement
                                                    // left = (colStart / 28) * 100 %
                                                    // width = (durationSlots / 28) * 100 %

                                                    // Ensure within bounds
                                                    if (colStart < 0 || colStart >= 28) return null;

                                                    const isSchedule = session.type === 'schedule';

                                                    return (
                                                        <div
                                                            key={index}
                                                            className="absolute top-1 bottom-1 p-1"
                                                            style={{
                                                                left: `calc((100% / 28) * ${colStart})`,
                                                                width: `calc((100% / 28) * ${Math.max(durationSlots, 0.5)})` // Min width
                                                            }}
                                                        >
                                                            <div className={`
                                                                h-full p-2 rounded-md border overflow-hidden
                                                                ${isSchedule
                                                                    ? 'bg-blue-500/20 border-blue-500/50'
                                                                    : 'bg-green-500/10 border-green-500/30'}
                                                            `}>
                                                                <div className="flex justify-between items-start mb-1 gap-1">
                                                                    <span className="text-[10px] text-gray-300 truncate">
                                                                        {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                                                                        {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                    </span>
                                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full truncate ${isSchedule ? 'bg-blue-500 text-white' : 'bg-green-500 text-green-100'
                                                                        }`}>
                                                                        {isSchedule ? 'Class' : 'Booking'}
                                                                    </span>
                                                                </div>
                                                                <p className={`text-sm font-medium truncate ${isSchedule ? 'text-blue-200' : 'text-green-200'}`}>
                                                                    {session.purpose}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Add Computer Dialog */}
            {showAddDialog && (
                <div className="fixed inset-0 z-[60] bg-black/40 grid place-items-center p-4 content-center" onClick={() => setShowAddDialog(false)}>
                    <div
                        className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-lg p-6 shadow-xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Add New Computer</h3>
                            <button
                                onClick={() => setShowAddDialog(false)}
                                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Computer Name */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Computer Name *</label>
                            <input
                                type="text"
                                value={newComputerName}
                                onChange={(e) => setNewComputerName(e.target.value)}
                                placeholder="e.g., PC 1"
                                className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Components */}
                        <div className="space-y-4">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Components</p>
                            {ITEM_TYPES.map((itemType) => (
                                <InventoryItemCombobox
                                    key={itemType}
                                    itemType={itemType}
                                    label={formatItemType(itemType)}
                                    value={selectedItems[itemType]}
                                    onChange={(item) => setSelectedItems(prev => ({ ...prev, [itemType]: item }))}
                                    placeholder={`Select ${formatItemType(itemType).toLowerCase()} from inventory...`}
                                />
                            ))}
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <button
                                onClick={() => setShowAddDialog(false)}
                                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddComputer}
                                disabled={isSubmitting || !newComputerName.trim()}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                            >
                                {isSubmitting ? 'Adding...' : 'Add Computer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Computer Dialog */}
            {editingComputer && (
                <div className="fixed inset-0 z-[60] bg-black/40 grid place-items-center p-4 content-center" onClick={() => setEditingComputer(null)}>
                    <div
                        className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-lg p-6 shadow-xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Edit Computer</h3>
                            <button
                                onClick={() => setEditingComputer(null)}
                                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Computer Name */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Computer Name *</label>
                            <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                placeholder="e.g., PC 1"
                                className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Status */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
                            <select
                                value={editStatus}
                                onChange={(e) => setEditStatus(e.target.value as Computer['Status'])}
                                className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="AVAILABLE">Available</option>
                                <option value="IN_USE">In Use</option>
                                <option value="MAINTENANCE">Maintenance</option>
                                <option value="DECOMMISSIONED">Decommissioned</option>
                            </select>
                        </div>

                        {/* Components */}
                        <div className="space-y-4">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Components</p>
                            {editItems.map((item, index) => (
                                <div key={item.itemType} className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                        {formatItemType(item.itemType)}
                                    </p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <input
                                            type="text"
                                            value={item.brand}
                                            onChange={(e) => updateEditItem(index, 'brand', e.target.value)}
                                            placeholder="Brand"
                                            className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <input
                                            type="text"
                                            value={item.serialNumber}
                                            onChange={(e) => updateEditItem(index, 'serialNumber', e.target.value)}
                                            placeholder="Serial Number"
                                            className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <button
                                onClick={() => setEditingComputer(null)}
                                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdateComputer}
                                disabled={isSubmitting || !editName.trim()}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                            >
                                {isSubmitting ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
