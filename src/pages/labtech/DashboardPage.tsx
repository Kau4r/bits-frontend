import { useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import NotificationsCard from '@/components/NotificationsCard';
import { getDashboardMetrics, type DashboardMetrics } from '@/services/dashboard';
import { BarChart3, ClipboardCheck, FileText, PackageCheck } from 'lucide-react';
import { useNotifications } from '@/context/NotificationContext';
import { inventoryStatuses } from '@/types/inventory';

const chartColors = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed', '#0891b2', '#64748b', '#db2777'];

const SummaryPanel = ({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) => (
  <section className="flex flex-col rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800 [@media(min-height:800px)]:h-full [@media(min-height:800px)]:min-h-0">
    <div className="mb-2 flex items-center gap-2">
      {icon}
      <h2 className="text-sm font-bold text-gray-900 dark:text-white">{title}</h2>
    </div>
    <div className="flex flex-col gap-2 [@media(min-height:800px)]:grid [@media(min-height:800px)]:flex-1 [@media(min-height:800px)]:auto-rows-fr">
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
  tone?: 'gray' | 'green' | 'amber' | 'blue' | 'indigo' | 'red';
}) => {
  const toneClass = {
    gray: 'border-gray-200 bg-gray-50 text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white',
    green: 'border-green-200 bg-green-50 text-green-900 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-100',
    amber: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100',
    blue: 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100',
    indigo: 'border-indigo-200 bg-indigo-50 text-indigo-900 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-100',
    red: 'border-red-200 bg-red-50 text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100',
  }[tone];

  return (
    <div className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-xl font-black">{value || 0}</p>
    </div>
  );
};

const formatChartLabel = (value: string) =>
  value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, char => char.toUpperCase());

const normalizeChartData = (data?: Record<string, number>, labels?: string[]) => {
  const keys = labels?.length ? labels : Object.keys(data || {});
  return keys.map(label => ({
    label: formatChartLabel(label),
    value: data?.[label] || 0
  }));
};

const MiniPieChart = ({
  title,
  data,
  labels,
  showTotal,
}: {
  title: string;
  data?: Record<string, number>;
  labels?: string[];
  showTotal?: boolean;
}) => {
  const rows = normalizeChartData(data, labels);
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  let cumulative = 0;
  const visibleRows = rows
    .map((row, index) => ({ ...row, colorIndex: index }))
    .filter(row => row.value > 0);

  const getPoint = (percentage: number) => {
    const angle = (percentage * 360 - 90) * (Math.PI / 180);
    return {
      x: 50 + 38 * Math.cos(angle),
      y: 50 + 38 * Math.sin(angle),
    };
  };

  return (
    <div className="flex flex-col rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900 [@media(min-height:800px)]:min-h-0">
      <h3 className="text-left text-base font-black text-gray-900 dark:text-white">{title}</h3>
      <div className="mt-3 grid grid-cols-1 items-center gap-4 sm:grid-cols-[minmax(140px,200px)_minmax(0,1fr)] [@media(min-height:800px)]:min-h-0 [@media(min-height:800px)]:flex-1">
        <div className="flex h-[200px] items-center justify-center [@media(min-height:800px)]:h-full [@media(min-height:800px)]:min-h-0">
          <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" className="block aspect-square h-auto max-h-full w-full max-w-[200px]">
            {total > 0 ? visibleRows.map((row) => {
              if (row.value === total) {
                return (
                  <circle
                    key={row.label}
                    cx="50"
                    cy="50"
                    r="38"
                    fill={chartColors[row.colorIndex % chartColors.length]}
                  />
                );
              }

              const start = cumulative / total;
              cumulative += row.value;
              const end = cumulative / total;
              const startPoint = getPoint(start);
              const endPoint = getPoint(end);
              const largeArc = end - start > 0.5 ? 1 : 0;

              return (
                <path
                  key={row.label}
                  d={`M 50 50 L ${startPoint.x} ${startPoint.y} A 38 38 0 ${largeArc} 1 ${endPoint.x} ${endPoint.y} Z`}
                  fill={chartColors[row.colorIndex % chartColors.length]}
                />
              );
            }) : (
              <circle cx="50" cy="50" r="38" fill="#e5e7eb" className="dark:fill-gray-700" />
            )}
            <circle cx="50" cy="50" r="20" fill="currentColor" className="text-gray-50 dark:text-gray-900" />
          </svg>
        </div>

        <div className="flex w-full flex-col [@media(min-height:800px)]:min-h-0">
          <div className="grid max-h-56 gap-2 overflow-auto pr-1">
            {rows.map((row, index) => (
              <div key={row.label} className="flex items-center justify-between gap-2 text-xs">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: chartColors[index % chartColors.length] }}
                  />
                  <span className="truncate font-semibold text-gray-600 dark:text-gray-300">{row.label}</span>
                </div>
                <span className="shrink-0 text-sm font-black text-gray-900 dark:text-white">{row.value}</span>
              </div>
            ))}
          </div>

          {showTotal && (
            <div className="mt-2 border-t border-gray-200 pt-2 text-right dark:border-gray-700">
              <span className="text-sm font-black text-gray-900 dark:text-white">Total: {total}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const InventoryStatistics = ({ metrics }: { metrics: DashboardMetrics | null }) => (
  <section className="flex flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 [@media(min-height:800px)]:h-full [@media(min-height:800px)]:min-h-0">
    <div className="mb-3 flex items-center gap-2">
      <PackageCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
      <h2 className="text-sm font-bold text-gray-900 dark:text-white">Inventory Statistics</h2>
    </div>

    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 [@media(min-height:800px)]:min-h-0 [@media(min-height:800px)]:flex-1">
      <MiniPieChart
        title="Inventory By Item Type"
        data={metrics?.distributions?.itemTypes}
        showTotal
      />
      <MiniPieChart
        title="Inventory By Status"
        data={metrics?.distributions?.itemStatuses}
        labels={inventoryStatuses}
      />
    </div>
  </section>
);

export default function LabtechDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const { notifications } = useNotifications();
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const [notificationsHeight, setNotificationsHeight] = useState<number | null>(null);
  const [isFitMode, setIsFitMode] = useState(() =>
    typeof window === 'undefined' ? true : window.innerHeight >= 800,
  );

  useEffect(() => {
    const onResize = () => setIsFitMode(window.innerHeight >= 800);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const node = notificationsRef.current;
    if (!node) return;

    const recompute = () => {
      const rect = node.getBoundingClientRect();
      // Fit notifications panel within viewport: subtract its top offset and a bottom gutter.
      const available = window.innerHeight - rect.top - 24;
      setNotificationsHeight(Math.max(available, 280));
    };

    recompute();
    window.addEventListener('resize', recompute);
    window.addEventListener('scroll', recompute, true);
    const ro = new ResizeObserver(recompute);
    ro.observe(node);
    if (node.parentElement) ro.observe(node.parentElement);

    return () => {
      window.removeEventListener('resize', recompute);
      window.removeEventListener('scroll', recompute, true);
      ro.disconnect();
    };
  }, []);

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
      const isRelevant = /ticket|form|booking|schedule|inventory|item|room|report/i.test(latest.title + latest.message);

      if (isRelevant) {
        console.log('[Dashboard] Real-time update detected, refreshing metrics...');
        fetchMetrics();
      }
    }
  }, [notifications, fetchMetrics]);

  return (
    <div className="flex w-full flex-col bg-white p-6 sm:px-8 lg:px-10 dark:bg-gray-900 [@media(min-height:800px)]:h-full [@media(min-height:800px)]:overflow-hidden">
      <div className="mb-4 shrink-0">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Lab Technician Dashboard
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Track tickets, forms, reports, inventory, and alerts.
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px] [@media(min-height:800px)]:min-h-0 [@media(min-height:800px)]:flex-1 [@media(min-height:800px)]:items-stretch">
        <div className="grid gap-4 [@media(min-height:800px)]:min-h-0 [@media(min-height:800px)]:grid-rows-[auto_minmax(0,1fr)]">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <SummaryPanel
              title="Ticket Breakdown"
              icon={<ClipboardCheck className="h-5 w-5 text-purple-600 dark:text-purple-300" />}
            >
              <SummaryTile label="Completed" value={metrics?.summaries?.tickets?.completedByMe ?? metrics?.counts.myCompletedTickets} tone="green" />
              <SummaryTile label="Pending" value={metrics?.summaries?.tickets?.pending ?? metrics?.counts.pendingTickets} tone="amber" />
              <SummaryTile label="Unassigned" value={metrics?.summaries?.tickets?.unassigned ?? metrics?.counts.unassignedTickets} tone="red" />
            </SummaryPanel>

            <SummaryPanel
              title="Forms Breakdown"
              icon={<FileText className="h-5 w-5 text-blue-600 dark:text-blue-300" />}
            >
              <SummaryTile label="Pending" value={metrics?.summaries?.forms?.pending ?? metrics?.counts.pendingForms} tone="amber" />
              <SummaryTile label="In Review" value={metrics?.summaries?.forms?.inReview ?? metrics?.counts.inReviewForms} tone="blue" />
              <SummaryTile label="Signed" value={metrics?.summaries?.forms?.approved ?? metrics?.counts.approvedForms} tone="indigo" />
              <SummaryTile label="Completed" value={metrics?.summaries?.forms?.completed ?? metrics?.counts.completedForms} tone="green" />
            </SummaryPanel>

            <SummaryPanel
              title="Reports"
              icon={<BarChart3 className="h-5 w-5 text-violet-600 dark:text-violet-300" />}
            >
              <SummaryTile label="Draft Reports" value={metrics?.summaries?.reports?.drafts ?? metrics?.counts.draftReports} tone="blue" />
              <SummaryTile label="Submitted" value={metrics?.summaries?.reports?.submitted ?? metrics?.counts.submittedReports} tone="green" />
              <SummaryTile label="Rooms In Maintenance" value={metrics?.summaries?.rooms?.maintenance ?? metrics?.counts.roomsInMaintenance} tone="amber" />
            </SummaryPanel>
          </div>

          <div className="[@media(min-height:800px)]:min-h-0 [@media(min-height:800px)]:overflow-hidden">
            <InventoryStatistics metrics={metrics} />
          </div>
        </div>

        <div
          ref={notificationsRef}
          className="overflow-hidden [@media(min-height:800px)]:min-h-0 [@media(min-height:800px)]:h-full"
          style={!isFitMode && notificationsHeight ? { height: `${notificationsHeight}px` } : undefined}
        >
          <NotificationsCard />
        </div>
      </div>
    </div>
  );
}
