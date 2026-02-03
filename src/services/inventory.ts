import api from "./api";
import type { Item, Computer } from "@/types/inventory";

// Fetch all inventory items
export const fetchInventory = async (): Promise<(Item | Computer)[]> => {
    const { data } = await api.get<(Item | Computer)[]>("/inventory");
    return data;
};

// Fetch a single item by code
export const fetchInventoryByCode = async (itemCode: string): Promise<Item | Computer> => {
    const { data } = await api.get<Item | Computer>(`/inventory/code/${itemCode}`);
    return data;
};

// Add a single inventory item - use bulk endpoint which auto-generates Item_Code
export const addInventoryItem = async (
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

// Add multiple inventory items in bulk
export const addInventoryBulk = async (
    items: Omit<Item, "Item_ID">[],
    User_ID: number
): Promise<Item[]> => {
    const { data } = await api.post<{ items: Item[] }>("/inventory/bulk", {
        items,
        User_ID
    });
    return data.items || data;
};

// Update inventory item
export const updateInventoryItem = async (id: number, item: Partial<Item | Computer>): Promise<Item | Computer> => {
    const { data } = await api.put<{ success: boolean; message: string; data: Item | Computer }>(`/inventory/${id}`, item);
    // Backend returns { success, message, data } so extract the actual item
    return data.data || data;
};
