import api from "@/services/api";
import type { Item, Computer } from "@/types/inventory";

// Fetch all inventory items
export const getInventory = async (): Promise<(Item | Computer)[]> => {
    const { data } = await api.get<(Item | Computer)[]>("/inventory");
    return data;
};

/** @deprecated Use getInventory instead */
export const fetchInventory = getInventory;

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
    return data;
};
