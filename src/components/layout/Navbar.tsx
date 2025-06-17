import { Link } from 'react-router-dom'
import { Box, User, Package } from 'lucide-react'

export default function Navbar() {
  return (
    <nav className="min-h-screen w-25 bg-white shadow-sm transition-colors duration-200 dark:bg-gray-800">
      <div className="flex h-full flex-col justify-between">
        <div className="flex flex-col items-center space-y-4 p-4">
          <Link
            to="/"
            className="text-2xl font-bold text-gray-900 transition-colors hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400"
          >
            BITS
          </Link>
          <Link
            to="/inventory"
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border-indigo-600 text-base font-medium text-gray-900 transition-colors hover:bg-gray-100 hover:text-indigo-600 dark:border-indigo-400 dark:text-white dark:hover:bg-gray-700 dark:hover:text-indigo-400"
          >
            <Package className="h-5 w-5" />
          </Link>
          <Link
            to="/SysDashboard"
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border-indigo-600 text-base font-medium text-gray-900 transition-colors hover:bg-gray-100 hover:text-indigo-600 dark:border-indigo-400 dark:text-white dark:hover:bg-gray-700 dark:hover:text-indigo-400"
          >
            <User className="h-5 w-5" />
          </Link>
          <Link
            to="/room"
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border-indigo-600 text-base font-medium text-gray-900 transition-colors hover:bg-gray-100 hover:text-indigo-600 dark:border-indigo-400 dark:text-white dark:hover:bg-gray-700 dark:hover:text-indigo-400"
          >
            <Box className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </nav>
  )
}
