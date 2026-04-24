import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Archive, Download, FileArchive, History, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import { useModal } from '@/context/ModalContext';
import {
  getArchiveFiles,
  getCleanupPreview,
  getMaintenanceHistory,
  getSchoolYearArchivePreview,
  runCleanup,
  runSchoolYearArchiveCleanup,
  type ArchiveFile,
  type CleanupPreview,
  type MaintenanceHistoryEntry,
  type SchoolYearArchivePreview,
  type SchoolYearArchiveResult,
} from '@/services/maintenance';
import { SysAdEyebrow, SysAdPageShell } from '@/pages/sysad/components/SysAdPageShell';
import { getApiBaseUrl } from '@/utils/apiBaseUrl';

const labelOverrides: Record<string, string> = {
  bookings: 'Schedules',
  bookedRooms: 'Schedules',
  borrowItems: 'Borrowing Records',
  borrowingComputers: 'Computer Borrowing Records',
  formAttachments: 'Form Attachments',
  formHistory: 'Form History',
  notificationReads: 'Notification Reads',
  auditLogs: 'Audit Logs',
  inventoryItems: 'Inventory Items',
  borrowedItems: 'Borrowed Items',
};

const formatLabel = (value: string) => labelOverrides[value] || value
  .replace(/([a-z])([A-Z])/g, '$1 $2')
  .replace(/_/g, ' ')
  .replace(/\b\w/g, char => char.toUpperCase());

const formatDate = (value?: string) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const formatBytes = (value: number) => {
  if (!value) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
};

const totalCount = (rows?: Record<string, number>) => (
  rows ? Object.values(rows).reduce((sum, value) => sum + (value || 0), 0) : 0
);

const toScheduleDisplayCounts = (rows?: Record<string, number>) => {
  const next = { ...(rows || {}) };
  if (Object.prototype.hasOwnProperty.call(next, 'bookings')) {
    next.schedules = (next.schedules || 0) + next.bookings;
    delete next.bookings;
  }
  return next;
};

const CountList = ({
  title,
  data,
  tone = 'slate',
}: {
  title: string;
  data?: Record<string, number>;
  tone?: 'slate' | 'blue' | 'red' | 'green';
}) => {
  const entries = Object.entries(data || {});
  const toneClass = {
    slate: 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800',
    blue: 'border-blue-200 bg-blue-50/50 dark:border-blue-500/30 dark:bg-blue-500/10',
    red: 'border-red-200 bg-red-50/60 dark:border-red-500/30 dark:bg-red-500/10',
    green: 'border-green-200 bg-green-50/60 dark:border-green-500/30 dark:bg-green-500/10',
  }[tone];

  return (
    <section className={`flex min-h-0 flex-col overflow-hidden rounded-xl border p-4 ${toneClass}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-black text-slate-950 dark:text-white">{title}</h3>
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-200">
          {totalCount(data)}
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {entries.length ? entries.map(([key, value]) => (
          <div key={key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-slate-100 py-2 text-sm last:border-b-0 dark:border-slate-700">
            <span className="min-w-0 break-words leading-5 text-slate-600 dark:text-slate-300">{formatLabel(key)}</span>
            <span className="text-right font-black text-slate-950 dark:text-white">{value || 0}</span>
          </div>
        )) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">No records.</p>
        )}
      </div>
    </section>
  );
};

export default function MaintenancePage() {
  const modal = useModal();
  const [preview, setPreview] = useState<CleanupPreview | null>(null);
  const [archivePreview, setArchivePreview] = useState<SchoolYearArchivePreview | null>(null);
  const [archives, setArchives] = useState<ArchiveFile[]>([]);
  const [history, setHistory] = useState<MaintenanceHistoryEntry[]>([]);
  const [schoolYear, setSchoolYear] = useState(() => {
    const now = new Date();
    const startYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
    return `${startYear}-${startYear + 1}`;
  });
  const [confirmation, setConfirmation] = useState('');
  const [archiveConfirmation, setArchiveConfirmation] = useState('');
  const [lastArchive, setLastArchive] = useState<SchoolYearArchiveResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [archiveRunning, setArchiveRunning] = useState(false);

  const requiredText = preview?.confirmationText || 'RESET OPERATIONAL DATA';
  const archiveRequiredText = archivePreview?.confirmationText || 'ARCHIVE AND RESET SCHOOL YEAR';
  const canRun = confirmation === requiredText && !running;
  const canRunArchive = archiveConfirmation === archiveRequiredText && !archiveRunning && !!archivePreview;
  const archiveDownloadHref = lastArchive?.downloadUrl
    ? `${getApiBaseUrl().replace(/\/+$/, '')}${lastArchive.downloadUrl}`
    : '';

  const archiveRange = useMemo(() => {
    if (!archivePreview) return '';
    return `${formatDate(archivePreview.dateRange.start)} - ${formatDate(archivePreview.dateRange.end)}`;
  }, [archivePreview]);
  const archiveThenCleared = useMemo(
    () => toScheduleDisplayCounts(archivePreview?.willDelete),
    [archivePreview]
  );
  const permanentSetupCounts = useMemo(
    () => toScheduleDisplayCounts(archivePreview?.willPreserve),
    [archivePreview]
  );
  const emergencyDeleteCounts = useMemo(
    () => toScheduleDisplayCounts(preview?.willDelete),
    [preview]
  );

  const loadMaintenanceData = async () => {
    setLoading(true);
    try {
      const [cleanupPreview, archiveFiles, maintenanceHistory] = await Promise.all([
        getCleanupPreview(),
        getArchiveFiles(),
        getMaintenanceHistory(),
      ]);
      setPreview(cleanupPreview);
      setArchives(archiveFiles);
      setHistory(maintenanceHistory);
    } catch (error) {
      await modal.showError(error instanceof Error ? error.message : 'Failed to load maintenance data.', 'Maintenance Load Failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMaintenanceData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleArchivePreview = async (clearLastArchive = true) => {
    setArchiveLoading(true);
    if (clearLastArchive) setLastArchive(null);
    try {
      setArchivePreview(await getSchoolYearArchivePreview(schoolYear));
      setArchiveConfirmation('');
    } catch (error) {
      setArchivePreview(null);
      await modal.showError(error instanceof Error ? error.message : 'Failed to load archive preview.', 'Archive Preview Failed');
    } finally {
      setArchiveLoading(false);
    }
  };

  const handleArchiveCleanup = async () => {
    if (!archivePreview) return;

    if (archiveConfirmation !== archiveRequiredText) {
      await modal.showError(`Type ${archiveRequiredText} exactly before archiving and cleanup.`, 'Confirmation Required');
      return;
    }

    const confirmed = await modal.showConfirm(
      `This will archive and clear ${totalCount(archivePreview.willDelete)} operational schedule-related record(s) for SY ${archivePreview.schoolYear}. Users, rooms, computers, and inventory stay permanent. Continue?`,
      'Archive School Year and Cleanup'
    );
    if (!confirmed) return;

    setArchiveRunning(true);
    try {
      const result = await runSchoolYearArchiveCleanup(schoolYear, archiveConfirmation);
      setLastArchive(result);
      setArchiveConfirmation('');
      await Promise.all([loadMaintenanceData(), handleArchivePreview(false)]);
      await modal.showSuccess(result.message || 'School year archive cleanup completed.', 'Archive Complete');
    } catch (error) {
      await modal.showError(error instanceof Error ? error.message : 'Archive cleanup failed.', 'Archive Cleanup Failed');
    } finally {
      setArchiveRunning(false);
    }
  };

  const handleCleanup = async () => {
    if (!preview) return;

    if (confirmation !== requiredText) {
      await modal.showError(`Type ${requiredText} exactly before running cleanup.`, 'Confirmation Required');
      return;
    }

    const confirmed = await modal.showConfirm(
      `This will delete ${totalCount(preview.willDelete)} operational record(s), reset rooms/computers/items, and preserve setup data. Continue?`,
      'Run Database Cleanup'
    );
    if (!confirmed) return;

    setRunning(true);
    try {
      const result = await runCleanup(confirmation);
      setConfirmation('');
      await loadMaintenanceData();
      await modal.showSuccess(result.message || 'Operational data cleanup completed.', 'Cleanup Complete');
    } catch (error) {
      await modal.showError(error instanceof Error ? error.message : 'Cleanup failed.', 'Cleanup Failed');
    } finally {
      setRunning(false);
    }
  };

  return (
    <SysAdPageShell
      eyebrow={<SysAdEyebrow><ShieldCheck className="h-4 w-4" />Admin Maintenance</SysAdEyebrow>}
      title="School Year Archive and Cleanup"
      description="Archive school-year records, review what will be reset, and download generated archive files without exposing database structure."
      action={(
        <button
          type="button"
          onClick={() => void loadMaintenanceData()}
          disabled={loading || running || archiveRunning}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      )}
    >
      <div className="relative flex h-full min-h-0 flex-col gap-4 overflow-hidden">
        <div className="grid min-h-0 flex-1 gap-4 overflow-hidden xl:grid-cols-[minmax(0,1fr)_minmax(260px,300px)]">
          <div className="flex min-h-0 flex-col gap-4 overflow-hidden">
            <section className="shrink-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(240px,280px)]">
                <div className="flex min-w-0 gap-4">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200">
                    <Archive className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base font-black text-slate-950 dark:text-white">Recommended flow</h2>
                    <p className="mt-1 max-w-4xl text-sm text-slate-600 dark:text-slate-300">
                      Preview the selected school year, archive operational records into a compressed file, then clear those same operational records. Users, rooms, inventory items, and computers stay permanent.
                    </p>
                    <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Reset means schedules, forms, tickets, borrowing records, and reports are cleared, while room/computer/item availability is returned to a clean state.
                    </p>
                  </div>
                </div>
                <div className="min-w-0 rounded-xl border border-blue-100 bg-blue-50 p-3 dark:border-blue-500/20 dark:bg-blue-500/10">
                  <label className="text-xs font-bold uppercase tracking-[0.18em] text-blue-900 dark:text-blue-100">School Year</label>
                  <div className="mt-2 flex min-w-0 flex-col gap-2">
                    <input
                      value={schoolYear}
                      onChange={(event) => setSchoolYear(event.target.value)}
                      placeholder="2025-2026"
                      className="min-w-0 flex-1 rounded-lg border border-blue-200 bg-white px-3 py-2 font-mono text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-blue-700 dark:bg-[#1e2939] dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => void handleArchivePreview()}
                      disabled={archiveLoading || archiveRunning}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
                    >
                      <RefreshCw className={`h-4 w-4 ${archiveLoading ? 'animate-spin' : ''}`} />
                      Preview
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <div className="grid min-h-0 flex-1 gap-4 overflow-hidden xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.9fr)]">
              <section className="flex min-h-0 flex-col gap-4 overflow-hidden">
            <div className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm dark:border-blue-500/30 dark:bg-slate-800">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-black text-slate-950 dark:text-white">Archive preview</h2>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {archivePreview ? `SY ${archivePreview.schoolYear} | ${archiveRange}` : 'Choose a school year and click Preview.'}
                  </p>
                </div>
                {archivePreview && (
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-700 dark:bg-blue-500/20 dark:text-blue-200">
                    {totalCount(archiveThenCleared)} archived and cleared
                  </span>
                )}
              </div>
              {archivePreview && (
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <input
                    value={archiveConfirmation}
                    onChange={(event) => setArchiveConfirmation(event.target.value)}
                    placeholder={archiveRequiredText}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-[#334155] dark:bg-[#1e2939] dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => void handleArchiveCleanup()}
                    disabled={!canRunArchive}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Archive className="h-4 w-4" />
                    {archiveRunning ? 'Archiving...' : 'Archive and Reset'}
                  </button>
                  {lastArchive && archiveDownloadHref && (
                    <a
                      href={archiveDownloadHref}
                      className="inline-flex min-w-0 items-center gap-2 break-all text-sm font-bold text-blue-700 hover:underline dark:text-blue-300 md:col-span-2"
                    >
                      <Download className="h-4 w-4" />
                      Download {lastArchive.archiveName}
                    </a>
                  )}
                </div>
              )}
            </div>

            <div className="grid min-h-0 flex-1 gap-3 md:grid-cols-2">
              <CountList title="Archived Then Cleared" data={archiveThenCleared} tone="blue" />
              <CountList title="Permanent Setup Data" data={permanentSetupCounts} />
            </div>
              </section>

          <section className="grid min-h-0 grid-rows-2 gap-4 overflow-hidden">
            <div className="flex min-h-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="inline-flex items-center gap-2 text-base font-black text-slate-950 dark:text-white">
                  <FileArchive className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                  Archived Files
                </h2>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                  {archives.length}
                </span>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                {archives.length ? archives.map((file) => (
                  <a
                    key={file.fileName}
                    href={`${getApiBaseUrl().replace(/\/+$/, '')}${file.downloadUrl}`}
                    className="mb-2 flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm transition hover:border-blue-300 hover:bg-blue-50 dark:border-slate-700 dark:hover:border-blue-500/40 dark:hover:bg-blue-500/10"
                  >
                    <span className="min-w-0">
                      <span className="block break-all font-bold text-slate-950 dark:text-white">{file.fileName}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{formatBytes(file.sizeBytes)} | {formatDate(file.modifiedAt)}</span>
                    </span>
                    <Download className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-300" />
                  </a>
                )) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">No archive files generated yet.</p>
                )}
              </div>
            </div>

            <div className="flex min-h-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="inline-flex items-center gap-2 text-base font-black text-slate-950 dark:text-white">
                  <History className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
                  Cleanups
                </h2>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                  {history.length}
                </span>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                {history.length ? history.map((entry) => (
                  <div key={entry.id} className="mb-2 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
                    <p className="font-bold text-slate-950 dark:text-white">{formatLabel(entry.action)}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-600 dark:text-slate-300">{entry.details}</p>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      {formatDate(entry.timestamp)}
                      {entry.user ? ` | ${entry.user.firstName || ''} ${entry.user.lastName || entry.user.username || ''}` : ''}
                    </p>
                  </div>
                )) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">No cleanup activity recorded yet.</p>
                )}
              </div>
            </div>
          </section>
          </div>
          </div>

          <section className="grid min-h-0 grid-rows-[auto_1fr] gap-4 overflow-hidden">
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800 shadow-sm dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
              <div className="flex gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <h2 className="font-black">Emergency reset</h2>
                  <p className="mt-1 text-xs">
                    Use this only when an immediate reset is required without creating a school-year archive first.
                  </p>
                  <div className="mt-3 flex min-w-0 flex-col gap-2">
                    <input
                      value={confirmation}
                      onChange={(event) => setConfirmation(event.target.value)}
                      placeholder={requiredText}
                      className="min-w-0 flex-1 rounded-lg border border-red-200 bg-white px-3 py-2 font-mono text-xs text-slate-950 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 dark:border-red-500/30 dark:bg-slate-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => void handleCleanup()}
                      disabled={!canRun}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Reset
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid min-h-0 gap-3 overflow-y-auto pr-1">
              <CountList title="Emergency Clear Preview" data={emergencyDeleteCounts} tone="red" />
            </div>
          </section>
        </div>

        {loading && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center bg-white/50 text-sm font-bold text-slate-600 backdrop-blur-[1px] dark:bg-slate-900/40 dark:text-slate-200">
            Loading maintenance data...
          </div>
        )}
      </div>
    </SysAdPageShell>
  );
}
