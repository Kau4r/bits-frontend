import api from "./api";
import type { InventoryItem } from "@/types/inventory";

export type NewInventoryItem = Omit<InventoryItem, "Item_ID" | "Item_Code">;

// Fetch all items
export const fetchInventory = async (): Promise<InventoryItem[]> => {
    const res = await api.get<InventoryItem[]>("/inventory");
    return res.data;
};

// Add single item (wrap as bulk internally)
export const addInventoryItem = async (item: NewInventoryItem, User_ID: number): Promise<InventoryItem> => {
    const res = await api.post<{ items: InventoryItem[] }>("/inventory", { items: [item], User_ID });
    return res.data.items[0];
};

// Add multiple items
export const addInventoryBulk = async ({
    items,
    User_ID
}: { items: NewInventoryItem[]; User_ID: number }): Promise<InventoryItem[]> => {
    const res = await api.post<{ items: InventoryItem[] }>("/inventory", { items, User_ID });
    return res.data.items;
};

// Update item
export const updateInventoryItem = async (itemId: number, item: Partial<InventoryItem>): Promise<InventoryItem> => {
    const res = await api.put<InventoryItem>(`/inventory/${itemId}`, item);
    return res.data; // <- return the item directly
};

