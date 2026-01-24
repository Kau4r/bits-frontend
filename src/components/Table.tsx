import { ChevronUpIcon, ChevronDownIcon, ChevronUpDownIcon } from '@heroicons/react/24/outline'

export type SortDirection = 'asc' | 'desc' | null

export interface SortConfig {
  key: string
  direction: SortDirection
}

interface TableHeader {
  label: string
  key?: string // If provided, column is sortable
  align?: 'left' | 'center' | 'right'
}

interface TableProps {
  headers: (string | TableHeader)[]
  children: React.ReactNode
  sortConfig?: SortConfig
  onSort?: (key: string) => void
  columnWidths?: string // e.g., "2fr 2fr 1fr 1fr"
}

const Table = ({ headers, children, sortConfig, onSort, columnWidths }: TableProps) => {
  const colCount = headers.length
  const gridCols = columnWidths || `repeat(${colCount}, minmax(0, 1fr))`

  const handleHeaderClick = (header: string | TableHeader) => {
    if (typeof header === 'string' || !header.key || !onSort) return
    onSort(header.key)
  }

  const renderSortIcon = (header: string | TableHeader) => {
    if (typeof header === 'string' || !header.key) return null

    const isActive = sortConfig?.key === header.key
    const direction = isActive ? sortConfig?.direction : null

    if (!direction) {
      return (
        <ChevronUpDownIcon className="ml-1 h-4 w-4 text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300" />
      )
    }

    return direction === 'asc' ? (
      <ChevronUpIcon className="ml-1 h-4 w-4 text-indigo-500" />
    ) : (
      <ChevronDownIcon className="ml-1 h-4 w-4 text-indigo-500" />
    )
  }

  return (
    <div className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="w-full overflow-x-auto">
        {/* Header */}
        <div
          className="border-b border-gray-200 bg-gray-50/80 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-400"
          style={{ display: 'grid', gridTemplateColumns: gridCols }}
        >
          {headers.map((header, idx) => {
            const label = typeof header === 'string' ? header : header.label
            const isSortable = typeof header !== 'string' && header.key && onSort
            const isActive = typeof header !== 'string' && sortConfig?.key === header.key && sortConfig?.direction
            const align = typeof header !== 'string' && header.align ? header.align : (idx === 0 ? 'left' : 'center')
            const justifyClass = align === 'left' ? 'justify-start' : align === 'right' ? 'justify-end' : 'justify-center'

            return (
              <button
                key={idx}
                type="button"
                disabled={!isSortable}
                className={`group flex items-center px-6 py-4 ${justifyClass} ${
                  isSortable
                    ? 'cursor-pointer select-none transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200'
                    : 'cursor-default'
                } ${isActive ? 'text-indigo-600 dark:text-indigo-400' : ''}`}
                onClick={() => handleHeaderClick(header)}
              >
                <span>{label}</span>
                {renderSortIcon(header)}
              </button>
            )
          })}
        </div>

        {/* Rows */}
        <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
          {children}
        </div>
      </div>
    </div>
  )
}

export default Table
