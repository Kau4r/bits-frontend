import { useEffect, useState } from 'react';
import Card from '@/components/dashboard/Card';
import BookingCard from '@/components/dashboard/BookingCard';
import NotificationsCard from '@/components/dashboard/NotificationsCard';
import { getDashboardMetrics, type DashboardMetrics } from '@/services/dashboard';
import { ClipboardDocumentCheckIcon, WrenchScrewdriverIcon, DeviceTabletIcon } from '@heroicons/react/24/outline';

export default function LabtechDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const data = await getDashboardMetrics();
        setMetrics(data);
      } catch (error) {
        console.error("Failed to load dashboard metrics");
      }
    };
    fetchMetrics();
  }, []);

  return (
    <div className="h-screen w-full p-4 flex flex-col pt-16 lg:pt-4">
      <div className="mb-4 flex-shrink-0">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
          Lab Technician Dashboard
        </h1>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700 flex items-center gap-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-lg">
              <ClipboardDocumentCheckIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">My Assigned Tickets</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{metrics?.counts.myAssignedTickets || 0}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700 flex items-center gap-4">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-lg">
              <WrenchScrewdriverIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Active Maintenance</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{metrics?.counts.activeMaintenance || 0}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700 flex items-center gap-4">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-lg">
              <DeviceTabletIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Borrowed Items</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{metrics?.counts.activeBorrowings || 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
        {/* Left Side (2 columns wide) */}
        <div className="lg:col-span-2 flex flex-col gap-4 h-full min-h-0">
          <div className="flex-1 min-h-0">
            <Card title="Room Schedule" className="h-full">
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