interface TableSearchInputProps {
  label?: string
  placeholder?: string
  searchTerm: string
  onChange: (value: string) => void
  showLabel?: boolean
}

const TableSearchInput = ({
  label = 'Search',
  placeholder = 'Search...',
  searchTerm,
  onChange,
  showLabel = true,
}: TableSearchInputProps) => {
  return (
    <div className="flex-1">
      {showLabel && (
        <label
          htmlFor="search"
          className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {label}
        </label>
      )}
      <input
        type="text"
        id="search"
        className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        placeholder={placeholder}
        value={searchTerm}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

export default TableSearchInput
