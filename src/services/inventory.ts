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
export const addInventoryItem = async (
    item: Omit<Item | Computer, "Item_ID">,
    User_ID: number
): Promise<Item | Computer> => {
    const { data } = await api.post<Item | Computer>("/inventory", { items: item, User_ID });
    return data;
};

export const addInventoryBulk = async (
    items: Omit<Item, "Item_ID">[],
    User_ID: number
): Promise<Item[]> => {
    const { data } = await api.post<Item[]>("/inventory/bulk", { User_ID, items });
    return data;
};

// Update inventory item
export const updateInventoryItem = async (id: number, item: Partial<Item | Computer>): Promise<Item | Computer> => {
    const { data } = await api.put<Item | Computer>(`/inventory/${id}`, item);
    return data;
};
