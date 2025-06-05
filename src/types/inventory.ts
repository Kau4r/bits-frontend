export interface InventoryItem {
  id: string;
  itemCode: string;
  name: string;
  description: string;
  location: string;
  type: 'Equipment' | 'Consumable' | 'Tool' | 'Other';
  status: 'Available' | 'In Use' | 'Maintenance' | 'Disposed';
  lastUpdated: string;
  assignedTo?: string;
}

export type InventoryStatus = InventoryItem['status'];
export type InventoryType = InventoryItem['type'];

export const statusColors: Record<InventoryStatus, string> = {
  'Available': 'bg-green-100 text-green-800',
  'In Use': 'bg-yellow-100 text-yellow-800',
  'Maintenance': 'bg-gray-100 text-gray-800',
  'Disposed': 'bg-red-100 text-red-800',
};

export const inventoryTypes: InventoryType[] = ['Equipment', 'Consumable', 'Tool', 'Other'];
export const inventoryStatuses: InventoryStatus[] = ['Available', 'In Use', 'Maintenance', 'Disposed'];
