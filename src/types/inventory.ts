export interface InventoryItem {
  assetCode: string
  brand: string
  itemType: string
  location: string
  status: 'Available' | 'In Use' | 'Maintenance' | 'Defective'
  lastUpdated: string
  assignedTo?: string
}

export type InventoryStatus = InventoryItem['status']

export const statusColors: Record<InventoryStatus, string> = {
  Available: 'bg-green-100 text-green-800',
  'In Use': 'bg-yellow-100 text-yellow-800',
  Maintenance: 'bg-gray-100 text-gray-800',
  Defective: 'bg-red-100 text-red-800',
}

export const inventoryStatuses: InventoryStatus[] = [
  'Available',
  'In Use',
  'Maintenance',
  'Defective',
]
