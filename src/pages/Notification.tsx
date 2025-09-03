import  { useState } from 'react';
import NotificationCard from '@/components/notifications/NotificationCard';
import TableSearchInput from '@/components/Search';
import { Bell } from 'lucide-react';

const mockNotifications = [
  // System Notifications
  {
    id: 1,
    title: 'System Maintenance Schedule',
    message: 'System maintenance scheduled for tomorrow 10:00 PM - 11:00 PM',
    time: '10 min ago',
    read: false,
    type: 'System' as const,
    role: 'Lab Tech' as const
  },
  {
    id: 2,
    title: 'System Update Available',
    message: 'New system update version 1.2.3 is now available',
    time: '1 hour ago',
    read: true,
    type: 'System' as const,
    role: 'Lab Tech' as const
  },
  {
    id: 3,
    title: 'System Alert',
    message: 'Storage space running low, please clean up old files',
    time: '30 minutes ago',
    read: false,
    type: 'System' as const,
    role: 'Lab Tech' as const
  },

  // Issue Report Notifications
  {
    id: 4,
    title: 'New Issue Report',
    message: 'Lab 102 printer malfunction reported by John Doe',
    time: '1 hour ago',
    read: true,
    type: 'Issue Report' as const,
    role: 'Lab Tech' as const
  },
  {
    id: 5,
    title: 'Issue Report Status',
    message: 'Ticket #1234 has been assigned to Sarah Engineer',
    time: '45 minutes ago',
    read: true,
    type: 'Issue Report' as const,
    role: 'Lab Tech' as const
  },
  {
    id: 6,
    title: 'Issue Report Update',
    message: 'Ticket #1230 has been marked as resolved',
    time: '1 hour ago',
    read: false,
    type: 'Issue Report' as const,
    role: 'Lab Tech' as const
  },

  // Asset Request Notifications
  {
    id: 7,
    title: 'Asset Request Approved',
    message: 'Your request for new monitor has been approved',
    time: '5 hours ago',
    read: false,
    type: 'Asset Request' as const,
    role: 'Lab Tech' as const
  },
  {
    id: 8,
    title: 'Asset Request Update',
    message: 'Your asset request is being processed',
    time: '1 hour ago',
    read: false,
    type: 'Asset Request' as const,
    role: 'Lab Tech' as const
  },
  {
    id: 9,
    title: 'New Asset Request',
    message: 'Inventory request #123 submitted for review',
    time: '30 minutes ago',
    read: false,
    type: 'Asset Request' as const,
    role: 'Lab Tech' as const
  },

  // Form Update Notifications
  {
    id: 10,
    title: 'Form Update Available',
    message: 'New version of Inventory Form is now available',
    time: '2 hours ago',
    read: false,
    type: 'Form Update' as const,
    role: 'Lab Tech' as const
  },
  {
    id: 11,
    title: 'Form Update Required',
    message: 'Please update your forms to the latest version',
    time: '5 hours ago',
    read: true,
    type: 'Form Update' as const,
    role: 'Lab Tech' as const
  },
  {
    id: 12,
    title: 'Form Update Status',
    message: 'Form update #1234 has been approved',
    time: '45 minutes ago',
    read: false,
    type: 'Form Update' as const,
    role: 'Lab Tech' as const
  }
];

export default function Notification() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState('All');
  const [notifications, setNotifications] = useState<typeof mockNotifications>(mockNotifications);

  // Filter notifications based on user's role
  const roleFilteredNotifications = notifications.filter(notification => 
    notification.role === 'Lab Tech'
  );

  // Apply search and tab filters
  const filteredNotifications = roleFilteredNotifications.filter(notification => {
    const matchesSearch = Object.values(notification).some(
      value => value.toString().toLowerCase().includes(searchTerm.toLowerCase())
    );
    const matchesTab = selectedTab === 'All' || notification.type === selectedTab;
    return matchesSearch && matchesTab;
  });

  const tabs = ['All', 'System', 'Issue Report', 'Asset Request', 'Form Update'];

  const handleMarkAsRead = (id: number) => {
    const updatedNotifications = notifications.map(notification => 
      notification.id === id ? { ...notification, read: true } : notification
    );
    setNotifications(updatedNotifications);
  };

  return (
    <div className="p-4">
      <div className="sticky top-0 z-10 pb-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Notifications</h1>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <TableSearchInput
            searchTerm={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search notifications..."
            showLabel={false}
          />
          <div className="w-full sm:w-48">
            <select
              id="status"
              value={selectedTab}
              onChange={(e) => setSelectedTab(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              {tabs.map(tab => (
                <option key={tab} value={tab}>{tab}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onMarkAsRead={handleMarkAsRead}
            />
          ))
        ) : (
          <div className="text-center py-10">
            <Bell className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No notifications</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {searchTerm ? 'No notifications match your search.' : 'You have no new notifications.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}