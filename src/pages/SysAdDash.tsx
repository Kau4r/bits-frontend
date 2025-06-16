import Table from '@/components/Table'
import Search from '@/components/Search'
import { useState } from 'react'
import { PlusIcon } from '@heroicons/react/24/outline'
import { useNavigate } from 'react-router-dom'

const mockUsers = [
  {
    name: 'John Doe',
    email: 'john.doe@example.com',
    role: 'Admin',
    status: 'Active',
  },
  {
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    role: 'Student',
    status: 'Active',
  },
]

export default function SysAdDash() {
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const navigate = useNavigate()
  const filteredUsers = mockUsers.filter((user) =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  )
  return (
    <div className="h-full w-full bg-white p-4 sm:px-8 lg:px-10 dark:bg-gray-900">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold">Account Management</h2>
        <Search searchTerm={searchTerm} onChange={setSearchTerm} showLabel={false} />
        <button
          className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none dark:bg-indigo-700 dark:hover:bg-indigo-600"
          onClick={() => {
            setIsModalOpen(true)
          }}
        >
          <PlusIcon className="mr-2 h-5 w-5" />
          Add User
        </button>
      </div>
      <Table headers={['Name', 'Email', 'Role', 'Status']}>
        {filteredUsers.map((user) => (
          <div
            key={user.email}
            className="grid cursor-pointer grid-cols-4 items-center gap-x-4 px-6 py-4 transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-gray-700"
            onClick={() => {
              navigate(`/user/${user.email}`, {
                state: { user },
              })
            }}
          >
            <div className="truncate text-base font-semibold text-gray-800 dark:text-white">
              {user.name}
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-300">{user.email}</div>
            <div>
              <span className="inline-flex items-center justify-center gap-1.5 rounded-full bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                {user.role}
              </span>
            </div>

            <div>
              <span
                className={`inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
                  user.status === 'Active'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : user.status === 'In Use'
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      : user.status === 'Maintenance'
                        ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}
              >
                {user.status}
              </span>
            </div>
          </div>
        ))}
      </Table>
    </div>
  )
}
