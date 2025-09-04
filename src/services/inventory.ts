import api from "./api";
import type { InventoryItem } from "@/types/inventory";

// Fetch all inventory items
export const fetchInventory = async (): Promise<InventoryItem[]> => {
    const { data } = await api.get("/api/inventory");
    console.log("Fetched inventory:", data);
    return data;
};

// Add a single inventory item
export const addInventoryItem = async (item: InventoryItem): Promise<InventoryItem> => {
    const { data } = await api.post("/api/inventory", item);
    return data;
};

// Update a single inventory item by Item_Code
export const updateInventoryItem = async (itemCode: string, item: InventoryItem): Promise<InventoryItem> => {
    const { data } = await api.put(`/api/inventory/${itemCode}`, item);
    return data;
};
