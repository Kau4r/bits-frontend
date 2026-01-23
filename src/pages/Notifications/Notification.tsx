import { useState, useMemo } from 'react';
import { useNotifications } from '@/context/NotificationContext';
import NotificationCard from '@/components/notifications/NotificationCard';
import TableSearchInput from '@/components/Search';
import { Bell } from 'lucide-react';
import type { Notification, NotificationView, NotificationType } from '@/types/notification';


const notificationTypes: NotificationType[] = ['System', 'Issue Report', 'Asset Request', 'Form Update'];

export default function NotificationPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<NotificationType | 'All'>('All');
  const [activeView, setActiveView] = useState<NotificationView>('all');
  const { notifications: apiNotifications, loading, markAsRead } = useNotifications();

  // Map context notifications to view format
  const notifications: Notification[] = useMemo(() => {
    return apiNotifications.map((n) => {
      let type: NotificationType = 'System';
      const titleLower = n.title.toLowerCase();

      if (titleLower.includes('ticket') || titleLower.includes('report') || titleLower.includes('issue')) {
        type = 'Issue Report';
      } else if (titleLower.includes('form')) {
        type = 'Form Update';
      } else if (titleLower.includes('asset') || titleLower.includes('inventory') || titleLower.includes('borrow')) {
        type = 'Asset Request';
      }

      return {
        id: n.id,
        title: n.title,
        message: n.message,
        time: n.time,
        isRead: n.read,
        isArchived: false, // API doesn't support archive yet
        type: type,
        role: 'Lab Tech',
      };
    });
  }, [apiNotifications]);

  // Filter notifications based on role
  const roleFilteredNotifications = notifications.filter(
    (notification) => notification.role === 'Lab Tech'
  );

  // Filter notifications based on active view, search, and type
  const filteredNotifications = roleFilteredNotifications.filter((notification) => {
    // View filter
    let matchesView = false;
    switch (activeView) {
      case 'all':
        matchesView = !notification.isArchived && !notification.isRead;
        break;
      case 'read':
        matchesView = !notification.isArchived && notification.isRead;
        break;
      case 'archived':
        matchesView = notification.isArchived;
        break;
    }

    // Search filter
    const matchesSearch = Object.values(notification).some((value) =>
      value.toString().toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Type filter
    const matchesType = selectedType === 'All' || notification.type === selectedType;

    return matchesView && matchesSearch && matchesType;
  });

  const handleMarkAsRead = async (id: number) => {
    await markAsRead(id);
  };

  const handleArchive = (id: number) => {
    // Local state modification not possible directly on mapped data without extra state
    // For now, simple logging as archive isn't in API yet
    console.log('Archive not fully supported in global context yet', id);
  };

  const handleRestore = (id: number) => {
    console.log('Restore not fully supported in global context yet', id);
  };

  const getViewCount = (view: NotificationView) => {
    return roleFilteredNotifications.filter((n) => {
      switch (view) {
        case 'all':
          return !n.isArchived && !n.isRead;
        case 'read':
          return !n.isArchived && n.isRead;
        case 'archived':
          return n.isArchived;
      }
    }).length;
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading notifications...</div>;
  }

  return (
    <div className="p-4">
      <div className="sticky top-0 z-10 pb-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold dark:text-white">Notifications</h1>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <TableSearchInput
            searchTerm={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search..."
            showLabel={false}
          />

          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as NotificationType | 'All')}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="All">All Types</option>
              {notificationTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* View Tabs */}
          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={() => setActiveView('all')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeView === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
                }`}
            >
              Inbox ({getViewCount('all')})
            </button>
            <button
              onClick={() => setActiveView('read')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeView === 'read'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
                }`}
            >
              Read ({getViewCount('read')})
            </button>
            <button
              onClick={() => setActiveView('archived')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeView === 'archived'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
                }`}
            >
              Archived ({getViewCount('archived')})
            </button>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="mt-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onMarkAsRead={handleMarkAsRead}
              onArchive={handleArchive}
              onRestore={handleRestore}
            />
          ))
        ) : (
          <div className="text-center py-10">
            <Bell className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              No notifications
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {activeView === 'all'
                ? 'You have no new notifications.'
                : activeView === 'read'
                  ? 'No read notifications.'
                  : 'No archived notifications.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}