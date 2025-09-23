import type { Room } from "./room";
import type { User } from "./user";

export interface InventoryItem {
  Item_ID: number;
  Item_Code: string;
  Item_Type: string;
  Brand: string;
  Room_ID?: number;
  User_ID?: number;
  Serial_Number: string;
  Status: "AVAILABLE" | "BORROWED" | "DEFECTIVE" | "LOST" | "REPLACED";
  Updated_At?: string;
  Room?: Room;
  User?: User;
}

export type InventoryStatus = InventoryItem['Status']

export const statusColors: Record<InventoryStatus, string> = {
  AVAILABLE: 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100',
  BORROWED: 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100',
  DEFECTIVE: 'bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-100',
  LOST: 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100',
  REPLACED: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
}

export const inventoryStatuses: InventoryStatus[] = [
  'AVAILABLE',
  'BORROWED',
  'DEFECTIVE',
  'LOST',
  'REPLACED',
]
