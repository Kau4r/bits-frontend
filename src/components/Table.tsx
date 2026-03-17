import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import React from 'react'

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
        <ChevronsUpDown className="ml-1 h-4 w-4 text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300" />
      )
    }

    return direction === 'asc' ? (
      <ChevronUp className="ml-1 h-4 w-4 text-indigo-500" />
    ) : (
      <ChevronDown className="ml-1 h-4 w-4 text-indigo-500" />
    )
  }

  // Process children to apply grid layout and proper cell alignment
  const processedChildren = React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) return child

    const element = child as React.ReactElement<any>

    // Check if this child wants to be full width (no grid)
    const isFullWidth = element.props['data-full-row'] || element.props.className?.includes('col-span-full')

    if (isFullWidth) {
      return child
    }

    // Get the direct children (cells) from the row element
    const cellChildren = React.Children.toArray(element.props.children)

    // Wrap each cell with proper alignment that matches headers
    const alignedCells = cellChildren.map((cell, idx) => {
      const header = headers[idx]
      const align = typeof header !== 'string' && header?.align ? header.align : (idx === 0 ? 'left' : 'center')
      const justifyClass = align === 'left' ? 'justify-start' : align === 'right' ? 'justify-end' : 'justify-center'

      return (
        <div key={idx} className={`flex items-center px-6 py-4 min-w-0 ${justifyClass}`}>
          {cell}
        </div>
      )
    })

    // Clone the row element with grid layout and aligned cells
    return React.cloneElement(element, {
      ...element.props,
      style: {
        display: 'grid',
        gridTemplateColumns: gridCols,
        ...(element.props.style || {})
      },
      // Remove the original px-6 py-4 since cells now have it
      className: `${element.props.className?.replace(/px-6|py-4/g, '').trim() || ''} border-b border-gray-200 dark:border-gray-700/50`.trim(),
      children: alignedCells
    })
  })

  return (
    <div className="flex w-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 h-full">
      <div className="flex-1 overflow-auto min-h-0">
        <div className="min-w-full min-h-full flex flex-col align-middle">
          {/* Header */}
          <div
            className="sticky top-0 z-10 flex-none border-b border-gray-200 bg-gray-50/90 backdrop-blur-sm text-xs font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-700 dark:bg-gray-800/90 dark:text-gray-400 group/header"
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
                  className={`group flex items-center px-6 py-4 ${justifyClass} ${isSortable
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
          <div className="flex-1 border-gray-200 dark:border-gray-700/50 flex flex-col">
            {processedChildren}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Table