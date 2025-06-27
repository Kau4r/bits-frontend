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
  Available: 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100',
  'In Use': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100',
  Maintenance: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
  Defective: 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100',
}

export const inventoryStatuses: InventoryStatus[] = [
  'Available',
  'In Use',
  'Maintenance',
  'Defective',
]
