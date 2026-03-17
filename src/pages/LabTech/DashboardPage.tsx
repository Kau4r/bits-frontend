import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Card from '@/components/Card';
import BookingCard from '@/components/BookingCard';
import NotificationsCard from '@/components/NotificationsCard';
import { getDashboardMetrics, type DashboardMetrics } from '@/services/dashboard';
import { ClipboardCheck, Wrench, Tablet, FileText } from 'lucide-react';
import { useNotifications } from '@/context/NotificationContext';

export default function LabtechDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const navigate = useNavigate();
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
    <div className="h-full w-full bg-white p-6 sm:px-8 lg:px-10 dark:bg-gray-900 flex flex-col overflow-y-auto lg:overflow-hidden">
      <div className="mb-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Lab Technician Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Overview of your assigned tasks, maintenance activities, and system alerts</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <div
            onClick={() => navigate('/tickets')}
            className="cursor-pointer bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center gap-4 transition-all duration-300 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700"
          >
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
              <ClipboardCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">My Assigned Tickets</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics?.counts.myAssignedTickets || 0}</p>
            </div>
          </div>

          <div
            onClick={() => navigate('/labtech/room')}
            className="cursor-pointer bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center gap-4 transition-all duration-300 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700"
          >
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Maintenance</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics?.counts.activeMaintenance || 0}</p>
            </div>
          </div>

          <div
            onClick={() => navigate('/labtech/borrowing')}
            className="cursor-pointer bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center gap-4 transition-all duration-300 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700"
          >
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Tablet className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Borrowed Items</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics?.counts.activeBorrowings || 0}</p>
            </div>
          </div>

          <div
            onClick={() => navigate('/forms')}
            className="cursor-pointer bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center gap-4 transition-all duration-300 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700"
          >
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Pending Forms</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics?.counts.pendingForms || 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        {/* Left Side (2 columns wide) */}
        <div className="lg:col-span-2 flex flex-col gap-6 h-full min-h-0">
          <div className="flex-1 min-h-0">
            <Card
              title={
                <div className="flex justify-between items-center w-full">
                  <span>Room Schedule</span>
                  <Link
                    to="/labtech/room"
                    className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    View All
                  </Link>
                </div>
              }
              className="h-full shadow-sm rounded-xl border border-gray-200 dark:border-gray-700"
            >
              <BookingCard />
            </Card>
          </div>
        </div>

        {/* Right Side: Notifications full height */}
        <div className="h-full min-h-0">
          <Card className="h-full shadow-sm rounded-xl border border-gray-200 dark:border-gray-700">
            <NotificationsCard />
          </Card>
        </div>
      </div>
    </div>
  );
}