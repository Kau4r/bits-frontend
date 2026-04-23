import { useMemo, type ReactNode } from 'react'
import type { InventoryStatus, Item } from '@/types/inventory'
import { inventoryStatuses } from '@/types/inventory'
import InventorySidePanel from './InventorySidePanel'
import InventoryStatCards from './InventoryStatCards'
import { formatItemType } from '@/lib/utils'
import {
  AlertTriangle,
  CheckCircle2,
  Layers3,
  MapPinned,
  type LucideIcon,
} from 'lucide-react'

interface InventoryDashboardProps {
  inventory: Item[]
  onFilterByStatus: (status: InventoryStatus | null) => void
  activeStatusFilter: string
}

const chartColors = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed', '#0891b2', '#4b5563', '#0f766e']

const statusChartColors: Record<InventoryStatus, string> = {
  AVAILABLE: '#16a34a',
  BORROWED: '#2563eb',
  DEFECTIVE: '#f59e0b',
  LOST: '#dc2626',
  REPLACED: '#7c3aed',
  DISPOSED: '#64748b',
}

const formatPercent = (value: number, total: number) => {
  if (!total) return '0%'
  return `${Math.round((value / total) * 100)}%`
}

const normalizeLocation = (item: Item) => item.Room?.Name || item.Location || (item.Room_ID ? `Room ${item.Room_ID}` : '')

const MetricCard = ({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string
  value: number
  hint: string
  icon: LucideIcon
  tone: 'blue' | 'green' | 'amber' | 'slate'
}) => {
  const toneClass = {
    blue: 'from-blue-500/15 to-cyan-500/5 text-blue-600 dark:text-blue-300',
    green: 'from-emerald-500/15 to-lime-500/5 text-emerald-600 dark:text-emerald-300',
    amber: 'from-amber-500/20 to-orange-500/5 text-amber-600 dark:text-amber-300',
    slate: 'from-slate-500/15 to-gray-500/5 text-slate-600 dark:text-slate-300',
  }[tone]

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-3 text-3xl font-black text-gray-900 dark:text-white">{value}</p>
        </div>
        <span className={`rounded-lg bg-gradient-to-br p-2.5 ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{hint}</p>
    </div>
  )
}

const DistributionCard = ({
  title,
  eyebrow,
  data,
  labels,
  emptyText,
  colors,
}: {
  title: string
  eyebrow: string
  data: Record<string, number>
  labels?: string[]
  emptyText: string
  colors?: Record<string, string>
}) => {
  const rawEntries = labels?.length
    ? labels.map(label => [label, data[label] || 0] as [string, number])
    : Object.entries(data).sort((a, b) => b[1] - a[1])
  const total = rawEntries.reduce((sum, [, value]) => sum + value, 0)
  const filledEntries = rawEntries.filter(([, value]) => value > 0)
  const legendEntries = labels?.length ? rawEntries : filledEntries

  const colorFor = (label: string, index: number) =>
    colors?.[label] ?? chartColors[index % chartColors.length]

  let cursor = 0
  const gradient = filledEntries.length
    ? filledEntries.map(([label, value], index) => {
      const start = cursor
      const end = cursor + (value / total) * 100
      cursor = end
      return `${colorFor(label, index)} ${start}% ${end}%`
    }).join(', ')
    : '#e5e7eb 0% 100%'

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-300">{eyebrow}</p>
          <h2 className="mt-1 text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
        </div>
        <span className="rounded-md bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-900 dark:text-gray-300">
          {total} record{total === 1 ? '' : 's'}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)] md:items-center">
        <div className="relative mx-auto h-44 w-44 rounded-full border border-gray-200 shadow-inner dark:border-gray-700" style={{ background: `conic-gradient(${gradient})` }}>
          <div className="absolute inset-8 flex flex-col items-center justify-center rounded-full bg-white text-center shadow-sm dark:bg-gray-800">
            <span className="text-3xl font-black text-gray-900 dark:text-white">{total}</span>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">items</span>
          </div>
        </div>

        <div className="grid max-h-72 gap-2 overflow-y-auto pr-1">
          {legendEntries.length ? legendEntries.map(([label, value], index) => (
            <div key={label} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-900/70">
              <div className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: colorFor(label, index) }} />
                  <span className="truncate">{formatItemType(label) || label}</span>
                </span>
                <span className="text-sm font-black text-gray-900 dark:text-white">{value}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  className="h-full rounded-full"
                  style={{ width: formatPercent(value, total), backgroundColor: colorFor(label, index) }}
                />
              </div>
            </div>
          )) : (
            <p className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">{emptyText}</p>
          )}
        </div>
      </div>
    </section>
  )
}

const Panel = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
    <h2 className="mb-3 text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
    {children}
  </section>
)

const InventoryDashboard = ({
  inventory,
  onFilterByStatus,
  activeStatusFilter,
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

  const totalItems = inventory.length
  const availableCount = statusCounts.AVAILABLE || 0
  const attentionCount = (statusCounts.DEFECTIVE || 0) + (statusCounts.LOST || 0) + (statusCounts.DISPOSED || 0)
  const withLocationCount = inventory.filter(item => Boolean(normalizeLocation(item))).length
  const uniqueTypeCount = Object.keys(itemTypeCounts).length

  return (
    <div className="space-y-4 pb-1">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Assets" value={totalItems} hint={`${uniqueTypeCount} item type${uniqueTypeCount === 1 ? '' : 's'} tracked`} icon={Layers3} tone="blue" />
        <MetricCard label="Available" value={availableCount} hint={`${formatPercent(availableCount, totalItems)} ready for use`} icon={CheckCircle2} tone="green" />
        <MetricCard label="Needs Attention" value={attentionCount} hint="Defective, lost, or disposed items" icon={AlertTriangle} tone="amber" />
        <MetricCard label="With Location" value={withLocationCount} hint={`${formatPercent(withLocationCount, totalItems)} assigned to a room or location`} icon={MapPinned} tone="slate" />
      </div>

      <Panel title="Status Breakdown">
        <InventoryStatCards
          inventory={inventory}
          activeStatusFilter={activeStatusFilter}
          onFilterByStatus={onFilterByStatus}
        />
      </Panel>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <DistributionCard
          title="Inventory by item type"
          eyebrow="Distribution"
          data={itemTypeCounts}
          emptyText="No item types found yet."
        />
        <DistributionCard
          title="Inventory by status"
          eyebrow="Condition"
          data={statusCounts}
          labels={inventoryStatuses}
          colors={statusChartColors}
          emptyText="No status data found yet."
        />
      </div>

      <Panel title="Inventory Activity">
        <InventorySidePanel inventory={inventory} />
      </Panel>
    </div>
  )
}

export default InventoryDashboard
