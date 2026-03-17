import type { Room } from "@/types/room";
import type { User } from "@/types/user";

export type ItemType = "HDMI" | "VGA" | "ADAPTER" | "PROJECTOR" | "EXTENSION" | "MOUSE" | "KEYBOARD" | "MONITOR" | "GENERAL" | "OTHER";

export interface Item {
  Item_ID?: number;
  Item_Code?: string;
  Item_Type: ItemType;
  Brand: string;
  Room_ID?: number;
  User_ID?: number;
  Serial_Number: string;
  Status: "AVAILABLE" | "BORROWED" | "DEFECTIVE" | "LOST" | "REPLACED";
  Updated_At?: string;
  Room?: Room;
  User?: User;
  IsBorrowable: Boolean
}

export type InventoryStatus = Item["Status"];

export const statusColors: Record<InventoryStatus, string> = {
  AVAILABLE: 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100',
  BORROWED: 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100',
  DEFECTIVE: 'bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-100',
  LOST: 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100',
  REPLACED: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
};

export const inventoryStatuses: InventoryStatus[] = ['AVAILABLE', 'BORROWED', 'DEFECTIVE', 'LOST', 'REPLACED'];

export interface Computer {
  Computer_ID: number;
  Name: string;
  Room_ID?: number;
  Status: "AVAILABLE" | "IN_USE" | "MAINTENANCE" | "DECOMMISSIONED";
  Updated_At?: string;
  Room?: Room;
  User?: User;
}

export type ComputerStatus = Computer['Status'];

export const computerStatusColors: Record<ComputerStatus, string> = {
  AVAILABLE: 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100',
  IN_USE: 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100',
  MAINTENANCE: 'bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-100',
  DECOMMISSIONED: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
};

export const computerStatuses: ComputerStatus[] = ['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'DECOMMISSIONED'];
