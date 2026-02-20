import { useEffect, useState, useCallback } from 'react';
import Card from '@/components/dashboard/Card';
import BookingCard from '@/components/dashboard/BookingCard';
import FormsCard from '@/components/dashboard/FormsCard';
import NotificationsCard from '@/components/dashboard/NotificationsCard';
import ReportsCard from '@/components/dashboard/ReportsCard';
import { getDashboardMetrics, type DashboardMetrics } from '@/services/dashboard';
import { TicketIcon, WrenchIcon, CubeIcon } from '@heroicons/react/24/outline'; // Importing icons
import { useNotifications } from '@/context/NotificationContext';

export default function LabheadDashboard() {
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
      // Refresh metrics if the notification is relevant to dashboard stats
      const isRelevant = /ticket|form|booking|inventory|item|room/i.test(latest.title + latest.message);

      if (isRelevant) {
        console.log('[Dashboard] Real-time update detected, refreshing metrics...');
        fetchMetrics();
      }
    }
  }, [notifications, fetchMetrics]);

  return (
    <div className="h-full w-full bg-white p-6 sm:px-8 lg:px-10 dark:bg-gray-900 flex flex-col">
      <div className="mb-6 flex-shrink-0">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Good Day, Labhead
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Overview of lab operations, tickets, and inventory status</p>
        {/* New Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700 flex items-center gap-4">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-lg">
              <TicketIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Pending Tickets</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics?.counts.pendingTickets || 0}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700 flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg">
              <CubeIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Low Inventory</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics?.counts.brokenItems || 0}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700 flex items-center gap-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-lg">
              <WrenchIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Active Bookings</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics?.counts.activeBookings || 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
        {/* Left Side (2 columns wide) */}
        <div className="lg:col-span-2 flex flex-col gap-4 h-full min-h-0">
          {/* Top Row: Forms + Reports */}
          <div className="grid grid-cols-2 gap-4">
            <Card title="Forms">
              <FormsCard
                pendingCount={metrics?.counts.pendingForms}
                approvedCount={metrics?.counts.approvedForms}
                inReviewCount={metrics?.counts.inReviewForms}
              />
            </Card>
            <Card title="Reports">
              <ReportsCard />
            </Card>
          </div>

          {/* Bottom Row: Bookings - takes remaining space */}
          <div className="flex-1 min-h-0">
            <Card title="Bookings" className="h-full">
              <BookingCard />
            </Card>
          </div>
        </div>

        {/* Right Side: Notifications full height */}
        <div className="h-full min-h-0">
          <Card className="h-full">
            <NotificationsCard />
          </Card>
        </div>
      </div>
    </div>
  );
}
