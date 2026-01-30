import Table, { type SortConfig, type SortDirection } from '@/components/Table'
import Search from '@/components/Search'
import { useEffect, useState, useMemo } from 'react'
import { PlusIcon, UserGroupIcon, FunnelIcon } from '@heroicons/react/24/outline'
import { useNavigate } from 'react-router-dom'
import AddUserModal from '@/components/SysAd/user/AddUserModal'
import { fetchUsers, addUser } from '@/services/user'
import type { User } from '@/types/user'
import { ROLES, type User_Role } from "@/types/user"
import { useModal } from '@/context/ModalContext'
import toast from 'react-hot-toast'


export function formatRole(role?: string | null) {
  if (!role) return "Unknown";
  return String(role)
    .replace(/_/g, " ")            // LAB_TECH -> LAB TECH
    .toLowerCase()                 // "lab tech"
    .split(" ")                    // ["lab", "tech"]
    .map(w => w.charAt(0).toUpperCase() + w.slice(1)) // ["Lab","Tech"]
    .join(" ");                    // "Lab Tech"
}

export default function SysAdDash() {
  const [searchTerm, setSearchTerm] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [roleFilter, setRoleFilter] = useState<User_Role | 'ALL'>('ALL')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'asc' })
  const navigate = useNavigate()
  const modal = useModal()

  const roleClasses: Record<User_Role, string> = {
    [ROLES.ADMIN]: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    [ROLES.LAB_HEAD]: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    [ROLES.LAB_TECH]: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    [ROLES.FACULTY]: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
    [ROLES.SECRETARY]: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    [ROLES.STUDENT]: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  }

  const loadUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchUsers()
      setUsers(data)
    } catch (err) {
      setError('Failed to fetch users.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        // Cycle through: asc -> desc -> null -> asc
        const nextDirection: SortDirection =
          prev.direction === 'asc' ? 'desc' :
            prev.direction === 'desc' ? null : 'asc'
        return { key, direction: nextDirection }
      }
      return { key, direction: 'asc' }
    })
  }

  const filteredAndSortedUsers = useMemo(() => {
    // Filter
    let result = users.filter((user) => {
      const fullName = `${user.First_Name} ${user.Last_Name}`.toLowerCase()
      const matchesSearch = fullName.includes(searchTerm.toLowerCase()) ||
        user.Email?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = showInactive ? !user.Is_Active : user.Is_Active
      const matchesRole = roleFilter === 'ALL' || user.User_Role === roleFilter
      return matchesSearch && matchesStatus && matchesRole
    })

    // Sort
    if (sortConfig.direction) {
      result = [...result].sort((a, b) => {
        let aValue: string | boolean = ''
        let bValue: string | boolean = ''

        switch (sortConfig.key) {
          case 'name':
            aValue = `${a.First_Name} ${a.Last_Name}`.toLowerCase()
            bValue = `${b.First_Name} ${b.Last_Name}`.toLowerCase()
            break
          case 'email':
            aValue = a.Email?.toLowerCase() || ''
            bValue = b.Email?.toLowerCase() || ''
            break
          case 'role':
            aValue = a.User_Role || ''
            bValue = b.User_Role || ''
            break
          case 'status':
            aValue = a.Is_Active
            bValue = b.Is_Active
            break
        }

        if (typeof aValue === 'boolean') {
          return sortConfig.direction === 'asc'
            ? (aValue === bValue ? 0 : aValue ? -1 : 1)
            : (aValue === bValue ? 0 : aValue ? 1 : -1)
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }

    return result
  }, [users, searchTerm, showInactive, roleFilter, sortConfig])


  const handleAddUser = async (newUser: Omit<User, 'User_ID'> & { Password: string }) => {
    try {
      const addedUser = await addUser(newUser)
      setUsers((prev) => [...prev, addedUser])
      setIsModalOpen(false)
      toast.success('User created successfully')
    } catch (err) {
      console.error(err)
      await modal.showError('Failed to add user.', 'Error')
    }
  }

  const clearFilters = () => {
    setSearchTerm('')
    setRoleFilter('ALL')
    setShowInactive(false)
  }

  const hasActiveFilters = searchTerm || roleFilter !== 'ALL' || showInactive

  const tableHeaders = [
    { label: 'Name', key: 'name' },
    { label: 'Email', key: 'email', align: 'left' as const },
    { label: 'Role', key: 'role' },
    { label: 'Status', key: 'status' },
  ]

  if (loading) {
    return (
      <div className="h-full w-full bg-white p-6 sm:px-8 lg:px-10 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="h-8 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
          <div className="h-10 w-64 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
          <div className="h-10 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
          <div className="h-10 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
        </div>
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded bg-gray-200 dark:bg-gray-800"
            />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-white p-4 dark:bg-gray-900">
        <div className="text-center">
          <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            {error}
          </h3>
          <button
            onClick={loadUsers}
            className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col bg-white p-6 sm:px-8 lg:px-10 dark:bg-gray-900">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Account Management</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage user accounts, roles, and permissions</p>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-500 hover:shadow-md focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none active:bg-indigo-700"
          onClick={() => setIsModalOpen(true)}
        >
          <PlusIcon className="h-5 w-5" />
          Add User
        </button>
      </div>

      {/* Filters Bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="min-w-[280px] flex-1">
          <Search searchTerm={searchTerm} onChange={setSearchTerm} showLabel={false} placeholder="Search by name or email..." />
        </div>

        {/* Role Filter */}
        <div className="relative">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as User_Role | 'ALL')}
            className="appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-4 pr-10 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
          >
            <option value="ALL">All Roles</option>
            {Object.values(ROLES).map((role) => (
              <option key={role} value={role}>{formatRole(role)}</option>
            ))}
          </select>
          <FunnelIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        </div>

        {/* Status Toggle */}
        <div className="flex rounded-lg border border-gray-300 bg-white shadow-sm dark:border-gray-600 dark:bg-gray-800">
          <button
            onClick={() => setShowInactive(false)}
            className={`rounded-l-lg px-4 py-2 text-sm font-medium transition-colors ${!showInactive
              ? 'bg-green-600 text-white'
              : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
          >
            Active
          </button>
          <button
            onClick={() => setShowInactive(true)}
            className={`rounded-r-lg px-4 py-2 text-sm font-medium transition-colors ${showInactive
              ? 'bg-gray-600 text-white'
              : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
          >
            Inactive
          </button>
        </div>

        {/* Results Count */}
        <div className="ml-auto flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <span className="font-semibold text-gray-900 dark:text-white">{filteredAndSortedUsers.length}</span>
          <span>of {users.length} users</span>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <Table
          headers={tableHeaders}
          sortConfig={sortConfig}
          onSort={handleSort}
          columnWidths="2fr 2fr 1fr 1fr"
        >
          {filteredAndSortedUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 w-full min-h-full" data-full-row>
              <UserGroupIcon className="h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                {hasActiveFilters ? "No users match your filters" : `No ${showInactive ? 'inactive' : 'active'} users`}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 text-center max-w-sm">
                {hasActiveFilters
                  ? "Try adjusting your search or filter criteria"
                  : showInactive
                    ? "All users are currently active"
                    : "Get started by adding your first user"}
              </p>
              {hasActiveFilters ? (
                <button
                  onClick={clearFilters}
                  className="mt-4 inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-600"
                >
                  Clear Filters
                </button>
              ) : !showInactive && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="mt-4 inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Add User
                </button>
              )}
            </div>
          ) : (
            filteredAndSortedUsers.map((user) => (
              <button
                key={user.Email}
                type="button"
                className="group grid w-full cursor-pointer items-center px-6 py-4 text-left transition-all duration-150 hover:bg-indigo-50/50 focus:bg-indigo-50 focus:outline-none dark:hover:bg-indigo-900/10 dark:focus:bg-indigo-900/20"
                style={{ gridTemplateColumns: '2fr 2fr 1fr 1fr' }}
                onClick={() => navigate(`/user/${user.Email}`, { state: { user } })}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white shadow-sm">
                    {`${user.First_Name?.[0] ?? ''}${user.Last_Name?.[0] ?? ''}`.toUpperCase()}
                  </div>
                  <span className="truncate text-sm font-semibold text-gray-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
                    {user.First_Name} {user.Last_Name}
                  </span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{user.Email}</div>
                <div className="flex justify-center">
                  <span
                    className={`inline-flex items-center justify-center rounded-full px-2.5 py-1 text-xs font-medium ${roleClasses[user.User_Role]}`}
                  >
                    {formatRole(user.User_Role)}
                  </span>
                </div>
                <div className="flex justify-center">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${user.Is_Active
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400'
                      }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${user.Is_Active ? 'bg-green-500' : 'bg-red-500'}`} />
                    {user.Is_Active ? "Active" : "Inactive"}
                  </span>
                </div>
              </button>
            ))
          )}
        </Table>
      </div>

      {isModalOpen && <AddUserModal onClose={() => setIsModalOpen(false)} onSubmit={handleAddUser} />}
    </div>
  )
}
