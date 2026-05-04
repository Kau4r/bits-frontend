import api from "@/services/api";
import toast from 'react-hot-toast';
import type { Item, Computer } from "@/types/inventory";

export type CsvImportRowStatus = 'valid' | 'imported' | 'skipped' | 'invalid' | 'duplicate';

export interface CsvImportSummary {
    totalRows: number;
    imported: number;
    skipped: number;
    invalid: number;
    duplicates: number;
}

export interface CsvImportRow {
    rowNumber: number;
    status: CsvImportRowStatus | string;
    reason: string;
    itemCode?: string;
    itemType?: string;
    itemId?: number;
    computerName?: string;
    computerId?: number;
    componentCount?: number;
}

export interface CsvImportResult {
    summary: CsvImportSummary;
    rows: CsvImportRow[];
    items?: Item[];
    computers?: unknown[];
    sourceType?: 'csv' | 'xlsx' | string;
    sheetName?: string;
}

// Fetch inventory items. Pass roomId to fetch only items in that room (lazy
// per-room loading used by the Inventory module). Omit roomId for the
// previous behaviour (all items) — used by scheduling, borrowing, audit, etc.
export const getInventory = async (roomId?: number): Promise<(Item | Computer)[]> => {
    const { data } = await api.get<(Item | Computer)[]>("/inventory", {
        params: roomId !== undefined ? { roomId } : undefined,
    });
    return data;
};

/** @deprecated Use getInventory instead */
export const fetchInventory = getInventory;

// Distinct Item_Type values currently in inventory. Used by the labtech
// RoomDetailModal to populate the "Add Item Type" picker dynamically.
//
// Two-tier strategy:
//   1) Primary — hit /inventory/item-types (cheap; backend already aggregates).
//   2) Fallback — if (1) fails or is empty, derive distinct types client-side
//      from /inventory. This keeps the picker populated even when the new
//      route hasn't been deployed yet, the dev backend hasn't been restarted,
//      or anything else makes the dedicated endpoint unreachable.
//
// Both calls are silent — failures shouldn't surface a toast since this is a
// background fetch on modal open.
const SILENT = { silent: true } as Parameters<typeof api.get>[1];

const normalizeType = (raw: unknown): string | null => {
    if (typeof raw !== 'string') return null;
    const trimmed = raw.trim().toUpperCase().replace(/[\s-]+/g, '_');
    if (!trimmed) return null;
    return trimmed === 'SYSTEM_UNIT' ? 'MINI_PC' : trimmed;
};

export const getInventoryItemTypes = async (): Promise<string[]> => {
    // Primary
    try {
        const { data } = await api.get<string[]>('/inventory/item-types', SILENT);
        if (Array.isArray(data) && data.length > 0) {
            const set = new Set<string>();
            for (const t of data) {
                const norm = normalizeType(t);
                if (norm) set.add(norm);
            }
            if (set.size > 0) return [...set].sort();
        }
    } catch {
        // fall through to client-side derivation
    }

    // Fallback: derive from /inventory directly.
    try {
        const { data } = await api.get<Array<{ Item_Type?: string | null }>>('/inventory', SILENT);
        if (!Array.isArray(data)) return [];
        const set = new Set<string>();
        for (const item of data) {
            const norm = normalizeType(item?.Item_Type);
            if (norm) set.add(norm);
        }
        return [...set].sort();
    } catch {
        return [];
    }
};

// Fetch a single item by code
export const getInventoryByCode = async (itemCode: string): Promise<Item | Computer> => {
    const { data } = await api.get<Item | Computer>(`/inventory/code/${encodeURIComponent(itemCode)}`);
    return data;
};

/** @deprecated Use getInventoryByCode instead */
export const fetchInventoryByCode = getInventoryByCode;

// Add a single inventory item - use bulk endpoint which auto-generates Item_Code
export const createInventoryItem = async (
    item: Omit<Item | Computer, "Item_ID">,
    User_ID: number
): Promise<Item | Computer> => {
    // Use bulk endpoint with single item since it auto-generates Item_Code
    const { data } = await api.post<{ items: Item[] }>("/inventory/bulk", {
        items: [item],
        User_ID
    });
    // Return the first item from the created items
    toast.success('Item added');
    return data.items?.[0] || data;
};

/** @deprecated Use createInventoryItem instead */
export const addInventoryItem = createInventoryItem;

// Add multiple inventory items in bulk
export const createInventoryBulk = async (
    items: Omit<Item, "Item_ID">[],
    User_ID: number
): Promise<Item[]> => {
    const { data } = await api.post<{ items: Item[] }>("/inventory/bulk", {
        items,
        User_ID
    });
    return data.items || data;
};

/** @deprecated Use createInventoryBulk instead */
export const addInventoryBulk = createInventoryBulk;

// Update inventory item
export const updateInventoryItem = async (id: number, item: Partial<Item | Computer>): Promise<Item | Computer> => {
    const { data } = await api.put<Item | Computer>(`/inventory/${id}`, item);
    // After interceptor unwraps envelope, data is the item directly
    toast.success('Item updated');
    return data;
};

// Mark an inventory item as audited/present for the current semester
export const checkInventoryItem = async (itemId: number): Promise<Item> => {
    const { data } = await api.post<Item>(`/inventory/${itemId}/check`);
    return data;
};

// Clear the current audit check from an inventory item
export const uncheckInventoryItem = async (itemId: number): Promise<Item> => {
    const { data } = await api.delete<Item>(`/inventory/${itemId}/check`);
    return data;
};

export const importInventoryCsv = async (file: File, roomId?: number): Promise<CsvImportResult> => {
    const formData = new FormData();
    formData.append("file", file);
    if (roomId) {
        formData.append("roomId", String(roomId));
    }

    const { data } = await api.post<CsvImportResult>("/inventory/import-csv", formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
};

/** @deprecated Inventory CSV import should be launched from the Inventory page. */
export const importRoomItemsCsv = importInventoryCsv;
