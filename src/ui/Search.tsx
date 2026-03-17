import { Search as SearchIcon, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface SearchProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  label?: string
  showLabel?: boolean
}

export function Search({
  value,
  onChange,
  placeholder = "Search...",
  className,
  label = "Search",
  showLabel = false,
}: SearchProps) {
  return (
    <div className={cn("flex-1", className)}>
      {showLabel && (
        <label htmlFor="search" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          id="search"
          className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-10 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
