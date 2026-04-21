import { useMemo } from 'react'
import type { InventoryStatus, Item } from '@/types/inventory'
import { inventoryStatuses } from '@/types/inventory'
import InventorySidePanel from './InventorySidePanel'
import { formatItemType } from '@/lib/utils'

interface InventoryDashboardProps {
  inventory: Item[]
  onFilterByStatus: (status: InventoryStatus | null) => void
  activeStatusFilter: string
}

const chartColors = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed', '#0891b2', '#4b5563']

const MiniPieChart = ({
  title,
  data,
  labels,
}: {
  title: string
  data: Record<string, number>
  labels?: string[]
}) => {
  const entries = labels?.length
    ? labels.map(label => [label, data[label] || 0] as [string, number])
    : Object.entries(data).filter(([, value]) => value > 0)
  const filledEntries = entries.filter(([, value]) => value > 0)
  const total = entries.reduce((sum, [, value]) => sum + value, 0)
  let cursor = 0
  const gradient = filledEntries.length
    ? filledEntries.map(([, value], index) => {
      const start = cursor
      const end = cursor + (value / total) * 100
      cursor = end
      return `${chartColors[index % chartColors.length]} ${start}% ${end}%`
    }).join(', ')
    : '#e5e7eb 0% 100%'

  return (
    <section className="flex h-full min-h-0 flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-3 text-left">
        <h2 className="text-sm font-bold text-gray-900 dark:text-white">{title}</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">{total} record{total === 1 ? '' : 's'}</p>
      </div>
      <div className="flex min-h-0 flex-1 flex-col justify-between">
        <div className="flex justify-center">
          <div
            className="h-20 w-20 shrink-0 rounded-full border border-gray-200 dark:border-gray-700"
            style={{ background: `conic-gradient(${gradient})` }}
            aria-label={`${title} pie chart`}
          />
        </div>
        <div className="mt-3 grid gap-1.5 overflow-hidden">
          {entries.length ? entries.map(([label, value], index) => (
            <div key={label} className="flex items-center justify-between gap-2 text-xs">
              <span className="flex min-w-0 items-center gap-2 text-gray-600 dark:text-gray-300">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: chartColors[index % chartColors.length] }} />
                <span className="truncate">{formatItemType(label) || label}</span>
              </span>
              <span className="font-bold text-gray-900 dark:text-white">{value}</span>
            </div>
          )) : (
            <p className="text-xs text-gray-500 dark:text-gray-400">No data yet.</p>
          )}
        </div>
      </div>
    </section>
  )
}

const InventoryDashboard = ({
  inventory,
}: InventoryDashboardProps) => {
  const itemTypeCounts = useMemo(() => {
    return inventory.reduce<Record<string, number>>((acc, item) => {
      const key = item.Item_Type || 'UNSPECIFIED'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
  }, [inventory])

  const statusCounts = useMemo(() => {
    return inventoryStatuses.reduce<Record<string, number>>((acc, status) => {
      acc[status] = inventory.filter(item => item.Status === status).length
      return acc
    }, {})
  }, [inventory])

  return (
    <div className="mb-4 grid shrink-0 grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr_2fr]">
      <MiniPieChart title="Inventory By Item Type" data={itemTypeCounts} />
      <MiniPieChart title="Inventory By Status" data={statusCounts} labels={inventoryStatuses} />
      <InventorySidePanel inventory={inventory} />
    </div>
  )
}

export default InventoryDashboard
