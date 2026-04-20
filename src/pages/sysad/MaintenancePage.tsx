import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Database, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import { useModal } from '@/context/ModalContext';
import { getCleanupPreview, runCleanup, type CleanupPreview } from '@/services/maintenance';
import { SysAdEyebrow, SysAdPageShell } from '@/pages/sysad/components/SysAdPageShell';

const formatLabel = (value: string) => value
  .replace(/([a-z])([A-Z])/g, '$1 $2')
  .replace(/_/g, ' ')
  .replace(/\b\w/g, char => char.toUpperCase());

const CountGrid = ({ title, counts, tone }: { title: string; counts: Record<string, number>; tone: string }) => (
  <section className={`min-h-0 rounded-2xl border p-4 ${tone}`}>
    <h2 className="text-sm font-bold uppercase tracking-[0.18em] opacity-80">{title}</h2>
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
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const requiredText = preview?.confirmationText || 'RESET OPERATIONAL DATA';
  const canRun = confirmation === requiredText && !running;

  const deleteTotal = useMemo(() => (
    preview ? Object.values(preview.willDelete).reduce((sum, value) => sum + (value || 0), 0) : 0
  ), [preview]);

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
      title="Operational Data Cleanup"
      description="Clears operational activity while preserving users, room records, inventory items, and computer records. This does not delete uploaded files from disk."
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
        <div className="shrink-0 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <h2 className="font-bold">Danger zone</h2>
              <p className="mt-1 text-sm">
                Run this only when the school wants a fresh operational slate. The cleanup removes forms, tickets, bookings, schedules, borrowing records, reports, notifications, audit logs, and heartbeat sessions.
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
