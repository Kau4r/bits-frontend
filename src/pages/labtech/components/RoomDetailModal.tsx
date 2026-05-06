import { useState, useEffect, useMemo } from 'react';
import ReactQRCode from 'react-qr-code';
import { Download, Printer, X, Settings } from 'lucide-react';
import type { Room, RoomSession } from '@/types/room';
import { fetchComputers, createComputer, updateComputer, deleteComputer, type Computer, type CreateComputerPayload, type UpdateComputerPayload } from '@/services/computers';
import { getInventoryItemTypes } from '@/services/inventory';
import { fetchSuggestions, type ComputerSuggestion } from '@/services/computerSuggestions';
import api from '@/services/api';
import { useModal } from '@/context/ModalContext';
import { useAuth } from '@/context/AuthContext';
import Table from '@/components/Table';
import InventoryItemCombobox from '@/pages/labtech/components/InventoryItemCombobox';
import SuggestionManagerModal from '@/pages/labtech/components/SuggestionManagerModal';
import { getNextComputerName, getNumberedComputers } from '@/utils/computerDisplay';
import { FloatingSelect } from '@/ui/FloatingSelect';
import RoomExportButton from '@/pages/labtech/components/RoomExportButton';
import { formatBrand } from '@/lib/utils';

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

interface InventoryItem {
    Item_ID: number;
    Item_Code: string;
    Item_Type: string;
    Brand: string | null;
    Serial_Number: string | null;
    Status: string;
}

// Mock Schedule Data with columns
const timeSlots = [
    '7:30', '8:00', '8:30', '9:00', '9:30', '10:00', '10:30', '11:00', '11:30', '12:00',
    '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00',
    '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'
];

const SCHEDULE_SLOT_HEIGHT_PX = 44;
const SCHEDULE_GRID_START_MINS = 7 * 60 + 30;

// Free-form: keys are item-type strings, values are the selected inventory item
// for that type (or null if the row was added but no item picked yet).
type SelectedComputerItems = Record<string, InventoryItem | null>;

const createEmptySelectedItems = (): SelectedComputerItems => ({});

const normalizeItemType = (type?: string | null): string => {
    const normalized = String(type || '').trim().replace(/[\s-]+/g, '_').toUpperCase();
    return normalized === 'SYSTEM_UNIT' ? 'MINI_PC' : normalized;
};

const formatItemType = (type: string) => {
    if (normalizeItemType(type) === 'MINI_PC') return 'Mini PC';
    return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
};

export default function RoomDetailModal({ isOpen, onClose, room, sessions = [] }: RoomDetailModalProps) {
    const modal = useModal();
    const { userRole } = useAuth();
    const canDeleteComputer = userRole === 'LAB_HEAD' || userRole === 'LAB_TECH';
    const [activeTab, setActiveTab] = useState<'Computers' | 'Assets' | 'Schedule'>('Computers');
    const [computers, setComputers] = useState<Computer[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Add Computer Dialog State
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [newComputerName, setNewComputerName] = useState('');
    const [newComputerIsTeacher, setNewComputerIsTeacher] = useState(false);
    const [selectedItems, setSelectedItems] = useState<SelectedComputerItems>(() => createEmptySelectedItems());
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Edit Computer Dialog State
    const [editingComputer, setEditingComputer] = useState<Computer | null>(null);
    const [computerModalMode, setComputerModalMode] = useState<'view' | 'edit'>('view');
    const [editName, setEditName] = useState('');
    const [editStatus, setEditStatus] = useState<Computer['Status']>('AVAILABLE');
    const [editIsTeacher, setEditIsTeacher] = useState(false);
    const [editSelectedItems, setEditSelectedItems] = useState<SelectedComputerItems>(() => createEmptySelectedItems());

    // Hover state for showing components
    const [hoveredPc, setHoveredPc] = useState<number | null>(null);

    // Dynamic item types + reusable suggestions (data-driven, replaces the
    // old hardcoded KEYBOARD/MOUSE/MONITOR/MINI_PC slots).
    const [availableItemTypes, setAvailableItemTypes] = useState<string[]>([]);
    const [suggestions, setSuggestions] = useState<ComputerSuggestion[]>([]);
    const [showSuggestionManager, setShowSuggestionManager] = useState(false);

    // Assets state
    const [assets, setAssets] = useState<RoomAsset[]>([]);
    const [isLoadingAssets, setIsLoadingAssets] = useState(false);
    const numberedComputers = useMemo(() => getNumberedComputers(computers), [computers]);

    // Defensive item-type pool: prefer the /inventory/item-types result, but
    // ALSO include types already in use by computers in this room and types
    // referenced by suggestions. That way removing + re-adding a row still
    // shows the picker even if the endpoint isn't reachable yet (e.g. before
    // the backend is restarted with the new route) or returns an empty list.
    const itemTypePool = useMemo(() => {
        const set = new Set<string>();
        for (const t of availableItemTypes) {
            const norm = normalizeItemType(t);
            if (norm) set.add(norm);
        }
        for (const c of computers) {
            for (const item of c.Item) {
                const norm = normalizeItemType(item.Item_Type);
                if (norm) set.add(norm);
            }
        }
        for (const s of suggestions) {
            for (const t of s.Item_Types) {
                const norm = normalizeItemType(t);
                if (norm) set.add(norm);
            }
        }
        return [...set].sort();
    }, [availableItemTypes, computers, suggestions]);
    // Fetch computers when modal opens
    useEffect(() => {
        if (isOpen && room?.Room_ID) {
            loadComputers();
        }
    }, [isOpen, room?.Room_ID]);

    // Load dynamic item types + suggestions when the modal opens
    useEffect(() => {
        if (!isOpen) return;
        let cancelled = false;
        (async () => {
            try {
                const [types, sugs] = await Promise.all([
                    getInventoryItemTypes(),
                    fetchSuggestions(),
                ]);
                if (cancelled) return;
                setAvailableItemTypes(types);
                setSuggestions(sugs);
            } catch (err) {
                console.error('Failed to load item types or suggestions:', err);
            }
        })();
        return () => { cancelled = true; };
    }, [isOpen]);

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
        setSelectedItems(createEmptySelectedItems());
        setShowAddDialog(true);
    };

    const handleAddComputer = async () => {
        if (!newComputerName.trim()) {
            return;
        }

        setIsSubmitting(true);
        try {
            // Empty PCs are allowed; only send rows that have an item picked.
            const items = Object.entries(selectedItems)
                .filter(([, item]) => item !== null)
                .map(([itemType, item]) => ({
                    itemType,
                    itemId: item!.Item_ID,
                }));

            const payload: CreateComputerPayload = {
                name: newComputerName,
                roomId: room.Room_ID,
                isTeacher: newComputerIsTeacher,
                items,
            };

            await createComputer(payload);
            await loadComputers();

            // Reset form
            setNewComputerName('');
            setNewComputerIsTeacher(false);
            setSelectedItems(createEmptySelectedItems());
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

    const handleComputerClick = (pc: Computer) => {
        setEditingComputer(pc);
        setComputerModalMode('view');
        setEditName(pc.Name);
        setEditStatus(pc.Status);
        setEditIsTeacher(Boolean(pc.Is_Teacher));
        // Build the rows from whatever components the PC currently has.
        // Each unique normalized Item_Type becomes a row.
        const existingItems: SelectedComputerItems = {};
        for (const item of pc.Item) {
            const type = normalizeItemType(item.Item_Type);
            if (type) existingItems[type] = item;
        }
        setEditSelectedItems(existingItems);
    };

    const handleUpdateComputer = async () => {
        if (!editingComputer || !editName.trim()) return;

        setIsSubmitting(true);
        try {
            // Send only rows with a picked item; backend treats `items` as the
            // full new set (rows omitted from the payload get disconnected).
            const items = Object.entries(editSelectedItems)
                .filter(([, item]) => item !== null)
                .map(([itemType, item]) => ({
                    itemId: item!.Item_ID,
                    itemType,
                }));

            const payload: UpdateComputerPayload = {
                status: editStatus,
                isTeacher: editIsTeacher,
                items,
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

    // Add/remove rows + suggestion-apply for the dynamic Components section.
    // Mode = 'add' for the Add Computer dialog state; 'edit' for the editor.
    type EditorTarget = 'add' | 'edit';

    const setForTarget = (
        target: EditorTarget,
        updater: (prev: SelectedComputerItems) => SelectedComputerItems
    ) => {
        if (target === 'add') setSelectedItems(updater);
        else setEditSelectedItems(updater);
    };

    const addItemTypeRow = (rawType: string, target: EditorTarget) => {
        const type = normalizeItemType(rawType);
        if (!type) return;
        setForTarget(target, (prev) => (type in prev ? prev : { ...prev, [type]: null }));
    };

    const removeItemTypeRow = (type: string, target: EditorTarget) => {
        setForTarget(target, (prev) => {
            if (!(type in prev)) return prev;
            const next = { ...prev };
            delete next[type];
            return next;
        });
    };

    const setItemForType = (
        type: string,
        item: InventoryItem | null,
        target: EditorTarget
    ) => {
        setForTarget(target, (prev) => ({ ...prev, [type]: item }));
    };

    const applySuggestion = (suggestionId: string, target: EditorTarget) => {
        const id = parseInt(suggestionId, 10);
        if (Number.isNaN(id)) return;
        const s = suggestions.find(x => x.Suggestion_ID === id);
        if (!s) return;
        setForTarget(target, (prev) => {
            const next = { ...prev };
            for (const t of s.Item_Types) {
                const norm = normalizeItemType(t);
                if (norm && !(norm in next)) next[norm] = null;
            }
            return next;
        });
    };

    // Confirm-then-close: prompt when there are unsaved edits before
    // dismissing. View-mode close is always silent — there's nothing to lose.
    const confirmCloseEditDialog = async () => {
        if (computerModalMode === 'edit') {
            const ok = await modal.showConfirm(
                'Discard your changes? Any unsaved edits to this PC will be lost.',
                'Cancel edit?'
            );
            if (!ok) return;
        }
        setEditingComputer(null);
    };

    const confirmCloseAddDialog = async () => {
        const hasContent = newComputerIsTeacher || Object.keys(selectedItems).length > 0;
        if (hasContent) {
            const ok = await modal.showConfirm(
                'Discard this new PC? Anything you entered will be lost.',
                'Cancel add?'
            );
            if (!ok) return;
        }
        setShowAddDialog(false);
    };

    const handleDeleteComputer = async (computerId: number, e?: React.MouseEvent) => {
        e?.stopPropagation(); // Prevent triggering edit when invoked from card
        const confirmed = await modal.showConfirm('Are you sure you want to delete this computer?', 'Delete Computer');
        if (!confirmed) return;

        try {
            await deleteComputer(computerId);
            if (editingComputer?.Computer_ID === computerId) {
                setEditingComputer(null);
            }
            await loadComputers();
        } catch (err) {
            console.error('Failed to delete computer:', err);
            setError('Failed to delete computer');
        }
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

    const buildComputerLabelCanvas = async (computer: Computer) => {
        const svgEl = document.getElementById('pcQrCode');
        if (!svgEl || !(svgEl instanceof SVGSVGElement)) return null;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        const scale = 3;
        const width = 800;
        const height = 250;
        canvas.width = width * scale;
        canvas.height = height * scale;
        ctx.scale(scale, scale);
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(0, 0, width, height);

        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svgEl);
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        const qrImg = new Image();

        await new Promise((resolve) => {
            qrImg.onload = () => {
                const qrSize = 180;
                const qrX = 40;
                const qrY = (height - qrSize) / 2;
                ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

                const textX = qrX + qrSize + 50;
                const centerY = height / 2;
                ctx.fillStyle = '#9ca3af';
                ctx.font = '18px Arial';
                ctx.fillText('PC:', textX, centerY - 40);
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 32px monospace';
                ctx.fillText(computer.Name, textX, centerY - 5);
                ctx.fillStyle = '#9ca3af';
                ctx.font = '16px Arial';
                ctx.fillText('Room:', textX, centerY + 35);
                ctx.fillStyle = '#ffffff';
                ctx.font = '20px Arial';
                ctx.fillText(room.Name, textX, centerY + 60);
                URL.revokeObjectURL(url);
                resolve(null);
            };
            qrImg.src = url;
        });

        return canvas;
    };

    const handleDownloadComputerQr = async (computer: Computer) => {
        const canvas = await buildComputerLabelCanvas(computer);
        if (!canvas) return;
        const downloadLink = document.createElement('a');
        downloadLink.href = canvas.toDataURL('image/png');
        downloadLink.download = `pc-label-${computer.Name.replace(/\s+/g, '-')}.png`;
        downloadLink.click();
    };

    const handlePrintComputerQr = async (computer: Computer) => {
        const canvas = await buildComputerLabelCanvas(computer);
        if (!canvas) return;
        const pngUrl = canvas.toDataURL('image/png');
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Print PC Label - ${computer.Name}</title>
                <style>
                  @page { size: auto; margin: 0.5in; }
                  * { margin: 0; padding: 0; box-sizing: border-box; }
                  body { padding: 20px; background: white; }
                  img { max-width: 600px; height: auto; display: block; }
                  @media print { body { padding: 0; } img { page-break-inside: avoid; } }
                </style>
              </head>
              <body>
                <img src="${pngUrl}" alt="PC Label" />
                <script>
                  window.onload = () => setTimeout(() => window.print(), 250);
                  window.onafterprint = () => setTimeout(() => window.close(), 100);
                </script>
              </body>
            </html>
        `);
        printWindow.document.close();
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
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => window.open(`/labtech/room/${room.Room_ID}/print-qr?kind=items`, '_blank', 'noopener')}
                            className="inline-flex items-center gap-2 rounded-xl border border-indigo-300 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 shadow-sm transition-colors hover:bg-indigo-100 dark:border-indigo-800/60 dark:bg-indigo-900/20 dark:text-indigo-300"
                            title="Open a printable QR sheet for this room's items"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h6v6H3V3zm12 0h6v6h-6V3zM3 15h6v6H3v-6zm10 2h2v2h-2v-2zm6-2h2v2h-2v-2zm-4 4h6v2h-6v-2zm0-4h2v2h-2v-2z" />
                            </svg>
                            Print Items QR
                        </button>
                        <button
                            type="button"
                            onClick={() => window.open(`/labtech/room/${room.Room_ID}/print-qr?kind=pcs`, '_blank', 'noopener')}
                            className="inline-flex items-center gap-2 rounded-xl border border-indigo-300 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 shadow-sm transition-colors hover:bg-indigo-100 dark:border-indigo-800/60 dark:bg-indigo-900/20 dark:text-indigo-300"
                            title="Open a printable QR sheet for this room's PCs"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            Print PCs QR
                        </button>
                        <RoomExportButton room={room} />
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 p-2">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
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
                                        Add a single PC with existing inventory components.
                                    </p>
                                </div>
                                <div className="flex flex-wrap justify-end gap-2">
                                    <button
                                        onClick={openAddComputerDialog}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
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
                                                onClick={() => handleComputerClick(pc)}
                                                onMouseEnter={() => setHoveredPc(pc.Computer_ID)}
                                                onMouseLeave={() => setHoveredPc(null)}
                                            >
                                                {/* Delete button (appears on hover) */}
                                                {canDeleteComputer && (
                                                    <button
                                                        onClick={(e) => handleDeleteComputer(pc.Computer_ID, e)}
                                                        className="absolute top-2 right-2 p-1 text-gray-500 dark:text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                                        title="Delete computer"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                )}

                                                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 min-w-0">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <div className={`shrink-0 w-2.5 h-2.5 rounded-full ${statusColor === 'green' ? 'bg-green-500' :
                                                            statusColor === 'yellow' ? 'bg-yellow-500' :
                                                                statusColor === 'red' ? 'bg-red-500' : 'bg-gray-500'
                                                            }`} />
                                                        <span className={`text-xs font-medium truncate ${statusColor === 'green' ? 'text-green-600 dark:text-green-400' :
                                                            statusColor === 'yellow' ? 'text-yellow-600 dark:text-yellow-400' :
                                                                statusColor === 'red' ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'
                                                            }`}>
                                                            {getStatusLabel(pc.Status)}
                                                        </span>
                                                    </div>
                                                    {pc.Is_Teacher && (
                                                        <span
                                                            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
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
                                                                    <span className="text-gray-900 dark:text-white ml-1">{formatBrand(item.Brand)}</span>
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
                            <div className="mb-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Room Assets</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Inventory items currently assigned to this room.
                                </p>
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
                                            <div className="text-sm text-gray-600 dark:text-gray-300 w-full truncate" title={formatBrand(asset.Brand)}>{formatBrand(asset.Brand)}</div>
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
                                            const isStudentUsage = session.type === 'booking' && session.purpose === 'Student Usage';
                                            const sessionClasses = isSchedule
                                                ? {
                                                    card: 'bg-blue-500/20 border-blue-500/50',
                                                    badge: 'bg-blue-500 text-white',
                                                    text: 'text-blue-600 dark:text-blue-200',
                                                    label: 'Class',
                                                }
                                                : isStudentUsage
                                                    ? {
                                                        card: 'bg-purple-500/10 border-purple-500/30',
                                                        badge: 'bg-purple-500 text-white',
                                                        text: 'text-purple-700 dark:text-purple-200',
                                                        label: 'Student Usage',
                                                    }
                                                    : {
                                                        card: 'bg-green-500/10 border-green-500/30',
                                                        badge: 'bg-green-500 text-green-100',
                                                        text: 'text-green-600 dark:text-green-200',
                                                        label: 'Booking',
                                                    };

                                            return (
                                                <div
                                                    key={index}
                                                    className="col-start-2 p-1 min-w-0"
                                                    style={{
                                                        gridRow: `${rowStart + 1} / span ${safeDurationSlots}`,
                                                    }}
                                                >
                                                    <div className={`h-full p-2 rounded-md border overflow-hidden ${sessionClasses.card}`}>
                                                        <div className="flex justify-between items-start mb-1 gap-2">
                                                            <span className="text-[10px] text-gray-600 dark:text-gray-300 truncate">
                                                                {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full truncate shrink-0 ${sessionClasses.badge}`}>
                                                                {sessionClasses.label}
                                                            </span>
                                                        </div>
                                                        <p className={`text-sm font-medium truncate ${sessionClasses.text}`}>
                                                            {session.purpose}
                                                        </p>
                                                        {isStudentUsage && session.bookedByName && (
                                                            <p className="mt-1 truncate text-[11px] text-purple-700/80 dark:text-purple-200/80">
                                                                {session.bookedByName}
                                                            </p>
                                                        )}
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
                <div
                    className="fixed inset-0 z-[60] bg-black/40 grid place-items-center p-4 content-center"
                    onClick={(e) => {
                        // Stop propagation so the click doesn't bubble up and
                        // close the parent RoomDetailModal too. Confirms first
                        // if there are unsaved entries.
                        e.stopPropagation();
                        confirmCloseAddDialog();
                    }}
                >
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
                                readOnly
                                className="w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-gray-900 dark:border-[#334155] dark:bg-[#1e2939] dark:text-white"
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
                        <ComponentEditor
                            target="add"
                            selected={selectedItems}
                            availableItemTypes={availableItemTypes}
                            suggestions={suggestions}
                            onApplySuggestion={applySuggestion}
                            onSetItem={setItemForType}
                            onAddType={addItemTypeRow}
                            onRemoveType={removeItemTypeRow}
                            onManageSuggestions={() => setShowSuggestionManager(true)}
                        />

                        {/* Actions */}
                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <button
                                onClick={() => setShowAddDialog(false)}
                                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddComputer}
                                disabled={isSubmitting || !newComputerName.trim()}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
                            >
                                {isSubmitting ? 'Adding...' : 'Add Computer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Computer Dialog */}
            {editingComputer && (
                <div
                    className="fixed inset-0 z-[60] bg-black/40 grid place-items-center p-4 content-center"
                    onClick={(e) => {
                        // Stop propagation so the click doesn't bubble up and
                        // close the parent RoomDetailModal too. Confirms first
                        // when in edit mode (view mode has nothing to lose).
                        e.stopPropagation();
                        confirmCloseEditDialog();
                    }}
                >
                    <div
                        className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-lg p-6 shadow-xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                {computerModalMode === 'edit' ? 'Edit Computer' : 'Computer Details'}
                            </h3>
                            <button
                                onClick={() => setEditingComputer(null)}
                                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="mb-5 flex flex-col gap-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-800 sm:flex-row sm:items-center">
                            <div className="flex shrink-0 justify-center rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700">
                                <ReactQRCode
                                    id="pcQrCode"
                                    value={String(editingComputer.Computer_ID)}
                                    size={118}
                                    level="H"
                                    bgColor="#fff"
                                    fgColor="#111827"
                                />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">PC QR Label</p>
                                <p className="mt-1 truncate font-mono text-lg font-bold text-gray-900 dark:text-white">{editingComputer.Name}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-300">{room.Name}</p>
                            </div>
                            <div className="flex shrink-0 gap-2 sm:flex-col">
                                <button
                                    type="button"
                                    onClick={() => handleDownloadComputerQr(editingComputer)}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
                                >
                                    <Download className="h-4 w-4" />
                                    Download
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handlePrintComputerQr(editingComputer)}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                                >
                                    <Printer className="h-4 w-4" />
                                    Print
                                </button>
                            </div>
                        </div>

                        {/* Computer Name */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Computer Name</label>
                            <input
                                type="text"
                                value={editName}
                                readOnly
                                className="w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-gray-900 dark:border-[#334155] dark:bg-[#1e2939] dark:text-white"
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
                                disabled={computerModalMode !== 'edit'}
                            />
                        </div>

                        {/* Teacher PC Toggle */}
                        <div className="mb-4">
                            <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={editIsTeacher}
                                    onChange={(e) => setEditIsTeacher(e.target.checked)}
                                    disabled={computerModalMode !== 'edit'}
                                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500 dark:border-[#334155] dark:bg-[#1e2939]"
                                />
                                <span>
                                    <span className="block text-sm font-semibold text-gray-900 dark:text-white">Teacher's PC</span>
                                    <span className="block text-xs text-gray-500 dark:text-gray-400">Marking this will unset any other teacher PC in this room.</span>
                                </span>
                            </label>
                        </div>

                        {/* Components */}
                        {computerModalMode === 'edit' ? (
                            <ComponentEditor
                                target="edit"
                                selected={editSelectedItems}
                                availableItemTypes={itemTypePool}
                                suggestions={suggestions}
                                onApplySuggestion={applySuggestion}
                                onSetItem={setItemForType}
                                onAddType={addItemTypeRow}
                                onRemoveType={removeItemTypeRow}
                                onManageSuggestions={() => setShowSuggestionManager(true)}
                                computerId={editingComputer?.Computer_ID}
                            />
                        ) : (
                            <div className="space-y-3">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Components</p>
                                {Object.keys(editSelectedItems).length === 0 ? (
                                    <div className="rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                                        No components attached. Click Edit to add some.
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {Object.entries(editSelectedItems).map(([itemType, item]) => (
                                            <div key={itemType} className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
                                                <div className="flex items-center justify-between gap-3">
                                                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{formatItemType(itemType)}</span>
                                                    <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{item?.Item_Code || '-'}</span>
                                                </div>
                                                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                                                    {item ? formatBrand(item.Brand, 'No Brand') : 'No item selected'}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-wrap justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                            {canDeleteComputer && editingComputer && (
                                <button
                                    type="button"
                                    onClick={() => handleDeleteComputer(editingComputer.Computer_ID)}
                                    className="mr-auto px-4 py-2 border border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                                >
                                    Delete PC
                                </button>
                            )}
                            <button
                                onClick={() => setEditingComputer(null)}
                                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                Cancel
                            </button>
                            {computerModalMode === 'edit' ? (
                                <button
                                    onClick={handleUpdateComputer}
                                    disabled={isSubmitting || !editName.trim()}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
                                >
                                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setComputerModalMode('edit')}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
                                >
                                    Edit
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <SuggestionManagerModal
                isOpen={showSuggestionManager}
                onClose={() => setShowSuggestionManager(false)}
                availableItemTypes={itemTypePool}
                onSuggestionsChanged={setSuggestions}
            />
        </div>
    );
}

interface ComponentEditorProps {
    target: 'add' | 'edit';
    selected: SelectedComputerItems;
    availableItemTypes: string[];
    suggestions: ComputerSuggestion[];
    onApplySuggestion: (id: string, target: 'add' | 'edit') => void;
    onSetItem: (type: string, item: InventoryItem | null, target: 'add' | 'edit') => void;
    onAddType: (type: string, target: 'add' | 'edit') => void;
    onRemoveType: (type: string, target: 'add' | 'edit') => void;
    onManageSuggestions: () => void;
    // Edit-mode only: lets the inventory picker include items already
    // attached to this PC, so removing+re-adding a row works as expected.
    computerId?: number;
}

function ComponentEditor({
    target,
    selected,
    availableItemTypes,
    suggestions,
    onApplySuggestion,
    onSetItem,
    onAddType,
    onRemoveType,
    onManageSuggestions,
    computerId,
}: ComponentEditorProps) {
    const formatItemType = (type: string) => {
        if (type === 'MINI_PC') return 'Mini PC';
        return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    };

    const usedTypes = new Set(Object.keys(selected));
    const addableTypes = availableItemTypes.filter(t => !usedTypes.has(t));
    const rows = Object.entries(selected);

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Components</p>
                <button
                    type="button"
                    onClick={onManageSuggestions}
                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                    <Settings className="w-3 h-3" />
                    Manage Suggestions
                </button>
            </div>

            {suggestions.length > 0 && (
                <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Apply Suggestion (optional)
                    </label>
                    <select
                        value=""
                        onChange={(e) => {
                            if (e.target.value) onApplySuggestion(e.target.value, target);
                        }}
                        className="w-full rounded-lg border border-gray-300 dark:border-[#334155] bg-white dark:bg-[#1e2939] px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">— pick a suggestion to fill rows —</option>
                        {suggestions.map(s => (
                            <option key={s.Suggestion_ID} value={s.Suggestion_ID}>
                                {s.Name} ({s.Item_Types.map(formatItemType).join(', ')})
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {rows.length === 0 ? (
                <div className="rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 p-4 text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        No components yet. Add an item type below — empty PCs are OK, you can attach items later.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {rows.map(([itemType, item]) => (
                        <div key={itemType} className="flex items-end gap-2">
                            <div className="flex-1 min-w-0">
                                <InventoryItemCombobox
                                    itemType={itemType}
                                    label={formatItemType(itemType)}
                                    value={item}
                                    onChange={(picked) => onSetItem(itemType, picked, target)}
                                    placeholder={`Select ${formatItemType(itemType).toLowerCase()} from inventory...`}
                                    computerId={computerId}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => onRemoveType(itemType, target)}
                                className="mb-0.5 rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                                title={`Remove ${formatItemType(itemType)}`}
                                aria-label={`Remove ${formatItemType(itemType)}`}
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div>
                <select
                    value=""
                    onChange={(e) => {
                        if (e.target.value) onAddType(e.target.value, target);
                    }}
                    disabled={addableTypes.length === 0}
                    className="w-full rounded-lg border border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1e2939] px-3 py-2 text-sm font-medium text-blue-600 hover:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:text-blue-400"
                >
                    <option value="">
                        {addableTypes.length === 0
                            ? 'All available types added'
                            : '+ Add Item Type…'}
                    </option>
                    {addableTypes.map(t => (
                        <option key={t} value={t}>
                            {formatItemType(t)}
                        </option>
                    ))}
                </select>
                {availableItemTypes.length === 0 && (
                    <p className="mt-1 text-xs text-gray-400">
                        No item types found in inventory yet. Add inventory items first.
                    </p>
                )}
            </div>
        </div>
    );
}
