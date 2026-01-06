import { useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { updateUser } from '@/services/user'
import { type User, type User_Role, ROLES } from '@/types/user'
import { formatRole } from './UserPage'

import ConfirmModal from '@/components/SysAd/ConfirmModal'

export default function UserDetails() {
  const { state } = useLocation()
  const user = state?.user as User
  const navigate = useNavigate()

  const [role, setRole] = useState<User_Role>(user.User_Role)
  const [isActive, setIsActive] = useState<boolean>(user.Is_Active)
  const [loading, setLoading] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [modalConfig, setModalConfig] = useState<{
    title: string
    message: string
    onConfirm: () => void
  }>({ title: '', message: '', onConfirm: () => { } })

  if (!user) return <div className="py-8 text-center">Loading...</div>

  const handleRoleChange = (newRole: User_Role) => {
    setModalConfig({
      title: 'Confirm Role Change',
      message: `Are you sure you want to change this user's role to ${formatRole(newRole)}?`,
      onConfirm: () => {
        setRole(newRole)
        setHasChanges(true)
      },
    })
    setModalOpen(true)
  }

  const handleStatusChange = () => {
    const newStatus = !isActive
    setModalConfig({
      title: newStatus ? 'Activate User' : 'Deactivate User',
      message: `Are you sure you want to ${newStatus ? 'activate' : 'deactivate'} this user?`,
      onConfirm: () => {
        setIsActive(newStatus)
        setHasChanges(true)
      },
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    try {
      setLoading(true);

      const payload = {
        ...user,
        User_Role: role,
        Is_Active: isActive,
        Updated_At: new Date().toISOString(),
      };

      console.log("Sending update payload:", payload);

      const updated = await updateUser(user.User_ID, payload);

      console.log("✅ Updated user:", updated);
      setHasChanges(false);
      alert("User updated successfully!");
    } catch (err) {
      console.error("❌ Failed to update user:", err);
      alert("Failed to update user. See console for details.");
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="h-full w-full bg-white p-4 sm:px-8 lg:px-10 dark:bg-gray-900">
      <ConfirmModal
        isOpen={modalOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        onConfirm={modalConfig.onConfirm}
        onCancel={() => setModalOpen(false)}
      />
      <button
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
      >
        {/* Back Icon */}
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

      {/* User Card */}
      <div className="mb-8 flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:flex-row sm:items-center">
        {/* Avatar */}
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-lg font-bold text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
          {`${user.First_Name?.[0] ?? ""}${user.Last_Name?.[0] ?? ""}`.toUpperCase()}
        </div>

        {/* Main Flex Layout */}
        <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Left: User Info */}
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              {user.First_Name} {user.Last_Name}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-300">{user.Email}</p>
          </div>

          {/* Center: Role + Status */}
          <div className="flex items-center gap-6">
            {/* Role */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-700 dark:text-gray-300 w-16 text-right">Role:</span>
              <select
                value={role}
                onChange={(e) => {
                  handleRoleChange(e.target.value as User_Role)
                }}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                {Object.values(ROLES).map((r) => (
                  <option key={r} value={r}>{formatRole(r)}</option>
                ))}
              </select>
            </div>

            {/* Status Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-700 dark:text-gray-300 w-16 text-right">Active:</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={() => {
                    handleStatusChange()
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-green-600 dark:peer-checked:bg-green-500 transition-all"></div>
                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-md peer-checked:translate-x-5 transition-transform"></div>
              </label>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => alert(`Password reset link would be sent to ${user.Email}`)}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-gray-800"
            >
              Send Password Reset
            </button>

            {hasChanges && (
              <button
                onClick={handleSave}
                disabled={loading}
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 dark:focus:ring-offset-gray-800 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-600 dark:bg-gray-800"> <h2 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white"> Recent Activities </h2> <p className="text-sm text-gray-500 italic dark:text-gray-300"> Activity log will appear here once available. </p> </div>
    </div>
  )
}
