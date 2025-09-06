import api from "./api";
import type { InventoryItem } from "@/types/inventory";

// Fetch all items
export const fetchInventory = async (): Promise<InventoryItem[]> => {
    const { data } = await api.get("/api/inventory");
    return data as InventoryItem[];
};

// Add a single item
export const addInventoryItem = async (item: InventoryItem): Promise<InventoryItem> => {
    const { data } = await api.post("/api/inventory", item);
    return data as InventoryItem;  // <-- single item
};

// Bulk add items
export const addInventoryBulk = async (items: InventoryItem[]): Promise<InventoryItem[]> => {
    const { data } = await api.post("/api/inventory/bulk", items);
    return data as InventoryItem[];
};

// Update item
export const updateInventoryItem = async (itemCode: string, item: InventoryItem): Promise<InventoryItem> => {
    const { data } = await api.put(`/api/inventory/${itemCode}`, item);
    return data as InventoryItem;  // <-- single item
};
