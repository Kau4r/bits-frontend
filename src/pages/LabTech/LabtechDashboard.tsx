import { useEffect, useState, useCallback } from 'react';
import Card from '@/components/dashboard/Card';
import BookingCard from '@/components/dashboard/BookingCard';
import NotificationsCard from '@/components/dashboard/NotificationsCard';
import { getDashboardMetrics, type DashboardMetrics } from '@/services/dashboard';
import { ClipboardDocumentCheckIcon, WrenchScrewdriverIcon, DeviceTabletIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { useNotifications } from '@/context/NotificationContext';

export default function LabtechDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const { notifications } = useNotifications();

  const fetchMetrics = useCallback(async () => {
    try {
      const data = await getDashboardMetrics();
      setMetrics(data);
    } catch (error) {
      console.error("Failed to load dashboard metrics");
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Real-time updates
  useEffect(() => {
    if (notifications.length > 0) {
      const latest = notifications[0];
      // Refresh metrics if the notification is relevant
      const isRelevant = /ticket|form|booking|inventory|item|room/i.test(latest.title + latest.message);

      if (isRelevant) {
        console.log('[Dashboard] Real-time update detected, refreshing metrics...');
        fetchMetrics();
      }
    }
  }, [notifications, fetchMetrics]);

  return (
    <div className="h-full w-full bg-white p-6 sm:px-8 lg:px-10 dark:bg-gray-900 overflow-y-auto">
      <div className="mb-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Lab Technician Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Overview of your assigned tasks, maintenance activities, and system alerts</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center gap-4 transition-all hover:shadow-md">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
              <ClipboardDocumentCheckIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">My Assigned Tickets</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics?.counts.myAssignedTickets || 0}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center gap-4 transition-all hover:shadow-md">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg">
              <WrenchScrewdriverIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Maintenance</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics?.counts.activeMaintenance || 0}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center gap-4 transition-all hover:shadow-md">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <DeviceTabletIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Borrowed Items</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics?.counts.activeBorrowings || 0}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center gap-4 transition-all hover:shadow-md">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
              <DocumentTextIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Pending Forms</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics?.counts.pendingForms || 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0 mb-6">
        {/* Left Side (2 columns wide) */}
        <div className="lg:col-span-2 flex flex-col gap-6 h-full min-h-0">
          <div className="flex-1 min-h-0">
            <Card title="Room Schedule" className="h-full shadow-sm rounded-xl">
              <BookingCard />
            </Card>
          </div>
        </div>

        {/* Right Side: Notifications full height */}
        <div className="h-full min-h-0">
          <Card className="h-full shadow-sm rounded-xl">
            <NotificationsCard />
          </Card>
        </div>
      </div>
    </div>
  );
}