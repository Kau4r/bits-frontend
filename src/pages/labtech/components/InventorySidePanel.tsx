import { useEffect, useMemo, useState } from 'react'
import {
  TrendingUp,
  AlertTriangle,
  PackagePlus,
  type LucideIcon,
} from 'lucide-react'
import type { Item } from '@/types/inventory'
import type { Borrowing } from '@/types/borrowing'
import { getBorrowings } from '@/services/borrowing'
import { formatItemType, isBrandPlaceholder } from '@/lib/utils'

// Fallback chain for secondary-line text on a small item card.
// Real brand → Item Type → Room → generic fallback.
const secondaryLine = (item: Item): string => {
  if (!isBrandPlaceholder(item.Brand)) return item.Brand!.trim()
  const type = formatItemType(item.Item_Type)
  if (type) return type
  if (item.Room?.Name) return item.Room.Name
  return 'No details'
}

interface InventorySidePanelProps {
  inventory: Item[]
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

const relativeTime = (iso?: string): string => {
  if (!iso) return '—'
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return '—'
  const diff = Date.now() - then
  const days = Math.floor(diff / MS_PER_DAY)
  if (days <= 0) {
    const hrs = Math.floor(diff / (60 * 60 * 1000))
    if (hrs <= 0) return 'just now'
    return `${hrs}h ago`
  }
  if (days === 1) return '1 day ago'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  if (months === 1) return '1 month ago'
  if (months < 12) return `${months} months ago`
  const years = Math.floor(days / 365)
  return years === 1 ? '1 year ago' : `${years} years ago`
}

const SectionHeader = ({
  icon: Icon,
  label,
  iconClass,
}: {
  icon: LucideIcon
  label: string
  iconClass: string
}) => (
  <div className="mb-3 flex items-center gap-2">
    <Icon className={`h-4 w-4 ${iconClass}`} />
    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
      {label}
    </h4>
  </div>
)

const EmptyRow = ({ text }: { text: string }) => (
  <p className="py-2 text-xs text-gray-500 dark:text-gray-400">{text}</p>
)

const InventorySidePanel = ({ inventory }: InventorySidePanelProps) => {
  const [borrowings, setBorrowings] = useState<Borrowing[]>([])
  const [loadingBorrowings, setLoadingBorrowings] = useState(true)

  useEffect(() => {
    let alive = true
    const load = async () => {
      setLoadingBorrowings(true)
      try {
        const data = await getBorrowings()
        if (alive) setBorrowings(Array.isArray(data) ? data : [])
      } catch {
        // api.ts already toasts — silent fail for dashboard
        if (alive) setBorrowings([])
      } finally {
        if (alive) setLoadingBorrowings(false)
      }
    }
    load()
    return () => {
      alive = false
    }
  }, [])

  // --- a. Most Borrowed (last 7 days) ---
  const mostBorrowed = useMemo(() => {
    const cutoff = Date.now() - 7 * MS_PER_DAY
    const itemById = new Map<number, Item>()
    for (const item of inventory) {
      if (item.Item_ID != null) itemById.set(item.Item_ID, item)
    }

    const counts = new Map<number, number>()
    for (const b of borrowings) {
      // Use Borrow_Date as the temporal anchor (confirmed field on Borrowing type)
      const ts = b.Borrow_Date ? new Date(b.Borrow_Date).getTime() : NaN
      if (Number.isNaN(ts) || ts < cutoff) continue
      const itemId = b.Item?.Item_ID
      if (itemId == null) continue
      counts.set(itemId, (counts.get(itemId) ?? 0) + 1)
    }

    return Array.from(counts.entries())
      .map(([itemId, count]) => ({
        item: itemById.get(itemId) ?? b_itemFromBorrowing(borrowings, itemId),
        count,
      }))
      .filter((row) => row.item)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
  }, [borrowings, inventory])

  // --- b. Recently Defective (last 30 days, updated) ---
  const recentlyDefective = useMemo(() => {
    const cutoff = Date.now() - 30 * MS_PER_DAY
    return inventory
      .filter((item) => {
        if (item.Status !== 'DEFECTIVE') return false
        if (!item.Updated_At) return false
        const ts = new Date(item.Updated_At).getTime()
        return !Number.isNaN(ts) && ts >= cutoff
      })
      .sort((a, b) => {
        const ta = new Date(a.Updated_At ?? 0).getTime()
        const tb = new Date(b.Updated_At ?? 0).getTime()
        return tb - ta
      })
      .slice(0, 3)
  }, [inventory])

  // --- c. Recently Added (by Updated_At desc) ---
  const recentlyAdded = useMemo(() => {
    return [...inventory]
      .filter((item) => !!item.Updated_At)
      .sort((a, b) => {
        const ta = new Date(a.Updated_At ?? 0).getTime()
        const tb = new Date(b.Updated_At ?? 0).getTime()
        return tb - ta
      })
      .slice(0, 3)
  }, [inventory])

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-3 md:grid-cols-3">
      {/* Most Borrowed */}
      <div className="flex h-full min-h-[160px] flex-col rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <SectionHeader
          icon={TrendingUp}
          label="Most Borrowed This Week"
          iconClass="text-indigo-600 dark:text-indigo-400"
        />
        {loadingBorrowings ? (
          <ul className="min-h-0 flex-1 divide-y divide-gray-100 dark:divide-gray-700">
            {[0, 1, 2].map((i) => (
              <li key={i} className="flex items-center justify-between gap-2 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
                  <div className="h-3 w-28 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                </div>
                <div className="h-3 w-6 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              </li>
            ))}
          </ul>
        ) : mostBorrowed.length === 0 ? (
          <EmptyRow text="No borrows in the past 7 days" />
        ) : (
          <ul className="min-h-0 flex-1 divide-y divide-gray-100 overflow-y-auto dark:divide-gray-700">
            {mostBorrowed.map(({ item, count }) => (
              <li
                key={item!.Item_ID}
                className="flex items-center justify-between gap-2 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-gray-900 dark:text-white">
                    {item!.Item_Code ?? '—'}
                  </p>
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                    {secondaryLine(item!)}
                  </p>
                </div>
                <span className="inline-flex min-w-[2rem] items-center justify-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                  {count}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Recently Defective */}
      <div className="flex h-full min-h-[160px] flex-col rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <SectionHeader
          icon={AlertTriangle}
          label="Recently Defective"
          iconClass="text-orange-600 dark:text-orange-400"
        />
        {recentlyDefective.length === 0 ? (
          <EmptyRow text="None flagged recently" />
        ) : (
          <ul className="min-h-0 flex-1 divide-y divide-gray-100 overflow-y-auto dark:divide-gray-700">
            {recentlyDefective.map((item) => (
              <li
                key={item.Item_ID}
                className="flex items-center justify-between gap-2 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-gray-900 dark:text-white">
                    {item.Item_Code ?? '—'}
                  </p>
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                    {secondaryLine(item)}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
                  flagged {relativeTime(item.Updated_At)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Recently Added */}
      <div className="flex h-full min-h-[160px] flex-col rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <SectionHeader
          icon={PackagePlus}
          label="Recently Added"
          iconClass="text-emerald-600 dark:text-emerald-400"
        />
        {recentlyAdded.length === 0 ? (
          <EmptyRow text="No items yet" />
        ) : (
          <ul className="min-h-0 flex-1 divide-y divide-gray-100 overflow-y-auto dark:divide-gray-700">
            {recentlyAdded.map((item) => (
              <li
                key={item.Item_ID}
                className="flex items-center justify-between gap-2 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-gray-900 dark:text-white">
                    {item.Item_Code ?? '—'}
                  </p>
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                    {secondaryLine(item)}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
                  {relativeTime(item.Updated_At)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// Fallback: look up the Item object directly from a borrowing record (in case it's not in inventory anymore)
function b_itemFromBorrowing(
  borrowings: Borrowing[],
  itemId: number,
): Item | undefined {
  for (const b of borrowings) {
    if (b.Item?.Item_ID === itemId) return b.Item
  }
  return undefined
}

export default InventorySidePanel
