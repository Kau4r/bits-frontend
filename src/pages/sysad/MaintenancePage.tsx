import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Archive, Database, Download, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import { useModal } from '@/context/ModalContext';
import {
  getCleanupPreview,
  getSchoolYearArchivePreview,
  runCleanup,
  runSchoolYearArchiveCleanup,
  type CleanupPreview,
  type SchoolYearArchivePreview,
  type SchoolYearArchiveResult
} from '@/services/maintenance';
import { SysAdEyebrow, SysAdPageShell } from '@/pages/sysad/components/SysAdPageShell';
import { getApiBaseUrl } from '@/utils/apiBaseUrl';

const formatLabel = (value: string) => value
  .replace(/([a-z])([A-Z])/g, '$1 $2')
  .replace(/_/g, ' ')
  .replace(/\b\w/g, char => char.toUpperCase());

const CountGrid = ({ title, counts, tone, description }: { title: string; counts: Record<string, number>; tone: string; description?: string }) => (
  <section className={`min-h-0 rounded-2xl border p-4 ${tone}`}>
    <div>
      <h2 className="text-sm font-bold uppercase tracking-[0.18em] opacity-80">{title}</h2>
      {description && <p className="mt-1 text-xs opacity-75">{description}</p>}
    </div>
    <div className="mt-3 grid gap-2 sm:grid-cols-2 2xl:grid-cols-3">
      {Object.entries(counts).map(([key, value]) => (
        <div key={key} className="rounded-xl border border-white/10 bg-white/60 p-2.5 dark:bg-slate-950/30">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{formatLabel(key)}</p>
          <p className="mt-1 text-xl font-black">{value ?? 0}</p>
        </div>
      ))}
    </div>
  </section>
);

export default function MaintenancePage() {
  const modal = useModal();
  const [preview, setPreview] = useState<CleanupPreview | null>(null);
  const [archivePreview, setArchivePreview] = useState<SchoolYearArchivePreview | null>(null);
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

  const deleteTotal = useMemo(() => (
    preview ? Object.values(preview.willDelete).reduce((sum, value) => sum + (value || 0), 0) : 0
  ), [preview]);

  const archiveTotal = useMemo(() => (
    archivePreview ? Object.values(archivePreview.willArchive).reduce((sum, value) => sum + (value || 0), 0) : 0
  ), [archivePreview]);
  const hasExcludedArchiveRows = archivePreview ? Object.keys(archivePreview.excludedFromArchive).length > 0 : false;

  const archiveDownloadHref = lastArchive?.downloadUrl
    ? `${getApiBaseUrl().replace(/\/+$/, '')}${lastArchive.downloadUrl}`
    : '';

  const loadPreview = async () => {
    setLoading(true);
    try {
      setPreview(await getCleanupPreview());
    } catch (error) {
      await modal.showError(error instanceof Error ? error.message : 'Failed to load cleanup preview.', 'Preview Failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPreview();
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
      `This will archive ${archiveTotal} record(s) for SY ${archivePreview.schoolYear}, then reset only that school year's operational data. Continue?`,
      'Archive School Year and Cleanup'
    );
    if (!confirmed) return;

    setArchiveRunning(true);
    try {
      const result = await runSchoolYearArchiveCleanup(schoolYear, archiveConfirmation);
      setLastArchive(result);
      await modal.showSuccess(result.message || 'School year archive cleanup completed.', 'Archive Complete');
      setArchiveConfirmation('');
      await Promise.all([loadPreview(), handleArchivePreview(false)]);
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
      `This will delete ${deleteTotal} operational record(s), reset rooms/computers/items to available state, and preserve users, rooms, inventory, and computers. Continue?`,
      'Run Database Cleanup'
    );
    if (!confirmed) return;

    setRunning(true);
    try {
      const result = await runCleanup(confirmation);
      await modal.showSuccess(result.message || 'Operational data cleanup completed.', 'Cleanup Complete');
      setConfirmation('');
      await loadPreview();
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
      description="Create a compressed archive for record keeping, then reset school-year activity while preserving setup data such as users, rooms, inventory items, and computers."
      action={(
        <button
          type="button"
          onClick={() => void loadPreview()}
          disabled={loading || running}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Preview
        </button>
      )}
    >
      <div className="flex h-full min-h-0 flex-col gap-4">
        <section className="shrink-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="flex gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200">
                <Archive className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-950 dark:text-white">Recommended flow</h2>
                <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
                  Archive the selected school year first, then reset operational records for that same year. The archive keeps long-term records such as tickets, forms, borrowing, reports, schedules, notifications, inventory, rooms, and computers.
                </p>
                <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                    <p className="font-bold text-slate-950 dark:text-white">1. Preview</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Review what will be archived, excluded, deleted, and preserved.</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                    <p className="font-bold text-slate-950 dark:text-white">2. Confirm</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Type the exact confirmation phrase before changes are applied.</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                    <p className="font-bold text-slate-950 dark:text-white">3. Download</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Keep the generated compressed archive for school-year records.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-500/20 dark:bg-blue-500/10">
              <label className="text-xs font-bold uppercase tracking-[0.18em] text-blue-900 dark:text-blue-100">School Year</label>
              <input
                value={schoolYear}
                onChange={(event) => setSchoolYear(event.target.value)}
                placeholder="2025-2026"
                className="mt-3 w-full rounded-xl border border-blue-200 bg-white px-4 py-3 font-mono text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-blue-700 dark:bg-[#1e2939] dark:text-white"
              />
              <button
                type="button"
                onClick={() => void handleArchivePreview()}
                disabled={archiveLoading || archiveRunning}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${archiveLoading ? 'animate-spin' : ''}`} />
                Preview School Year
              </button>
            </div>
          </div>
        </section>

        {archivePreview && (
          <section className={`grid shrink-0 gap-4 ${hasExcludedArchiveRows ? 'xl:grid-cols-[1fr_1fr_1fr_1.05fr]' : 'xl:grid-cols-[1fr_1fr_1.05fr]'}`}>
            <CountGrid
              title="Archive"
              description="Long-term records saved into the compressed file."
              counts={archivePreview.willArchive}
              tone="border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100"
            />
            {hasExcludedArchiveRows && (
              <CountGrid
                title="Excluded"
                description="Temporary data not written into the archive."
                counts={archivePreview.excludedFromArchive}
                tone="border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
            )}
            <CountGrid
              title="Cleanup"
              description="Selected school-year records removed or reset after archive creation."
              counts={archivePreview.willDelete}
              tone="border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200"
            />
            <div className="rounded-2xl border border-blue-200 bg-white p-5 text-slate-900 shadow-sm dark:border-blue-500/30 dark:bg-slate-800 dark:text-white">
              <h2 className="text-lg font-bold">Confirm and run</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Archive file: <span className="font-mono font-semibold">{archivePreview.archiveName}</span>
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Required text: <span className="font-mono font-bold text-blue-700 dark:text-blue-300">{archiveRequiredText}</span>
              </p>
              <input
                value={archiveConfirmation}
                onChange={(event) => setArchiveConfirmation(event.target.value)}
                placeholder={archiveRequiredText}
                className="mt-4 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-mono text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-[#334155] dark:bg-[#1e2939] dark:text-white"
              />
              <button
                type="button"
                onClick={() => void handleArchiveCleanup()}
                disabled={!canRunArchive}
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Archive className="h-4 w-4" />
                {archiveRunning ? 'Archiving...' : 'Archive and Reset'}
              </button>
              {lastArchive && archiveDownloadHref && (
                <a
                  href={archiveDownloadHref}
                  className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-blue-700 hover:underline dark:text-blue-300"
                >
                  <Download className="h-4 w-4" />
                  Download {lastArchive.archiveName}
                </a>
              )}
            </div>
          </section>
        )}

        <div className="shrink-0 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <h2 className="font-bold">Emergency reset</h2>
              <p className="mt-1 text-sm">
                Use this only when an immediate reset is required. The safer option is the school-year archive flow above because it creates a downloadable record before cleanup.
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Loading cleanup preview...
          </div>
        ) : preview ? (
          <div className="grid min-h-0 flex-1 gap-4 2xl:grid-cols-[1fr_1fr_1fr_1.05fr]">
            <div className="grid min-h-0 gap-4 xl:grid-cols-3 2xl:col-span-3">
              <CountGrid title="Will Delete" counts={preview.willDelete} tone="border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200" />
              <CountGrid title="Will Reset" counts={preview.willReset} tone="border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200" />
              <CountGrid title="Will Preserve" counts={preview.willPreserve} tone="border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200" />
            </div>

            <section className="min-h-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-start gap-3">
                <Database className="mt-1 h-5 w-5 text-red-500" />
                <div className="flex-1">
                  <h2 className="text-lg font-bold">Type confirmation to run cleanup</h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    Required text: <span className="font-mono font-bold text-red-600 dark:text-red-300">{requiredText}</span>
                  </p>
                  <input
                    value={confirmation}
                    onChange={(event) => setConfirmation(event.target.value)}
                    placeholder={requiredText}
                    className="mt-4 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-mono text-sm text-slate-950 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/30 dark:border-[#334155] dark:bg-[#1e2939] dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => void handleCleanup()}
                    disabled={!canRun}
                    className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    {running ? 'Running Cleanup...' : 'Run Cleanup'}
                  </button>
                </div>
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </SysAdPageShell>
  );
}
