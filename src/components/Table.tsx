interface TableProps {
  headers: string[]
  children: React.ReactNode
}

const Table = ({ headers, children }: TableProps) => {
  const columnCount = headers.length
  const gridStyle = {
    gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
  }
  return (
    <div className="w-full divide-y divide-gray-200 rounded-lg border dark:divide-gray-700 dark:border-gray-700">
      <div className="w-full overflow-x-auto">
        {/* Header */}
        <div
          className="grid rounded-t-lg bg-gray-50 px-6 py-4 text-start text-sm font-medium tracking-wider text-gray-600 uppercase dark:bg-gray-800 dark:text-gray-300"
          style={gridStyle}
        >
          {headers.map((h) => (
            <div>{h}</div>
          ))}
        </div>

        {/* Rows */}
        <div className="divide-y divide-gray-200 dark:divide-gray-700">{children}</div>
      </div>
    </div>
  )
}

export default Table
