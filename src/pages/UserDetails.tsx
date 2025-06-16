import { useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'
import Table from '@/components/Table'

const mockPermissions = [
  { module: 'Dashboard', roleAccess: 'View', currentAccess: 'View', override: 'View' },
  { module: 'Inventory', roleAccess: 'Edit', currentAccess: 'Edit', override: 'Edit' },
  { module: 'Users', roleAccess: 'None', currentAccess: 'Admin', override: 'Admin' },
  { module: 'Reports', roleAccess: 'View', currentAccess: 'View', override: null },
]

export default function UserDetails() {
  const { state } = useLocation()
  const user = state?.user
  const navigate = useNavigate()

  const [overrides, setOverrides] = useState(() => {
    const map = new Map()
    mockPermissions.forEach((perm) => {
      map.set(perm.module, perm.override)
    })
    return map
  })

  const handleChange = (module: string, value: string) => {
    setOverrides(new Map(overrides.set(module, value)))
  }

  if (!user) return <div className="py-8 text-center">Loading...</div>

  return (
    <div className="h-full w-full bg-white p-4 sm:px-8 lg:px-10 dark:bg-gray-900">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      <div className="mb-8 flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-lg font-bold text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
          {user.name
            .split(' ')
            .map((n: string) => n[0])
            .join('')
            .toUpperCase()}
        </div>
        <div className="flex flex-1 flex-col justify-between sm:flex-row sm:items-center">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{user.name}</h1>
            <p className="text-sm text-gray-600 dark:text-gray-300">{user.email}</p>
          </div>
          <div className="mt-2 flex gap-2 sm:mt-0">
            <span
              className={`inline-block rounded-full border px-3 py-1 text-xs font-medium ${
                user.role === 'admin'
                  ? 'border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-900 dark:text-blue-300'
                  : 'border-green-300 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900 dark:text-green-300'
              }`}
            >
              Role: {user.role}
            </span>
            <span
              className={`inline-block rounded-full border px-3 py-1 text-xs font-medium ${
                user.status === 'active'
                  ? 'border-green-300 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900 dark:text-green-300'
                  : 'border-yellow-300 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
              }`}
            >
              Status: {user.status}
            </span>
          </div>
        </div>
      </div>

      {/* Access Permissions */}
      <div className="mb-8">
        <h2 className="mb-4 text-xl font-bold dark:text-white">Access Permissions</h2>
        <Table headers={['Module', 'Role Access', 'Current Access', 'Override']}>
          {mockPermissions.map(({ module, roleAccess, currentAccess, override }) => (
            <div
              key={module}
              className="grid grid-cols-4 px-6 py-4 text-sm text-gray-800 dark:text-gray-100"
            >
              <div>{module}</div>
              <div>{roleAccess}</div>
              <div>{currentAccess}</div>
              <div>
                {override === null ? (
                  <span className="text-gray-400 italic">Locked</span>
                ) : (
                  <select
                    className="w-fit rounded border border-gray-300 bg-white px-2 py-1 pr-8 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    value={overrides.get(module)}
                    onChange={(e) => handleChange(module, e.target.value)}
                  >
                    <option value="none">None</option>
                    <option value="view">View</option>
                    <option value="edit">Edit</option>
                    <option value="admin">Admin</option>
                  </select>
                )}
              </div>
            </div>
          ))}
        </Table>

        <div className="mt-6 flex justify-end gap-4">
          <button className="rounded border border-gray-300 px-4 py-2 text-sm dark:border-gray-600 dark:text-white">
            Reset to Role Defaults
          </button>
          <button className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            Save Changes
          </button>
        </div>
      </div>

      {/* Recent Activities Section Placeholder */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-600 dark:bg-gray-800">
        <h2 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white">
          Recent Activities
        </h2>
        <p className="text-sm text-gray-500 italic dark:text-gray-300">
          Activity log will appear here once available.
        </p>
      </div>
    </div>
  )
}
