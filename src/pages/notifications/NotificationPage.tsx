import { useState, useMemo } from 'react';
import { useNotifications } from '@/context/NotificationContext';
import NotificationCard from '@/components/NotificationCard';
import Search from '@/components/Search';
import { Filter, Bell, Inbox, Archive, CheckCircle } from 'lucide-react';
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
      value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Type filter
    const matchesType = selectedType === 'All' || notification.type === selectedType;

    return matchesView && matchesSearch && matchesType;
  });

  const handleMarkAsRead = async (id: number) => {
    await markAsRead(id);
  };

  const handleArchive = (id: number) => {
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

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedType('All');
  };

  const hasActiveFilters = searchTerm || selectedType !== 'All';

  if (loading) {
    return (
      <div className="h-full w-full bg-white p-6 sm:px-8 lg:px-10 dark:bg-gray-900">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="h-8 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
            <div className="mt-1 h-4 w-64 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
          </div>
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col bg-white p-6 sm:px-8 lg:px-10 dark:bg-gray-900">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Stay updated with system activities, asset requests, and issue reports</p>
        </div>

        {/* View Tabs Toggle */}
        <div className="flex rounded-lg border border-gray-300 bg-white shadow-sm dark:border-gray-600 dark:bg-gray-800">
          <button
            onClick={() => setActiveView('all')}
            className={`inline-flex items-center gap-2 rounded-l-lg px-4 py-2 text-sm font-medium transition-colors ${activeView === 'all'
              ? 'bg-indigo-600 text-white'
              : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
          >
            <Inbox className="h-4 w-4" />
            Inbox ({getViewCount('all')})
          </button>
          <button
            onClick={() => setActiveView('read')}
            className={`inline-flex items-center gap-2 border-x border-gray-300 px-4 py-2 text-sm font-medium transition-colors dark:border-gray-600 ${activeView === 'read'
              ? 'bg-indigo-600 text-white'
              : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
          >
            <CheckCircle className="h-4 w-4" />
            Read ({getViewCount('read')})
          </button>
          <button
            onClick={() => setActiveView('archived')}
            className={`inline-flex items-center gap-2 rounded-r-lg px-4 py-2 text-sm font-medium transition-colors ${activeView === 'archived'
              ? 'bg-indigo-600 text-white'
              : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
          >
            <Archive className="h-4 w-4" />
            Archived ({getViewCount('archived')})
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="min-w-[280px] flex-1">
          <Search
            searchTerm={searchTerm}
            onChange={setSearchTerm}
            showLabel={false}
            placeholder="Search notifications..."
          />
        </div>

        {/* Type Filter */}
        <div className="relative">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as NotificationType | 'All')}
            className="appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-4 pr-10 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
          >
            <option value="All">All Types</option>
            {notificationTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <Filter className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        </div>
      </div>

      {/* Notifications List */}
      <div className="flex-1 min-h-0 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
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
          <div className="flex flex-col items-center justify-center py-20">
            <Bell className="h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              {hasActiveFilters ? "No notifications match your filters" : `No ${activeView === 'all' ? 'new' : activeView} notifications`}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {hasActiveFilters
                ? "Try adjusting your search or filter criteria"
                : activeView === 'all'
                  ? "You're all caught up! Check back later for updates."
                  : activeView === 'read'
                    ? "Read notifications will appear here."
                    : "Archived notifications are stored for later reference."}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-4 inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
