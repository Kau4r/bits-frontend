import { Inbox, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({ icon: Icon = Inbox, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center w-full", className)}>
      <div className="p-4 bg-gray-100 dark:bg-gray-800/50 rounded-full mb-4">
        <Icon className="h-12 w-12 text-gray-400" />
      </div>
      <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 text-center max-w-sm px-6">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-6 inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
