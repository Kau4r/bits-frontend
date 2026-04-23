import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'

export type SortDirection = 'asc' | 'desc' | null

export interface SortConfig {
  key: string
  direction: SortDirection
}

interface TableHeader {
  label: React.ReactNode
  key?: string // If provided, column is sortable
  align?: 'left' | 'center' | 'right'
}

interface TableProps {
  headers: (string | TableHeader)[]
  children: React.ReactNode
  sortConfig?: SortConfig
  onSort?: (key: string) => void
  columnWidths?: string // e.g., "2fr 2fr 1fr 1fr"
  density?: 'comfortable' | 'compact'
  scrollShadow?: boolean
}

const Table = ({ headers, children, sortConfig, onSort, columnWidths, density = 'comfortable', scrollShadow = false }: TableProps) => {
  const colCount = headers.length
  const gridCols = columnWidths || `repeat(${colCount}, minmax(0, 1fr))`
  const cellPadding = density === 'compact' ? 'px-4 py-3' : 'px-6 py-4'
  const headerPadding = density === 'compact' ? 'px-4 py-3' : 'px-6 py-4'
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [scrollState, setScrollState] = useState({ top: false, bottom: false })

  const updateScrollState = () => {
    const element = scrollRef.current
    if (!element) return

    const maxScrollTop = element.scrollHeight - element.clientHeight
    setScrollState({
      top: element.scrollTop > 4,
      bottom: maxScrollTop - element.scrollTop > 4,
    })
  }

  useEffect(() => {
    updateScrollState()

    const element = scrollRef.current
    if (!element || typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(updateScrollState)
    observer.observe(element)
    return () => observer.disconnect()
  }, [children])

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
        <div key={idx} className={`flex min-w-0 items-center ${cellPadding} ${justifyClass}`}>
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
    <div className="relative flex h-full w-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      {scrollShadow && (
        <>
          <div className={`pointer-events-none absolute inset-x-0 top-0 z-20 h-8 bg-gradient-to-b from-black/12 to-transparent transition-opacity dark:from-black/35 ${scrollState.top ? 'opacity-100' : 'opacity-0'}`} />
          <div className={`pointer-events-none absolute inset-x-0 bottom-0 z-20 h-8 bg-gradient-to-t from-black/12 to-transparent transition-opacity dark:from-black/35 ${scrollState.bottom ? 'opacity-100' : 'opacity-0'}`} />
        </>
      )}
      <div ref={scrollRef} onScroll={updateScrollState} className="min-h-0 flex-1 overflow-auto">
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
              const sortIconClass = align === 'center' ? 'absolute left-full ml-1' : ''
              const baseClass = `group relative flex items-center ${headerPadding} ${justifyClass} ${isActive ? 'text-indigo-600 dark:text-indigo-400' : ''}`

              // Non-sortable headers render as a plain <div> so interactive
              // content (checkboxes, action buttons) inside the label can receive
              // clicks without fighting a wrapping <button>.
              if (!isSortable) {
                return (
                  <div key={idx} className={`${baseClass} cursor-default`}>
                    {label}
                  </div>
                )
              }

              return (
                <button
                  key={idx}
                  type="button"
                  className={`${baseClass} cursor-pointer select-none transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200`}
                  onClick={() => handleHeaderClick(header)}
                >
                  <span className="relative inline-flex items-center">
                    {label}
                    <span className={sortIconClass}>{renderSortIcon(header)}</span>
                  </span>
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
