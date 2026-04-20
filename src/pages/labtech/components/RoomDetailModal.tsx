import { useState, useEffect, useMemo, useRef } from 'react';
import type { Room, RoomSession } from '@/types/room';
import { fetchComputers, createComputer, updateComputer, deleteComputer, importComputersCsv, type Computer, type CreateComputerPayload, type UpdateComputerPayload } from '@/services/computers';
import { importRoomItemsCsv, type CsvImportResult } from '@/services/inventory';
import api from '@/services/api';
import { useModal } from '@/context/ModalContext';
import Table from '@/components/Table';
import InventoryItemCombobox from '@/pages/labtech/components/InventoryItemCombobox';
import { getNextComputerName, getNumberedComputers } from '@/utils/computerDisplay';
import { FloatingSelect } from '@/ui/FloatingSelect';

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

const SCHEDULE_SLOT_HEIGHT_PX = 44;
const SCHEDULE_GRID_START_MINS = 7 * 60 + 30;

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
    const [newComputerIsTeacher, setNewComputerIsTeacher] = useState(false);
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
    const [editIsTeacher, setEditIsTeacher] = useState(false);
    const [editItems, setEditItems] = useState<{ itemId?: number; itemType: string; brand: string; serialNumber: string }[]>([]);

    // Hover state for showing components
    const [hoveredPc, setHoveredPc] = useState<number | null>(null);

    // Assets state
    const [assets, setAssets] = useState<RoomAsset[]>([]);
    const [isLoadingAssets, setIsLoadingAssets] = useState(false);
    const numberedComputers = useMemo(() => getNumberedComputers(computers), [computers]);
    const computerCsvInputRef = useRef<HTMLInputElement | null>(null);
    const assetCsvInputRef = useRef<HTMLInputElement | null>(null);
    const [isImportingCsv, setIsImportingCsv] = useState(false);

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

    const loadAssets = async (computersSnapshot = computers) => {
        setIsLoadingAssets(true);
        try {
            // Get items from inventory API (direct room items)
            const inventoryResponse = await api.get<RoomAsset[]>('/inventory', { params: { roomId: room.Room_ID } });
            const computerDisplayById = new Map(
                getNumberedComputers(computersSnapshot).map(({ computer, displayName }) => [computer.Computer_ID, displayName])
            );

            // Also gather items from computers in this room
            const computerItems: RoomAsset[] = computersSnapshot.flatMap(computer =>
                computer.Item.map(item => ({
                    Item_ID: item.Item_ID,
                    Item_Code: item.Item_Code,
                    Item_Type: item.Item_Type,
                    Brand: item.Brand,
                    Serial_Number: item.Serial_Number,
                    Status: item.Status,
                    IsBorrowable: false,
                    Created_At: '',
                    ComputerName: computerDisplayById.get(computer.Computer_ID) || computer.Name,
                }))
            );

            // Combine both sources by Item_ID. Inventory owns the item fields,
            // while computer-linked rows provide the assigned PC display label.
            const inventoryItems = inventoryResponse.data;
            const assetsById = new Map<number, RoomAsset>();

            inventoryItems.forEach(item => {
                assetsById.set(item.Item_ID, item);
            });

            computerItems.forEach(ci => {
                const existing = assetsById.get(ci.Item_ID);
                if (existing) {
                    assetsById.set(ci.Item_ID, {
                        ...ci,
                        ...existing,
                        ComputerName: ci.ComputerName,
                    });
                } else {
                    assetsById.set(ci.Item_ID, ci);
                }
            });

            setAssets(Array.from(assetsById.values()));
        } catch (err) {
            console.error('Failed to load assets:', err);
        } finally {
            setIsLoadingAssets(false);
        }
    };

    const loadComputers = async (): Promise<Computer[]> => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await fetchComputers(room.Room_ID);
            setComputers(data);
            return data;
        } catch (err) {
            console.error('Failed to load computers:', err);
            setError('Failed to load computers');
            return [];
        } finally {
            setIsLoading(false);
        }
    };

    const openAddComputerDialog = () => {
        setError(null);
        setNewComputerName(getNextComputerName(computers));
        setNewComputerIsTeacher(false);
        setSelectedItems({
            KEYBOARD: null,
            MOUSE: null,
            MONITOR: null,
            SYSTEM_UNIT: null,
        });
        setShowAddDialog(true);
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
                isTeacher: newComputerIsTeacher,
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
            setNewComputerIsTeacher(false);
            setSelectedItems({
                KEYBOARD: null,
                MOUSE: null,
                MONITOR: null,
                SYSTEM_UNIT: null,
            });
            setShowAddDialog(false);
        } catch (err) {
            console.error('Failed to create computer:', err);
            const message = err instanceof Error && err.message
                ? err.message
                : 'Failed to create computer';
            setError(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditClick = (pc: Computer) => {
        setEditingComputer(pc);
        setEditName(pc.Name);
        setEditStatus(pc.Status);
        setEditIsTeacher(Boolean(pc.Is_Teacher));
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
                isTeacher: editIsTeacher,
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

    const summarizeImport = (result: CsvImportResult, label: string) => {
        const { summary } = result;
        const issueParts = [
            summary.skipped ? `${summary.skipped} skipped` : '',
            summary.invalid ? `${summary.invalid} invalid` : '',
            summary.duplicates ? `${summary.duplicates} duplicate` : '',
        ].filter(Boolean);

        const issueText = issueParts.length > 0 ? ` (${issueParts.join(', ')})` : '';
        return `${label}: imported ${summary.imported} of ${summary.totalRows} row(s)${issueText}.`;
    };

    const getImportErrorMessage = (err: unknown, fallback: string) => {
        return err instanceof Error && err.message ? err.message : fallback;
    };

    const isSupportedImportFile = (file: File) => {
        const lowerName = file.name.toLowerCase();
        return lowerName.endsWith('.csv') || lowerName.endsWith('.xlsx');
    };

    const handleComputerCsvImport = async (file?: File) => {
        if (!file) return;
        if (!isSupportedImportFile(file)) {
            await modal.showError('Please choose a .csv or .xlsx file.', 'Invalid File');
            if (computerCsvInputRef.current) computerCsvInputRef.current.value = '';
            return;
        }

        setIsImportingCsv(true);
        setError(null);
        try {
            const result = await importComputersCsv(file, room.Room_ID);
            const refreshedComputers = await loadComputers();
            await loadAssets(refreshedComputers);
            await modal.showSuccess(
                `${summarizeImport(result, 'Computer import')}\n\nSupported formats: .xlsx room-assets workbook, CSV exported from the workbook, or Computer_Name/System_Unit_Code/Monitor_Code/Keyboard_Code/Mouse_Code CSV.`,
                'Import Complete'
            );
        } catch (err) {
            const message = getImportErrorMessage(err, 'Failed to import computers CSV');
            setError(message);
            await modal.showError(message, 'Import Failed');
        } finally {
            setIsImportingCsv(false);
            if (computerCsvInputRef.current) computerCsvInputRef.current.value = '';
        }
    };

    const handleAssetCsvImport = async (file?: File) => {
        if (!file) return;
        if (!file.name.toLowerCase().endsWith('.csv')) {
            await modal.showError('Please choose a .csv file. If you have an Excel workbook, export the asset sheet as CSV first.', 'Invalid File');
            if (assetCsvInputRef.current) assetCsvInputRef.current.value = '';
            return;
        }

        setIsImportingCsv(true);
        setError(null);
        try {
            const result = await importRoomItemsCsv(file, room.Room_ID);
            await loadAssets();
            await modal.showSuccess(
                `${summarizeImport(result, 'Asset import')}\n\nSupported headers: Item_Code, Item_Type, Brand, Serial_Number, Status, IsBorrowable.`,
                'Import Complete'
            );
        } catch (err) {
            const message = getImportErrorMessage(err, 'Failed to import assets CSV');
            setError(message);
            await modal.showError(message, 'Import Failed');
        } finally {
            setIsImportingCsv(false);
            if (assetCsvInputRef.current) assetCsvInputRef.current.value = '';
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
                            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Computers</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Import a CSV/XLSX file or add a single PC with existing inventory components.
                                    </p>
                                </div>
                                <div className="flex flex-wrap justify-end gap-2">
                                    <input
                                        ref={computerCsvInputRef}
                                        type="file"
                                        accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                        className="hidden"
                                        onChange={(e) => handleComputerCsvImport(e.target.files?.[0])}
                                    />
                                    <button
                                        onClick={() => computerCsvInputRef.current?.click()}
                                        disabled={isImportingCsv}
                                        className="px-4 py-2 border border-blue-500/60 text-blue-600 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
                                    >
                                        {isImportingCsv ? 'Importing...' : 'Import Computers CSV/XLSX'}
                                    </button>
                                    <button
                                        onClick={openAddComputerDialog}
                                        disabled={isImportingCsv}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                                    >
                                        + Add Computer
                                    </button>
                                </div>
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm dark:bg-red-500/20 dark:border-red-500/50 dark:text-red-400">
                                    {error}
                                </div>
                            )}

                            {/* Loading State */}
                            {isLoading ? (
                                <div className="flex items-center justify-center h-48">
                                    <div className="text-gray-400">Loading computers...</div>
                                </div>
                            ) : computers.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl">
                                    <p className="text-gray-600 dark:text-gray-500 text-lg mb-2">No computers in this room</p>
                                    <p className="text-gray-500 dark:text-gray-600 text-sm">Click "Add Computer" to get started</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                    {numberedComputers.map(({ computer: pc, displayName, originalName, wasRenumbered }) => {
                                        const statusColor = getStatusColor(pc.Status);
                                        const isHovered = hoveredPc === pc.Computer_ID;
                                        return (
                                            <div
                                                key={pc.Computer_ID}
                                                className={`bg-white dark:bg-gray-800 border rounded-xl p-4 flex flex-col gap-3 hover:shadow-md transition-all group relative cursor-pointer ${
                                                    pc.Is_Teacher
                                                        ? 'border-amber-400 dark:border-amber-500 ring-1 ring-amber-300/40 dark:ring-amber-500/30 hover:border-amber-500'
                                                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500'
                                                }`}
                                                onClick={() => handleEditClick(pc)}
                                                onMouseEnter={() => setHoveredPc(pc.Computer_ID)}
                                                onMouseLeave={() => setHoveredPc(null)}
                                            >
                                                {/* Delete button (appears on hover) */}
                                                <button
                                                    onClick={(e) => handleDeleteComputer(pc.Computer_ID, e)}
                                                    className="absolute top-2 right-2 p-1 text-gray-500 dark:text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                                    title="Delete computer"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>

                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2.5 h-2.5 rounded-full ${statusColor === 'green' ? 'bg-green-500' :
                                                            statusColor === 'yellow' ? 'bg-yellow-500' :
                                                                statusColor === 'red' ? 'bg-red-500' : 'bg-gray-500'
                                                            }`} />
                                                        <span className={`text-xs font-medium ${statusColor === 'green' ? 'text-green-600 dark:text-green-400' :
                                                            statusColor === 'yellow' ? 'text-yellow-600 dark:text-yellow-400' :
                                                                statusColor === 'red' ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'
                                                            }`}>
                                                            {getStatusLabel(pc.Status)}
                                                        </span>
                                                    </div>
                                                    {pc.Is_Teacher && (
                                                        <span
                                                            className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                                                            title="Teacher's PC"
                                                        >
                                                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                                                <path d="M5 16l1.5-8 4.5 4 5-7 4.5 7L21 16H5zm0 2h16v2H5v-2z" />
                                                            </svg>
                                                            Teacher
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex flex-col items-center py-2">
                                                    <svg className={`w-12 h-12 mb-2 ${statusColor === 'green' ? 'text-green-500' :
                                                        statusColor === 'yellow' ? 'text-yellow-500' :
                                                            statusColor === 'red' ? 'text-red-500' : 'text-gray-500'
                                                        }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                    </svg>
                                                    <span className="text-gray-900 dark:text-white font-bold text-lg">{displayName}</span>
                                                    {wasRenumbered && (
                                                        <span className="mt-0.5 max-w-full truncate text-[10px] text-gray-500 dark:text-gray-400" title={`Saved as ${originalName}`}>
                                                            saved: {originalName}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Items count / Click to edit hint */}
                                                <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-auto">
                                                    <p className="text-[10px] text-gray-500 font-medium">
                                                        {pc.Item.length} component{pc.Item.length !== 1 ? 's' : ''} • Click to edit
                                                    </p>
                                                </div>

                                                {/* Hover Tooltip - Component Details */}
                                                {isHovered && pc.Item.length > 0 && (
                                                    <div className="absolute left-full ml-2 top-0 z-20 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-3 shadow-xl min-w-[200px]">
                                                        <p className="text-xs font-bold text-gray-900 dark:text-white mb-2">Components:</p>
                                                        <div className="space-y-1.5">
                                                            {pc.Item.map(item => (
                                                                <div key={item.Item_ID} className="text-xs">
                                                                    <span className="text-gray-600 dark:text-gray-400">{formatItemType(item.Item_Type)}:</span>
                                                                    <span className="text-gray-900 dark:text-white ml-1">{item.Brand || 'N/A'}</span>
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
                            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Room Assets</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Import standalone room items that are not assembled into a computer.
                                    </p>
                                </div>
                                <div className="flex justify-end">
                                    <input
                                        ref={assetCsvInputRef}
                                        type="file"
                                        accept=".csv,text/csv"
                                        className="hidden"
                                        onChange={(e) => handleAssetCsvImport(e.target.files?.[0])}
                                    />
                                    <button
                                        onClick={() => assetCsvInputRef.current?.click()}
                                        disabled={isImportingCsv}
                                        className="px-4 py-2 border border-blue-500/60 text-blue-600 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
                                    >
                                        {isImportingCsv ? 'Importing...' : 'Import Assets CSV'}
                                    </button>
                                </div>
                            </div>

                            {error && (
                                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm dark:bg-red-500/20 dark:border-red-500/50 dark:text-red-400">
                                    {error}
                                </div>
                            )}

                            {isLoadingAssets ? (
                                <div className="flex items-center justify-center h-48">
                                    <div className="text-gray-600 dark:text-gray-400">Loading assets...</div>
                                </div>
                            ) : assets.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl">
                                    <p className="text-gray-600 dark:text-gray-500 text-lg mb-2">No assets in this room</p>
                                    <p className="text-gray-500 dark:text-gray-600 text-sm">Add computers or inventory items to see them here</p>
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
                                                    <span className="text-blue-600 dark:text-blue-400" title={asset.ComputerName}>{asset.ComputerName}</span>
                                                ) : (
                                                    <span className="text-gray-500">-</span>
                                                )}
                                            </div>
                                            <div>
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${asset.Status === 'AVAILABLE' ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' :
                                                    asset.Status === 'BORROWED' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' :
                                                        asset.Status === 'DEFECTIVE' ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' :
                                                            'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400'
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

                            <div className="rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/30">
                                <div
                                    className="relative grid"
                                    style={{
                                        gridTemplateColumns: '80px 1fr',
                                        gridTemplateRows: `repeat(${timeSlots.length}, ${SCHEDULE_SLOT_HEIGHT_PX}px)`,
                                    }}
                                >
                                    {timeSlots.map((time, idx) => (
                                        <div
                                            key={time}
                                            className="col-start-1 flex items-start justify-end pr-3 pt-1 text-xs font-semibold text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700"
                                            style={{ gridRow: idx + 1 }}
                                        >
                                            {time}
                                        </div>
                                    ))}

                                    {timeSlots.map((time, idx) => (
                                        <div
                                            key={`lane-${time}`}
                                            className="col-start-2 border-t border-gray-200 dark:border-gray-700"
                                            style={{ gridRow: idx + 1 }}
                                        />
                                    ))}

                                    {sessions.length === 0 ? (
                                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-gray-600 dark:text-gray-500 italic">
                                            No schedules or bookings for today
                                        </div>
                                    ) : (
                                        sessions.map((session, index) => {
                                            const start = new Date(session.startTime);
                                            const end = new Date(session.endTime);

                                            const startMins = start.getHours() * 60 + start.getMinutes();
                                            const endMins = end.getHours() * 60 + end.getMinutes();

                                            const rowStart = Math.round((startMins - SCHEDULE_GRID_START_MINS) / 30);
                                            const durationSlots = Math.max(1, Math.round((endMins - startMins) / 30));

                                            if (rowStart < 0 || rowStart >= timeSlots.length) return null;

                                            const safeDurationSlots = Math.min(durationSlots, timeSlots.length - rowStart);
                                            const isSchedule = session.type === 'schedule';

                                            return (
                                                <div
                                                    key={index}
                                                    className="col-start-2 p-1 min-w-0"
                                                    style={{
                                                        gridRow: `${rowStart + 1} / span ${safeDurationSlots}`,
                                                    }}
                                                >
                                                    <div className={`h-full p-2 rounded-md border overflow-hidden ${
                                                        isSchedule
                                                            ? 'bg-blue-500/20 border-blue-500/50'
                                                            : 'bg-green-500/10 border-green-500/30'
                                                    }`}>
                                                        <div className="flex justify-between items-start mb-1 gap-2">
                                                            <span className="text-[10px] text-gray-600 dark:text-gray-300 truncate">
                                                                {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full truncate shrink-0 ${
                                                                isSchedule ? 'bg-blue-500 text-white' : 'bg-green-500 text-green-100'
                                                            }`}>
                                                                {isSchedule ? 'Class' : 'Booking'}
                                                            </span>
                                                        </div>
                                                        <p className={`text-sm font-medium truncate ${
                                                            isSchedule ? 'text-blue-600 dark:text-blue-200' : 'text-green-600 dark:text-green-200'
                                                        }`}>
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
                                className="w-full px-4 py-2 bg-white dark:bg-[#1e2939] border border-gray-300 dark:border-[#334155] rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Defaults to the next available PC number for this room.
                            </p>
                        </div>

                        {/* Teacher PC Toggle */}
                        <div className="mb-4">
                            <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={newComputerIsTeacher}
                                    onChange={(e) => setNewComputerIsTeacher(e.target.checked)}
                                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500 dark:border-[#334155] dark:bg-[#1e2939]"
                                />
                                <span>
                                    <span className="block text-sm font-semibold text-gray-900 dark:text-white">Mark as Teacher's PC</span>
                                    <span className="block text-xs text-gray-500 dark:text-gray-400">Only one PC per room can be the teacher's. This will replace any existing one.</span>
                                </span>
                            </label>
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
                                    onChange={(item: { Item_ID: number; Item_Code: string; Item_Type: string; Brand: string | null; Serial_Number: string | null; Status: string } | null) => setSelectedItems(prev => ({ ...prev, [itemType]: item }))}
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
                                className="w-full px-4 py-2.5 bg-white dark:bg-[#1e2939] border border-gray-300 dark:border-[#334155] rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Status */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
                            <FloatingSelect
                                id="room-detail-computer-status"
                                value={editStatus}
                                placeholder="Select status"
                                options={[
                                    { value: 'AVAILABLE', label: 'Available' },
                                    { value: 'IN_USE', label: 'In Use' },
                                    { value: 'MAINTENANCE', label: 'Maintenance' },
                                    { value: 'DECOMMISSIONED', label: 'Decommissioned' },
                                ]}
                                onChange={(value) => setEditStatus(value as Computer['Status'])}
                            />
                        </div>

                        {/* Teacher PC Toggle */}
                        <div className="mb-4">
                            <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={editIsTeacher}
                                    onChange={(e) => setEditIsTeacher(e.target.checked)}
                                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500 dark:border-[#334155] dark:bg-[#1e2939]"
                                />
                                <span>
                                    <span className="block text-sm font-semibold text-gray-900 dark:text-white">Teacher's PC</span>
                                    <span className="block text-xs text-gray-500 dark:text-gray-400">Marking this will unset any other teacher PC in this room.</span>
                                </span>
                            </label>
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
                                            className="px-3 py-2 bg-white dark:bg-[#1e2939] border border-gray-300 dark:border-[#334155] rounded-lg text-gray-900 dark:text-white text-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <input
                                            type="text"
                                            value={item.serialNumber}
                                            onChange={(e) => updateEditItem(index, 'serialNumber', e.target.value)}
                                            placeholder="Serial Number"
                                            className="px-3 py-2 bg-white dark:bg-[#1e2939] border border-gray-300 dark:border-[#334155] rounded-lg text-gray-900 dark:text-white text-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
