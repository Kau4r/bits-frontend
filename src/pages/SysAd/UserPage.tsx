import Table from '@/components/Table'
import Search from '@/components/Search'
import { useEffect, useState } from 'react'
import { PlusIcon } from '@heroicons/react/24/outline'
import { useNavigate } from 'react-router-dom'
import AddUserModal from '@/components/SysAd/user/AddUserModal'
import { fetchUsers, addUser } from '@/services/user'
import type { User } from '@/types/user'
import { ROLES, type User_Role } from "@/types/user"


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
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const roleClasses: Record<User_Role, string> = {
    [ROLES.ADMIN]: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    [ROLES.LAB_HEAD]: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    [ROLES.LAB_TECH]: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    [ROLES.FACULTY]: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
    [ROLES.SECRETARY]: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    [ROLES.STUDENT]: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  }


  useEffect(() => {
    const loadUsers = async () => {
      try {
        const data = await fetchUsers()
        setUsers(data)
        console.log('Fetched users:', data)
      } catch (err) {
        setError('Failed to fetch users.')
      } finally {
        setLoading(false)
      }
    }
    loadUsers()
  }, [])

  const filteredUsers = users.filter(
    (user) =>
      user.First_Name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false
  )


  const handleAddUser = async (newUser: User) => {
    try {
      const addedUser = await addUser(newUser)
      setUsers((prev) => [...prev, addedUser])
      setIsModalOpen(false)
    } catch (err) {
      console.error(err)
      alert('Failed to add user.')
    }
  }

  if (loading) return <div>Loading users...</div>
  if (error) return <div className="text-red-500">{error}</div>

  return (
    <div className="h-full w-full bg-white p-4 sm:px-8 lg:px-10 dark:bg-gray-900">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold">Account Management</h2>
        <Search searchTerm={searchTerm} onChange={setSearchTerm} showLabel={false} />
        <button
          className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none dark:bg-indigo-700 dark:hover:bg-indigo-600"
          onClick={() => setIsModalOpen(true)}
        >
          <PlusIcon className="mr-2 h-5 w-5" />
          Add User
        </button>
      </div>

      <Table headers={['Name', 'Email', 'Role', 'Status']}>
        {filteredUsers.map((user) => (
          <div
            key={user.Email}
            className="grid cursor-pointer grid-cols-4 items-center gap-x-4 px-6 py-4 transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-gray-700"
            onClick={() => navigate(`/user/${user.Email}`, { state: { user } })}
          >
            <div className="truncate text-base font-semibold text-gray-800 dark:text-white">
              {user.First_Name} {user.Last_Name}
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-300">{user.Email}</div>
            <div>
              <span
                className={`inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${roleClasses[user.User_Role]
                  }`}
              >
                {user.User_Role.toLowerCase().split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")}
              </span>
            </div>
            <div>
              <span
                className={`inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${user.Is_Active === true
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}
              >
                {user.Is_Active ? "Active" : "Inactive"}

              </span>
            </div>
          </div>
        ))}
      </Table>

      {isModalOpen && <AddUserModal onClose={() => setIsModalOpen(false)} onSubmit={handleAddUser} />}
    </div>
  )
}
