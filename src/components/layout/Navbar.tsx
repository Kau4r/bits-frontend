import { NavLink } from 'react-router-dom'
import { Box, User, Package, LayoutDashboard } from 'lucide-react'

interface NavItemProps {
  to: string
  icon: React.ReactNode
  label: string
}

const NavItem = ({ to, icon, label }: NavItemProps) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex h-10 w-full items-center justify-center gap-2 rounded-lg text-base font-medium transition-colors hover:bg-gray-100 hover:text-indigo-600 dark:text-white dark:hover:bg-gray-700 dark:hover:text-indigo-400 ${
          isActive
            ? 'bg-indigo-50 text-indigo-600 dark:bg-gray-700 dark:text-indigo-400'
            : 'text-gray-900 dark:text-gray-400'
        }`
      }
      title={label}
    >
      {icon}
    </NavLink>
  )
}

export default function Navbar() {
  const navItems = [
    { to: '/labtech-dashboard', icon: <LayoutDashboard className="h-5 w-5" />, label: 'Labtech Dashboard' },
    { to: '/inventory', icon: <Package className="h-5 w-5" />, label: 'Inventory' },
    { to: '/room', icon: <Box className="h-5 w-5" />, label: 'Rooms' },
    { to: '/SysDashboard', icon: <User className="h-5 w-5" />, label: 'Admin' },
  ]

  return (
    <nav className="fixed inset-y-0 left-0 z-50 w-20 bg-white shadow-sm transition-colors duration-200 dark:bg-gray-800 flex flex-col h-screen">
      {/* Logo at the top */}
      <div className="flex-shrink-0 p-4">
        <NavLink
          to="/"
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-white mx-auto"
          title="BITS"
        >
          <span className="text-xl font-bold">B</span>
        </NavLink>
      </div>
      
      {/* Navigation items - will scroll if needed */}
      <div className="flex-1 overflow-y-auto py-4 px-2">
        <div className="space-y-2">
          {navItems.map((item) => (
            <NavItem key={item.to} to={item.to} icon={item.icon} label={item.label} />
          ))}
        </div>
      </div>
      
      {/* User profile at the bottom */}
      <div className="flex-shrink-0 p-4">
        <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mx-auto">
          <User className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        </div>
      </div>
    </nav>
  )
}
