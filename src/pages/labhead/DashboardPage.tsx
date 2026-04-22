import { useEffect, useState, useCallback, type ReactNode } from 'react';
import BookingCard from '@/components/BookingCard';
import NotificationsCard from '@/components/NotificationsCard';
import { getDashboardMetrics, type DashboardMetrics } from '@/services/dashboard';
import { BarChart3, ClipboardCheck, FileText } from 'lucide-react';
import { useNotifications } from '@/context/NotificationContext';

const SummaryPanel = ({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) => (
  <section className="flex h-full min-h-0 flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
    <div className="mb-3 flex items-center gap-2">
      {icon}
      <h2 className="text-sm font-bold text-gray-900 dark:text-white">{title}</h2>
    </div>
    <div className="grid flex-1 grid-cols-1 gap-3">
      {children}
    </div>
  </section>
);

const SummaryTile = ({
  label,
  value,
  tone = 'gray',
}: {
  label: string;
  value?: number;
  tone?: 'gray' | 'green' | 'amber' | 'blue' | 'red';
}) => {
  const toneClass = {
    gray: 'border-gray-200 bg-gray-50 text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white',
    green: 'border-green-200 bg-green-50 text-green-900 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-100',
    amber: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100',
    blue: 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100',
    red: 'border-red-200 bg-red-50 text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100',
  }[tone];

  return (
    <div className={`flex min-h-[72px] flex-col justify-between rounded-lg border p-3 ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 text-2xl font-black">{value || 0}</p>
    </div>
  );
};

export default function LabheadDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const { notifications } = useNotifications();

  const fetchMetrics = useCallback(async () => {
    try {
      const data = await getDashboardMetrics();
      setMetrics(data);
    } catch (error) {
      console.error('Failed to load dashboard metrics');
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    if (notifications.length > 0) {
      const latest = notifications[0];
      const isRelevant = /ticket|form|booking|schedule|inventory|item|room|report/i.test(latest.title + latest.message);

      if (isRelevant) {
        console.log('[Dashboard] Real-time update detected, refreshing metrics...');
        fetchMetrics();
      }
    }
  }, [notifications, fetchMetrics]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-white p-6 sm:px-8 lg:px-10 dark:bg-gray-900">
      <div className="mb-4 shrink-0">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Good Day, Labhead
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Review tickets, forms, reports, schedules, and alerts.
        </p>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <SummaryPanel
              title="Ticket Breakdown"
              icon={<ClipboardCheck className="h-5 w-5 text-purple-600 dark:text-purple-300" />}
            >
              <SummaryTile label="Completed" value={metrics?.summaries?.tickets?.completed ?? metrics?.counts.completedTickets} tone="green" />
              <SummaryTile label="Pending" value={metrics?.summaries?.tickets?.pending ?? metrics?.counts.pendingTickets} tone="amber" />
              <SummaryTile label="Unassigned" value={metrics?.summaries?.tickets?.unassigned ?? metrics?.counts.unassignedTickets} tone="red" />
            </SummaryPanel>

            <SummaryPanel
              title="Forms Breakdown"
              icon={<FileText className="h-5 w-5 text-blue-600 dark:text-blue-300" />}
            >
              <SummaryTile label="Pending" value={metrics?.summaries?.forms?.pending ?? metrics?.counts.pendingForms} tone="amber" />
              <SummaryTile label="In Review" value={metrics?.summaries?.forms?.inReview ?? metrics?.counts.inReviewForms} tone="blue" />
              <SummaryTile label="Approved" value={metrics?.summaries?.forms?.approved ?? metrics?.counts.approvedForms} tone="green" />
            </SummaryPanel>

            <SummaryPanel
              title="Reports"
              icon={<BarChart3 className="h-5 w-5 text-violet-600 dark:text-violet-300" />}
            >
              <SummaryTile label="Submitted" value={metrics?.summaries?.reports?.submitted ?? metrics?.counts.submittedReports} tone="green" />
              <SummaryTile label="Rooms In Maintenance" value={metrics?.summaries?.rooms?.maintenance ?? metrics?.counts.roomsInMaintenance} tone="amber" />
              <SummaryTile label="Disposed Items" value={metrics?.summaries?.inventory?.disposed ?? metrics?.counts.disposedItems} tone="gray" />
            </SummaryPanel>
          </div>

          <div className="min-h-0 overflow-hidden">
            <BookingCard />
          </div>
        </div>

        <div className="min-h-0 overflow-hidden">
          <NotificationsCard />
        </div>
      </div>
    </div>
  );
}
