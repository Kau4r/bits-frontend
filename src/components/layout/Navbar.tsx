import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { User } from 'lucide-react'

const roleRoutes = {
  'System Admin': [
    { label: 'User', path: '/SysDashboard' },
    { label: 'Room', path: '/room' },
  ],
  Faculty: [
    { label: 'Schedule', path: '/faculty/schedule' },
    { label: 'Report Issue', path: '/faculty/report' },
    { label: 'Borrow Item', path: '/faculty/borrow' },
  ],
  'Lab Tech': [
    { label: 'Tickets', path: '/labtech/tickets' },
    { label: 'Borrow Requests', path: '/labtech/borrow-requests' },
    { label: 'Inventory', path: '/inventory' },
    { label: 'Room Queueing', path: '/labtech/queue-room' },
  ],
  'Lab Head': [
    { label: 'Faculty Schedules', path: '/labhead/faculty-schedule' },
    { label: 'Lab Tech Reports', path: '/labhead/reports' },
    { label: 'Tickets', path: '/labtech/tickets' },
    { label: 'Inventory', path: '/inventory' },
  ],
  Student: [
    { label: 'Borrow Computer', path: '/student/borrow' },
  ],
} as const

const roles = Object.keys(roleRoutes) as (keyof typeof roleRoutes)[]

export default function RoleNavbar() {
  const [currentRole, setCurrentRole] = useState<keyof typeof roleRoutes>('System Admin')
  const navItems = roleRoutes[currentRole]

  return (
    <nav className="fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col bg-white shadow-sm dark:bg-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3 dark:border-gray-700">
        <span className="text-xl font-bold text-indigo-600">BITS</span>
        <select
          value={currentRole}
          onChange={(e) => setCurrentRole(e.target.value as keyof typeof roleRoutes)}
          className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        >
          {roles.map((role) => (
            <option key={role} value={role}>{role}</option>
          ))}
        </select>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-2 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `block rounded-md px-3 py-2 text-sm font-medium transition ${isActive
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-white'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>

      {/* User Info */}
      <div className="border-t px-4 py-3 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <User className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          <span className="text-sm font-medium text-gray-900 dark:text-white">{currentRole}</span>
        </div>
      </div>
    </nav>
  )
}
