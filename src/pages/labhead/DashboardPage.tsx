import { useEffect, useState, useCallback, type ReactNode } from 'react';
import BookingCard from '@/components/BookingCard';
import NotificationsCard from '@/components/NotificationsCard';
import { getDashboardMetrics, type DashboardMetrics } from '@/services/dashboard';
import { inventoryStatuses } from '@/types/inventory';
import { ClipboardList, FileText, PackageCheck } from 'lucide-react';
import { useNotifications } from '@/context/NotificationContext';

const chartColors = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed', '#0891b2', '#4b5563'];

const formatLabel = (value: string) => value
  .replace(/_/g, ' ')
  .replace(/\b\w/g, char => char.toUpperCase());

const MiniPieChart = ({
  title,
  data,
  labels,
}: {
  title: string;
  data?: Record<string, number>;
  labels?: string[];
}) => {
  const entries = labels?.length
    ? labels.map(label => [label, data?.[label] || 0] as [string, number])
    : Object.entries(data || {}).filter(([, value]) => value > 0);
  const filledEntries = entries.filter(([, value]) => value > 0);
  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  let cursor = 0;
  const gradient = filledEntries.length
    ? filledEntries.map(([, value], index) => {
      const start = cursor;
      const end = cursor + (value / total) * 100;
      cursor = end;
      return `${chartColors[index % chartColors.length]} ${start}% ${end}%`;
    }).join(', ')
    : '#e5e7eb 0% 100%';

  return (
    <section className="flex h-full min-h-0 flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-3 text-left">
        <h2 className="text-sm font-bold text-gray-900 dark:text-white">{title}</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">{total} record{total === 1 ? '' : 's'}</p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-between">
        <div className="flex justify-center">
          <div
            className="h-20 w-20 shrink-0 rounded-full border border-gray-200 dark:border-gray-700"
            style={{ background: `conic-gradient(${gradient})` }}
            aria-label={`${title} pie chart`}
          />
        </div>

        <div className="mt-3 grid gap-1.5 overflow-hidden">
          {entries.length ? entries.map(([label, value], index) => (
            <div key={label} className="flex items-center justify-between gap-2 text-xs">
              <span className="flex min-w-0 items-center gap-2 text-gray-600 dark:text-gray-300">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: chartColors[index % chartColors.length] }} />
                <span className="truncate">{formatLabel(label)}</span>
              </span>
              <span className="font-bold text-gray-900 dark:text-white">{value}</span>
            </div>
          )) : (
            <p className="text-xs text-gray-500 dark:text-gray-400">No data yet.</p>
          )}
        </div>
      </div>
    </section>
  );
};

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

const SummaryTile = ({ label, value }: { label: string; value?: number }) => (
  <div className="flex min-h-[72px] flex-col justify-between rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
    <p className="mt-1 text-xl font-black text-gray-900 dark:text-white">{value || 0}</p>
  </div>
);

export default function LabheadDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const { notifications } = useNotifications();

  const fetchMetrics = useCallback(async () => {
    try {
      const data = await getDashboardMetrics();
      setMetrics(data);
    } catch (error) {
      console.error('Failed to load dashboard metrics', error);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    if (notifications.length > 0) {
      const latest = notifications[0];
      const isRelevant = /ticket|form|booking|inventory|item|room/i.test(latest.title + latest.message);

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
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Overview of lab operations, tickets, and inventory status</p>
      </div>

      <div className="grid shrink-0 grid-cols-1 items-stretch gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MiniPieChart title="Inventory By Item Type" data={metrics?.distributions?.itemTypes} />
        <MiniPieChart title="Inventory By Status" data={metrics?.distributions?.itemStatuses} labels={inventoryStatuses} />
        <SummaryPanel
          title="Labtech Status"
          icon={<ClipboardList className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />}
        >
          <SummaryTile label="Completed Tickets" value={metrics?.counts.completedTickets} />
          <SummaryTile label="Unassigned Tickets" value={metrics?.counts.unassignedTickets} />
          <SummaryTile label="Submitted Reports" value={metrics?.counts.submittedReports} />
        </SummaryPanel>
        <SummaryPanel
          title="Room And Inventory"
          icon={<PackageCheck className="h-5 w-5 text-orange-600 dark:text-orange-300" />}
        >
          <SummaryTile label="Rooms In Maintenance" value={metrics?.counts.roomsInMaintenance} />
          <SummaryTile label="Defective Items" value={metrics?.counts.brokenItems} />
          <SummaryTile label="Disposed Items" value={metrics?.counts.disposedItems} />
        </SummaryPanel>
        <SummaryPanel
          title="Forms"
          icon={<FileText className="h-5 w-5 text-blue-600 dark:text-blue-300" />}
        >
          <SummaryTile label="Pending" value={metrics?.counts.pendingForms} />
          <SummaryTile label="In Review" value={metrics?.counts.inReviewForms} />
          <SummaryTile label="Approved" value={metrics?.counts.approvedForms} />
        </SummaryPanel>
      </div>

      <div className="mt-4 grid min-h-0 flex-1 grid-cols-1 items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-h-0 overflow-hidden">
          <BookingCard />
        </div>

        <div className="min-h-0 overflow-hidden">
          <NotificationsCard />
        </div>
      </div>
    </div>
  );
}
