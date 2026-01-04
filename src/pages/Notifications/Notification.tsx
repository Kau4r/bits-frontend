import { useState } from 'react';
import NotificationCard from '@/components/notifications/NotificationCard';
import TableSearchInput from '@/components/Search';
import { Bell } from 'lucide-react';
import type { Notification, NotificationView, NotificationType } from '@/types/notification';

const mockNotifications: Notification[] = [
  // System Notifications
  {
    id: 1,
    title: 'System Maintenance Schedule',
    message: 'System maintenance scheduled for tomorrow 10:00 PM - 11:00 PM',
    time: '10 min ago',
    isRead: false,
    isArchived: false,
    type: 'System',
    role: 'Lab Tech',
  },
  {
    id: 2,
    title: 'System Update Available',
    message: 'New system update version 1.2.3 is now available',
    time: '1 hour ago',
    isRead: true,
    isArchived: false,
    type: 'System',
    role: 'Lab Tech',
  },
  {
    id: 3,
    title: 'System Alert',
    message: 'Storage space running low, please clean up old files',
    time: '30 minutes ago',
    isRead: false,
    isArchived: false,
    type: 'System',
    role: 'Lab Tech',
  },
  // Issue Report Notifications
  {
    id: 4,
    title: 'New Issue Report',
    message: 'Lab 102 printer malfunction reported by John Doe',
    time: '1 hour ago',
    isRead: false,
    isArchived: false,
    type: 'Issue Report',
    role: 'Lab Tech',
  },
  {
    id: 5,
    title: 'Issue Report Status',
    message: 'Ticket #1234 has been assigned to Sarah Engineer',
    time: '45 minutes ago',
    isRead: true,
    isArchived: false,
    type: 'Issue Report',
    role: 'Lab Tech',
  },
  {
    id: 6,
    title: 'Issue Report Update',
    message: 'Ticket #1230 has been marked as resolved',
    time: '1 hour ago',
    isRead: false,
    isArchived: false,
    type: 'Issue Report',
    role: 'Lab Tech',
  },
  // Asset Request Notifications
  {
    id: 7,
    title: 'Asset Request Approved',
    message: 'Your request for new monitor has been approved',
    time: '5 hours ago',
    isRead: false,
    isArchived: false,
    type: 'Asset Request',
    role: 'Lab Tech',
  },
  {
    id: 8,
    title: 'Asset Request Update',
    message: 'Your asset request is being processed',
    time: '1 hour ago',
    isRead: false,
    isArchived: false,
    type: 'Asset Request',
    role: 'Lab Tech',
  },
  {
    id: 9,
    title: 'New Asset Request',
    message: 'Inventory request #123 submitted for review',
    time: '30 minutes ago',
    isRead: false,
    isArchived: false,
    type: 'Asset Request',
    role: 'Lab Tech',
  },
  // Form Update Notifications
  {
    id: 10,
    title: 'Form Update Available',
    message: 'New version of Inventory Form is now available',
    time: '2 hours ago',
    isRead: false,
    isArchived: false,
    type: 'Form Update',
    role: 'Lab Tech',
  },
  {
    id: 11,
    title: 'Form Update Required',
    message: 'Please update your forms to the latest version',
    time: '5 hours ago',
    isRead: true,
    isArchived: false,
    type: 'Form Update',
    role: 'Lab Tech',
  },
  {
    id: 12,
    title: 'Form Update Status',
    message: 'Form update #1234 has been approved',
    time: '45 minutes ago',
    isRead: false,
    isArchived: false,
    type: 'Form Update',
    role: 'Lab Tech',
  },
];

const notificationTypes: NotificationType[] = ['System', 'Issue Report', 'Asset Request', 'Form Update'];

export default function Notification() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<NotificationType | 'All'>('All');
  const [activeView, setActiveView] = useState<NotificationView>('all');
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);

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

  const handleMarkAsRead = (id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const handleArchive = (id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isArchived: true } : n))
    );
  };

  const handleRestore = (id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isArchived: false } : n))
    );
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
              All ({getViewCount('all')})
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