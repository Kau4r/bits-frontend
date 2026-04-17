import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, RefreshCw, Upload, XCircle } from "lucide-react";
import { useModal } from "@/context/ModalContext";
import {
  importOfferedCourseSchedules,
  previewOfferedCourseImport,
  type ScheduleImportOptions,
  type ScheduleImportResult,
  type ScheduleImportRow,
  type ScheduleImportRowStatus
} from "@/services/scheduleImport";

const sheetChoices = [
  'Offered Course',
  'Requested Course',
  'Requested Course by Other Dept.'
];

const statusStyles: Record<ScheduleImportRowStatus, string> = {
  valid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  imported: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  skipped: 'bg-slate-100 text-slate-700 dark:bg-slate-700/60 dark:text-slate-300',
  invalid: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  unknown_room: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  ambiguous_room: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
  conflict: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  duplicate: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'
};

const today = () => new Date().toISOString().slice(0, 10);

const labelForStatus = (status: ScheduleImportRowStatus) =>
  status.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());

const ResultCard = ({ label, value, tone }: { label: string; value: number; tone: string }) => (
  <div className={`rounded-2xl border p-4 ${tone}`}>
    <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-80">{label}</p>
    <p className="mt-2 text-3xl font-black">{value}</p>
  </div>
);

const RowPreview = ({ row }: { row: ScheduleImportRow }) => (
  <tr className="border-b border-gray-200/70 dark:border-gray-700/70">
    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{row.sheetName} #{row.rowNumber}</td>
    <td className="px-4 py-3">
      <p className="text-sm font-semibold text-gray-900 dark:text-white">{row.courseCode || 'Unknown course'}</p>
      <p className="max-w-xs truncate text-xs text-gray-500 dark:text-gray-400">{row.description || row.title || 'No description'}</p>
    </td>
    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{row.rawSchedule || 'No schedule'}</td>
    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{row.roomName || row.roomCode || '-'}</td>
    <td className="px-4 py-3">
      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[row.status]}`}>
        {labelForStatus(row.status)}
      </span>
      <p className="mt-1 max-w-xs text-xs text-gray-500 dark:text-gray-400">{row.reason}</p>
    </td>
  </tr>
);

export default function ScheduleImportPage() {
  const modal = useModal();
  const [file, setFile] = useState<File | null>(null);
  const [selectedSheets, setSelectedSheets] = useState<string[]>(['Offered Course']);
  const [skipDissolved, setSkipDissolved] = useState(true);
  const [approvedOnly, setApprovedOnly] = useState(true);
  const [anchorDate, setAnchorDate] = useState(today);
  const [result, setResult] = useState<ScheduleImportResult | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const options: ScheduleImportOptions = useMemo(() => ({
    sheetNames: selectedSheets,
    skipDissolved,
    approvedOnly,
    anchorDate
  }), [selectedSheets, skipDissolved, approvedOnly, anchorDate]);

  const problemRows = useMemo(() =>
    result?.rows.filter(row => row.status !== 'valid' && row.status !== 'imported').slice(0, 80) || [],
    [result]
  );

  const successfulRows = useMemo(() =>
    result?.rows.filter(row => row.status === 'valid' || row.status === 'imported').slice(0, 80) || [],
    [result]
  );

  const handleSheetToggle = (sheet: string) => {
    setSelectedSheets(prev => {
      if (prev.includes(sheet)) {
        const next = prev.filter(item => item !== sheet);
        return next.length > 0 ? next : prev;
      }

      return [...prev, sheet];
    });
  };

  const handlePreview = async () => {
    if (!file) {
      await modal.showError('Choose an .xlsx file first.', 'Missing File');
      return;
    }

    setIsPreviewing(true);
    try {
      const preview = await previewOfferedCourseImport(file, options);
      setResult(preview);
    } catch (error: any) {
      await modal.showError(error.message || 'Failed to preview schedule import.', 'Preview Failed');
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleImport = async () => {
    if (!file || !result) return;

    if (result.summary.valid === 0) {
      await modal.showError('There are no valid schedule rows to import.', 'Nothing To Import');
      return;
    }

    const confirmed = await modal.showConfirm(
      `Import ${result.summary.valid} schedule(s)? Rows with unknown rooms, conflicts, duplicates, or invalid schedules will be skipped.`,
      'Confirm Schedule Import'
    );
    if (!confirmed) return;

    setIsImporting(true);
    try {
      const imported = await importOfferedCourseSchedules(file, options);
      setResult(imported);
      await modal.showSuccess(`Imported ${imported.summary.imported} schedule(s).`, 'Import Complete');
    } catch (error: any) {
      await modal.showError(error.message || 'Failed to import schedules.', 'Import Failed');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="flex h-full w-full flex-col bg-white p-6 text-slate-950 dark:bg-gray-900 dark:text-white sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
              <FileSpreadsheet className="h-4 w-4" />
              Admin Import
            </div>
            <h1 className="text-3xl font-black tracking-tight">Course Schedule Import</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
              Upload the offered-courses workbook, preview parsed room schedules, then import valid class schedules into room availability.
            </p>
          </div>
        </div>

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-[420px_1fr]">
          <div className="space-y-5">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Workbook</label>
              <label className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center transition hover:border-indigo-400 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-950/60 dark:hover:border-indigo-500 dark:hover:bg-indigo-950/20">
                <Upload className="h-10 w-10 text-indigo-500" />
                <span className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">
                  {file ? file.name : 'Choose .xlsx file'}
                </span>
                <span className="mt-1 text-xs text-slate-500 dark:text-slate-400">Preview runs before anything is imported.</span>
                <input
                  type="file"
                  accept=".xlsx"
                  className="sr-only"
                  onChange={(event) => {
                    setFile(event.target.files?.[0] || null);
                    setResult(null);
                  }}
                />
              </label>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Import Options</h2>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Sheets</label>
                  <div className="space-y-2">
                    {sheetChoices.map(sheet => (
                      <label key={sheet} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
                        <input
                          type="checkbox"
                          checked={selectedSheets.includes(sheet)}
                          onChange={() => handleSheetToggle(sheet)}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>{sheet}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
                  <span>Only import approved requests</span>
                  <input type="checkbox" checked={approvedOnly} onChange={event => setApprovedOnly(event.target.checked)} />
                </label>

                <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
                  <span>Skip dissolved courses</span>
                  <input type="checkbox" checked={skipDissolved} onChange={event => setSkipDissolved(event.target.checked)} />
                </label>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Time Anchor Date</label>
                  <input
                    type="date"
                    value={anchorDate}
                    onChange={event => setAnchorDate(event.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    The imported schedules are recurring. This date only anchors the stored time of day.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handlePreview}
                  disabled={isPreviewing || isImporting}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPreviewing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                  Preview
                </button>
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={!result || isPreviewing || isImporting || result.summary.valid === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isImporting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Import Valid Rows
                </button>
              </div>
            </div>
          </div>

          <div className="flex h-full flex-col space-y-5">
            {result ? (
              <>
                <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                  <ResultCard label="Valid" value={result.summary.valid} tone="border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200" />
                  <ResultCard label="Imported" value={result.summary.imported} tone="border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-900/60 dark:bg-indigo-950/30 dark:text-indigo-200" />
                  <ResultCard label="Problems" value={result.summary.invalid + result.summary.unknownRoom + result.summary.ambiguousRoom + result.summary.conflicts} tone="border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200" />
                  <ResultCard label="Skipped/Dupes" value={result.summary.skipped + result.summary.duplicates} tone="border-slate-200 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" />
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
                  <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                    <div>
                      <h2 className="text-lg font-bold">Rows Ready</h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Showing up to 80 valid/imported rows.</p>
                    </div>
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div className="max-h-[360px] overflow-auto">
                    <table className="min-w-full text-left">
                      <tbody>
                        {successfulRows.length > 0 ? successfulRows.map(row => <RowPreview key={`${row.sheetName}-${row.rowNumber}-${row.status}`} row={row} />) : (
                          <tr><td className="px-5 py-8 text-center text-sm text-slate-500">No valid rows yet.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
                  <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                    <div>
                      <h2 className="text-lg font-bold">Rows Needing Attention</h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Unknown rooms, conflicts, skipped rows, and duplicates are not imported.</p>
                    </div>
                    {problemRows.length > 0 ? <AlertTriangle className="h-5 w-5 text-amber-500" /> : <XCircle className="h-5 w-5 text-slate-400" />}
                  </div>
                  <div className="max-h-[420px] overflow-auto">
                    <table className="min-w-full text-left">
                      <tbody>
                        {problemRows.length > 0 ? problemRows.map(row => <RowPreview key={`${row.sheetName}-${row.rowNumber}-${row.status}`} row={row} />) : (
                          <tr><td className="px-5 py-8 text-center text-sm text-slate-500">No problem rows in this preview.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-1 min-h-[560px] items-center justify-center rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <div>
                  <FileSpreadsheet className="mx-auto h-14 w-14 text-slate-400" />
                  <h2 className="mt-4 text-xl font-bold">No preview yet</h2>
                  <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
                    Choose an offered-courses workbook and click Preview. The import will not write schedules until you confirm.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
