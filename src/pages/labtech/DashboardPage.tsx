import { useEffect, useState, useCallback } from 'react';
import BookingCard from '@/components/BookingCard';
import NotificationsCard from '@/components/NotificationsCard';
import { getDashboardMetrics, type DashboardMetrics } from '@/services/dashboard';
import { ClipboardCheck, Wrench, PackageCheck } from 'lucide-react';
import { useNotifications } from '@/context/NotificationContext';

const SummaryTile = ({
  label,
  value,
  tone = 'gray',
}: {
  label: string;
  value?: number;
  tone?: 'gray' | 'green' | 'amber' | 'blue';
}) => {
  const toneClass = {
    gray: 'border-gray-200 bg-gray-50 text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white',
    green: 'border-green-200 bg-green-50 text-green-900 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-100',
    amber: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100',
    blue: 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100',
  }[tone];

  return (
    <div className={`rounded-lg border p-4 ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 text-2xl font-black">{value || 0}</p>
    </div>
  );
};

export default function LabtechDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const { notifications } = useNotifications();

  const fetchMetrics = useCallback(async () => {
    try {
      const data = await getDashboardMetrics();
      setMetrics(data);
    } catch (error) {
      console.error("Failed to load dashboard metrics");
    } finally {
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
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Overview of tickets, room reports, inventory, and scheduling updates</p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-purple-600 dark:text-purple-300" />
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">Ticket Summary</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SummaryTile label="Assigned To Me" value={metrics?.summaries?.tickets?.assignedToMe} tone="blue" />
            <SummaryTile label="Completed" value={metrics?.summaries?.tickets?.completedByMe} tone="green" />
            <SummaryTile label="Pending" value={metrics?.summaries?.tickets?.pending} tone="amber" />
            <SummaryTile label="Unassigned" value={metrics?.summaries?.tickets?.unassigned} />
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex items-center gap-2">
            <Wrench className="h-5 w-5 text-orange-600 dark:text-orange-300" />
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">Room And Report Summary</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SummaryTile label="Rooms In Maintenance" value={metrics?.summaries?.rooms?.maintenance} tone="amber" />
            <SummaryTile label="Hardware Tasks" value={metrics?.summaries?.rooms?.hardwareTasks} />
            <SummaryTile label="Draft Reports" value={metrics?.summaries?.reports?.drafts} tone="blue" />
            <SummaryTile label="Submitted Reports" value={metrics?.summaries?.reports?.submitted} tone="green" />
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex items-center gap-2">
            <PackageCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">Inventory Summary</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SummaryTile label="Total Items" value={metrics?.summaries?.inventory?.total} />
            <SummaryTile label="Available" value={metrics?.summaries?.inventory?.available} tone="green" />
            <SummaryTile label="Defective" value={metrics?.summaries?.inventory?.defective} tone="amber" />
            <SummaryTile label="Disposed" value={metrics?.summaries?.inventory?.disposed} />
          </div>
        </section>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-6 min-h-0 lg:grid-cols-[1fr_360px]">
        <div className="min-h-0 overflow-hidden">
          <BookingCard />
        </div>

        <div className="min-h-0">
          <NotificationsCard />
        </div>
      </div>
    </div>
  );
}
