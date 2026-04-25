import { cn } from "@/lib/utils"

type SkeletonType =
  | "card"
  | "table"
  | "text"
  | "page"            // full-page: header + filters + table
  | "table-rows"      // table rows that mirror a typical record (chip + description + chip + date + actions)
  | "request-cards"   // grid of borrowing/booking request cards
  | "dashboard"       // dashboard summary tile grid
  | "sidebar-rows"    // left-side navigation/list rows

interface LoadingSkeletonProps {
  className?: string
  rows?: number
  type?: SkeletonType
  /** Number of grid columns for "table-rows" type. Defaults to 6. */
  columns?: number
}

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-md bg-gray-200 dark:bg-gray-700", className)} />
  )
}

const TableRows = ({ rows, columns }: { rows: number; columns: number }) => {
  const gridCols = `repeat(${columns}, minmax(0, 1fr))`
  return (
    <>
      {/* Header bar mirroring the real Table component */}
      <div
        className="border-b border-gray-200 bg-gray-50/90 px-6 py-3 dark:border-gray-700 dark:bg-gray-800/90"
        style={{ display: "grid", gridTemplateColumns: gridCols }}
      >
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-20" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="border-b border-gray-100 px-6 py-4 dark:border-gray-800"
          style={{ display: "grid", gridTemplateColumns: gridCols }}
        >
          {Array.from({ length: columns }).map((_, j) => {
            // Vary widths/shapes so it doesn't look uniform: chip, name, sentence, date, action.
            if (j === 0) return <Skeleton key={j} className="h-4 w-24" />
            if (j === 1) return <Skeleton key={j} className="h-4 w-full max-w-[260px]" />
            if (j === columns - 2) return <Skeleton key={j} className="h-6 w-24 rounded-full" />
            if (j === columns - 1) return <Skeleton key={j} className="h-8 w-20 rounded-md justify-self-center" />
            return <Skeleton key={j} className="h-4 w-3/4" />
          })}
        </div>
      ))}
    </>
  )
}

export function LoadingSkeleton({ className, rows = 5, type = "table", columns = 6 }: LoadingSkeletonProps) {
  if (type === "card") {
    return (
      <div className={cn("space-y-4", className)}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <Skeleton className="mb-3 h-4 w-1/3" />
            <Skeleton className="mb-2 h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        ))}
      </div>
    )
  }

  if (type === "page") {
    return (
      <div className={cn("flex h-full w-full flex-col", className)}>
        {/* Page header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        {/* Filter bar */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Skeleton className="h-10 min-w-[280px] flex-1" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-44" />
        </div>
        {/* Table area */}
        <div className="flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <TableRows rows={rows} columns={columns} />
        </div>
      </div>
    )
  }

  if (type === "table-rows") {
    return (
      <div className={cn("flex h-full w-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800", className)}>
        <TableRows rows={rows} columns={columns} />
      </div>
    )
  }

  if (type === "request-cards") {
    return (
      <div className={cn("grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3", className)}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-3 flex items-center justify-between">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="mb-2 h-4 w-2/3" />
            <Skeleton className="mb-4 h-4 w-1/2" />
            <div className="flex justify-between border-t border-gray-100 pt-3 dark:border-gray-700">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (type === "dashboard") {
    return (
      <div className={cn("grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4", className)}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-12" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (type === "sidebar-rows") {
    return (
      <div className={cn("space-y-2", className)}>
        <Skeleton className="mb-4 h-10 w-full rounded-lg" />
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg p-2">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-2 w-1/3" />
            </div>
            <Skeleton className="h-4 w-10 rounded" />
          </div>
        ))}
      </div>
    )
  }

  // Default: simple "table" — generic flat rows
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  )
}

export { Skeleton }
