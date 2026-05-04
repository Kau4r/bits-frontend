import { useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect, useMemo } from 'react'
import { updateUser, fetchUserActivity } from '@/services/user'
import { type User, type User_Role, ROLES, type ActivityLog, LOG_TYPES } from '@/types/user'
import { formatRole } from '@/pages/sysad/UserPage'
import { useModal } from '@/context/ModalContext'
import { useAuth } from '@/context/AuthContext'
import { Clock, ArrowUpDown } from 'lucide-react'
import { FloatingSelect } from '@/ui/FloatingSelect'
import { SysAdEyebrow, SysAdPageShell } from '@/pages/sysad/components/SysAdPageShell'
import RoleChangeConfirmModal from '@/pages/sysad/components/RoleChangeConfirmModal'

export default function UserDetails() {
  const { state } = useLocation()
  const user = state?.user as User
  const navigate = useNavigate()
  const modal = useModal()
  const { user: currentUser } = useAuth()
  const isSelf = currentUser?.User_ID === user?.User_ID

  const [role, setRole] = useState<User_Role>(user?.User_Role)
  const [isActive, setIsActive] = useState<boolean>(user?.Is_Active)
  const [pendingNewRole, setPendingNewRole] = useState<User_Role | null>(null)
  const [loading, setLoading] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [activities, setActivities] = useState<ActivityLog[]>([])
  const [activitiesLoading, setActivitiesLoading] = useState(true)
  const [activitySearch, setActivitySearch] = useState('')
  const [dateFilter, setDateFilter] = useState<'all' | '24h' | '7d' | '30d'>('all')
  const [logTypeFilter, setLogTypeFilter] = useState<string>('ALL')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')

  // Warn user before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasChanges])

  // Fetch user activity logs
  useEffect(() => {
    if (!user?.User_ID) return

    const loadActivities = async () => {
      try {
        setActivitiesLoading(true)
        const data = await fetchUserActivity(user.User_ID)
        setActivities(data)
      } catch (err) {
        console.error('Failed to fetch activity logs:', err)
      } finally {
        setActivitiesLoading(false)
      }
    }

    loadActivities()
  }, [user?.User_ID])

  const filteredActivities = useMemo(() => {
    let filtered = activities

    // Filter by date
    if (dateFilter !== 'all') {
      const now = new Date()
      const cutoff = new Date()
      if (dateFilter === '24h') cutoff.setHours(now.getHours() - 24)
      else if (dateFilter === '7d') cutoff.setDate(now.getDate() - 7)
      else if (dateFilter === '30d') cutoff.setDate(now.getDate() - 30)

      filtered = filtered.filter(a => new Date(a.Timestamp) >= cutoff)
    }

    // Filter by log type
    if (logTypeFilter !== 'ALL') {
      filtered = filtered.filter(a => a.Log_Type === logTypeFilter)
    }

    // Filter by search
    if (activitySearch) {
      const search = activitySearch.toLowerCase()
      filtered = filtered.filter(a =>
        a.Action.toLowerCase().includes(search) ||
        a.Details?.toLowerCase().includes(search) ||
        a.Log_Type?.toLowerCase().includes(search)
      )
    }

    // Sort by timestamp
    filtered = [...filtered].sort((a, b) => {
      const dateA = new Date(a.Timestamp).getTime()
      const dateB = new Date(b.Timestamp).getTime()
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB
    })

    return filtered
  }, [activities, activitySearch, dateFilter, logTypeFilter, sortOrder])

  if (!user) return <div className="py-8 text-center">Loading...</div>

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })

    if (diffMins < 1) return `Just now`
    if (diffMins < 60) return `${diffMins}m ago · ${time}`
    if (diffHours < 24) return `${diffHours}h ago · ${time}`
    if (diffDays < 7) return `${diffDays}d ago · ${time}`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ` · ${time}`
  }

  const formatAction = (action: string) => {
    return action
      .replace(/_/g, ' ')
      .toLowerCase()
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  }

  const getLogTypeBadge = (logType?: string) => {
    switch (logType) {
      case LOG_TYPES.AUTH: return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case LOG_TYPES.BOOKING: return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case LOG_TYPES.TICKET: return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      case LOG_TYPES.BORROWING: return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case LOG_TYPES.INVENTORY: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case LOG_TYPES.ROOM: return 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200'
      case LOG_TYPES.FORM: return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200'
      case LOG_TYPES.SCHEDULE: return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'
      case LOG_TYPES.SYSTEM: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    }
  }

  // Role change goes through the failsafe modal: it shows in-flight items,
  // requires a written reason, and bumps Token_Valid_After server-side so the
  // user is forced to re-authenticate with the new permissions.
  const handleRoleChange = (newRole: User_Role) => {
    if (newRole === role) return
    setPendingNewRole(newRole)
  }

  const handleStatusChange = async () => {
    const newStatus = !isActive
    const confirmed = await modal.showConfirm(
      `Are you sure you want to ${newStatus ? 'activate' : 'deactivate'} this user?${!newStatus ? ' They will lose access to the system.' : ''}`,
      newStatus ? 'Activate User' : 'Deactivate User'
    )
    if (confirmed) {
      setIsActive(newStatus)
      setHasChanges(true)
    }
  }

  const handleBack = async () => {
    if (hasChanges) {
      const confirmed = await modal.showConfirm(
        'You have unsaved changes. Are you sure you want to leave?',
        'Unsaved Changes'
      )
      if (confirmed) {
        navigate(-1)
      }
    } else {
      navigate(-1)
    }
  }

  const handleSave = async () => {
    try {
      setLoading(true)

      const payload = {
        ...user,
        User_Role: role,
        Is_Active: isActive,
        Updated_At: new Date().toISOString(),
      }

      await updateUser(user.User_ID, payload)

      setHasChanges(false)
      await modal.showSuccess('User updated successfully!', 'Success')
    } catch (err) {
      console.error("Failed to update user:", err)
      await modal.showError('Failed to update user. Please try again.', 'Error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SysAdPageShell
      eyebrow={<SysAdEyebrow><Clock className="h-4 w-4" />Admin Account</SysAdEyebrow>}
      title="User Details"
      description="Review account access and recent system activity."
      action={(
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-1 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      )}
    >
      <div className="flex h-full min-h-0 flex-col gap-4">

      {/* User Card */}
      <div className="flex flex-shrink-0 items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        {/* Avatar */}
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-base font-bold text-white">
          {`${user.First_Name?.[0] ?? ""}${user.Last_Name?.[0] ?? ""}`.toUpperCase()}
        </div>

        {/* User Info */}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold text-gray-900 dark:text-white">
            {user.First_Name} {user.Last_Name}
          </h1>
          <p className="truncate text-sm text-gray-500 dark:text-gray-400">{user.Email}</p>
        </div>

        {/* Role Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Role</span>
          <FloatingSelect
            id="role-select"
            value={role}
            placeholder="Select role"
            options={Object.values(ROLES).map((r) => ({
              value: r,
              label: formatRole(r),
            }))}
            onChange={(value) => handleRoleChange(value as User_Role)}
            disabled={isSelf}
            className="min-w-[150px]"
            buttonClassName="py-1.5 text-sm"
          />
        </div>

        {/* Status Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Status</span>
          <label className={`relative inline-flex items-center ${isSelf ? 'cursor-not-allowed' : 'cursor-pointer'}`} title={isSelf ? 'You cannot change your own status' : isActive ? 'Active - Click to deactivate' : 'Inactive - Click to activate'}>
            <input
              type="checkbox"
              checked={isActive}
              onChange={handleStatusChange}
              disabled={isSelf}
              className="peer sr-only"
              aria-label={isActive ? 'User is active' : 'User is inactive'}
            />
            <div className={`h-6 w-11 rounded-full bg-gray-300 transition-colors peer-checked:bg-green-500 dark:bg-gray-600 dark:peer-checked:bg-green-500 ${isSelf ? 'opacity-50' : ''}`}></div>
            <div className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5 ${isSelf ? 'opacity-50' : ''}`}></div>
          </label>
          <span className={`text-xs font-medium ${isActive ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'} ${isSelf ? 'opacity-50' : ''}`}>
            {isActive ? 'Active' : 'Inactive'}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {hasChanges && (
            <button
              onClick={handleSave}
              disabled={loading}
              className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          )}
          {!isSelf && (
            <button
              onClick={async () => await modal.showAlert(`Password reset link would be sent to ${user.Email}`, 'Password Reset')}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Reset Password
            </button>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-3 flex flex-shrink-0 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
              Recent Activities
            </h2>
            {activities.length > 0 && (
              <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                {filteredActivities.length}{filteredActivities.length !== activities.length && ` / ${activities.length}`}
              </span>
            )}
          </div>
          {activities.length > 0 && (
            <div className="flex items-center gap-2">
              <FloatingSelect
                id="activity-log-type-filter"
                value={logTypeFilter}
                placeholder="All Types"
                options={[
                  { value: 'ALL', label: 'All Types' },
                  ...Object.values(LOG_TYPES)
                    .map((type) => ({
                      value: type,
                      label: formatAction(type),
                    }))
                    .sort((a, b) => a.label.localeCompare(b.label)),
                ]}
                onChange={setLogTypeFilter}
                className="min-w-[140px]"
                buttonClassName="py-1.5 text-sm"
              />
              <FloatingSelect
                id="activity-date-filter"
                value={dateFilter}
                placeholder="All Time"
                options={[
                  { value: 'all', label: 'All Time' },
                  { value: '24h', label: 'Last 24 Hours' },
                  { value: '30d', label: 'Last 30 Days' },
                  { value: '7d', label: 'Last 7 Days' },
                ]}
                onChange={(value) => setDateFilter(value as 'all' | '24h' | '7d' | '30d')}
                className="min-w-[150px]"
                buttonClassName="py-1.5 text-sm"
              />
              <button
                onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
                className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
                title={`Currently showing ${sortOrder} first`}
              >
                <ArrowUpDown className="h-4 w-4" />
                {sortOrder === 'newest' ? 'Newest' : 'Oldest'}
              </button>
              <input
                type="text"
                placeholder="Search activities..."
                value={activitySearch}
                onChange={(e) => setActivitySearch(e.target.value)}
                className="w-48 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none dark:border-[#334155] dark:bg-[#1e2939] dark:text-white dark:placeholder-gray-400"
              />
            </div>
          )}
        </div>

        {activitiesLoading ? (
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex animate-pulse items-center justify-between gap-3 rounded-md px-3 py-2">
                <div className="flex-1">
                  <div className="h-4 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="mt-1 h-3 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
                </div>
                <div className="h-3 w-16 rounded bg-gray-200 dark:bg-gray-700" />
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <Clock className="h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              No activity recorded yet
            </p>
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No activities found
              {logTypeFilter !== 'ALL' && ` of type "${formatAction(logTypeFilter)}"`}
              {activitySearch && ` matching "${activitySearch}"`}
              {dateFilter !== 'all' && ` in ${dateFilter === '24h' ? 'the last 24 hours' : dateFilter === '7d' ? 'the last 7 days' : 'the last 30 days'}`}
            </p>
          </div>
        ) : (
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto scrollbar-thin">
            {filteredActivities.map((activity) => (
              <div
                key={activity.Log_ID}
                className="flex items-center justify-between gap-3 rounded-md px-3 py-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatAction(activity.Action)}
                    </p>
                    {activity.Log_Type && (
                      <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${getLogTypeBadge(activity.Log_Type)}`}>
                        {formatAction(activity.Log_Type)}
                      </span>
                    )}
                  </div>
                  {activity.Details && (
                    <p className="mt-0.5 truncate text-xs text-gray-600 dark:text-gray-400">
                      {activity.Details}
                    </p>
                  )}
                </div>
                <p className="flex-shrink-0 text-xs text-gray-500 dark:text-gray-500">
                  {formatTimestamp(activity.Timestamp)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>

      {pendingNewRole && (
        <RoleChangeConfirmModal
          open={pendingNewRole !== null}
          userId={user.User_ID}
          currentRole={role}
          newRole={pendingNewRole}
          onClose={() => setPendingNewRole(null)}
          onSuccess={(applied) => {
            setRole(applied)
            setPendingNewRole(null)
          }}
        />
      )}
    </SysAdPageShell>
  )
}
