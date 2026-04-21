import { useMemo } from 'react'
import {
  CheckCircle2,
  ArrowUpRight,
  AlertTriangle,
  Ban,
  RefreshCcw,
  ArchiveX,
  type LucideIcon,
} from 'lucide-react'
import {
  inventoryStatuses,
  statusColors,
  type InventoryStatus,
  type Item,
} from '@/types/inventory'

interface InventoryStatCardsProps {
  inventory: Item[]
  activeStatusFilter: string
  onFilterByStatus: (status: InventoryStatus | null) => void
}

const STATUS_META: Record<
  InventoryStatus,
  { label: string; icon: LucideIcon }
> = {
  AVAILABLE: { label: 'Available', icon: CheckCircle2 },
  BORROWED: { label: 'Borrowed', icon: ArrowUpRight },
  DEFECTIVE: { label: 'Defective', icon: AlertTriangle },
  LOST: { label: 'Lost', icon: Ban },
  REPLACED: { label: 'Replaced', icon: RefreshCcw },
  DISPOSED: { label: 'Disposed', icon: ArchiveX },
}

const InventoryStatCards = ({
  inventory,
  activeStatusFilter,
  onFilterByStatus,
}: InventoryStatCardsProps) => {
  const counts = useMemo(() => {
    const acc: Record<InventoryStatus, number> = {
      AVAILABLE: 0,
      BORROWED: 0,
      DEFECTIVE: 0,
      LOST: 0,
      REPLACED: 0,
      DISPOSED: 0,
    }
    for (const item of inventory) {
      if (item.Status && acc[item.Status] !== undefined) {
        acc[item.Status] += 1
      }
    }
    return acc
  }, [inventory])

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {inventoryStatuses.map((status) => {
        const meta = STATUS_META[status]
        const Icon = meta.icon
        const isActive = activeStatusFilter === status
        const count = counts[status]

        return (
          <button
            key={status}
            type="button"
            onClick={() => onFilterByStatus(isActive ? null : status)}
            className={`group relative flex flex-col gap-3 rounded-xl border bg-white p-5 text-left shadow-sm transition-all hover:shadow-md dark:bg-gray-800 ${
              isActive
                ? 'border-indigo-500 ring-2 ring-indigo-500 dark:border-indigo-400'
                : 'border-gray-200 dark:border-gray-700'
            }`}
            aria-pressed={isActive}
          >
            <div className="flex items-center justify-between">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[status]}`}
              >
                <Icon className="h-3.5 w-3.5" />
                {meta.label}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                {count}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {count === 1 ? 'item' : 'items'}
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}

export default InventoryStatCards
