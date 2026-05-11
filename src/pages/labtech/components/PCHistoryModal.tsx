import { createPortal } from 'react-dom';
import { useEffect, useRef, useState } from 'react';
import { History as HistoryIcon, RefreshCw, X, Monitor } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { getComputerHistory, type ComputerHistoryEntry } from '@/services/computers';
import { formatItemType } from '@/lib/utils';

interface PCHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    computerId: number;
    pcName?: string;
    roomName?: string;
}

const ACTION_LABELS: Record<string, string> = {
    ATTACHED_TO_PARENT: 'Component attached',
    DETACHED_FROM_PARENT: 'Component detached',
    BORROWED: 'Borrowed out',
    RETURNED: 'Returned',
    MARKED_DEFECTIVE: 'Marked defective',
    STATUS_CHANGED: 'Status changed',
    UPDATED: 'Updated',
    REPLACED: 'Replaced',
    DISPOSED: 'Disposed',
};

const ACTION_TONES: Record<string, string> = {
    ATTACHED_TO_PARENT: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200',
    DETACHED_FROM_PARENT: 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-200',
    MARKED_DEFECTIVE: 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-200',
    REPLACED: 'bg-pink-100 text-pink-800 dark:bg-pink-500/20 dark:text-pink-200',
    DISPOSED: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200',
    STATUS_CHANGED: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200',
    UPDATED: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
    BORROWED: 'bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-200',
    RETURNED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200',
};

const formatDateTime = (iso: string) => {
    try {
        return new Intl.DateTimeFormat('en-PH', {
            dateStyle: 'medium',
            timeStyle: 'short',
            hour12: true,
        }).format(new Date(iso));
    } catch {
        return iso;
    }
};

export default function PCHistoryModal({
    isOpen,
    onClose,
    computerId,
    pcName,
    roomName,
}: PCHistoryModalProps) {
    const dialogRef = useRef<HTMLDivElement>(null);
    useFocusTrap(dialogRef, isOpen);

    const [entries, setEntries] = useState<ComputerHistoryEntry[] | null>(null);
    const [resolvedName, setResolvedName] = useState<string | null>(pcName ?? null);
    const [resolvedRoom, setResolvedRoom] = useState<string | null>(roomName ?? null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const data = await getComputerHistory(computerId);
            setEntries(data.history);
            setResolvedName(data.computer?.Name ?? pcName ?? null);
            setResolvedRoom(data.computer?.Room?.Name ?? roomName ?? null);
            setError(null);
        } catch (e: any) {
            setError(e?.response?.data?.error ?? 'Failed to load history');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            void load();
        } else {
            setEntries(null);
            setError(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, computerId]);

    if (!isOpen) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[60] grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={onClose}
            role="presentation"
        >
            <div
                ref={dialogRef}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-labelledby="pc-history-title"
                className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="relative border-b border-gray-200 bg-gradient-to-br from-indigo-50 to-white px-6 py-5 dark:border-gray-700 dark:from-indigo-500/5 dark:to-gray-900">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <div className="rounded-xl bg-indigo-100 p-2.5 ring-1 ring-indigo-200 dark:bg-indigo-500/15 dark:ring-indigo-500/30">
                                <Monitor className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
                            </div>
                            <div className="min-w-0">
                                <h2 id="pc-history-title" className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
                                    PC History
                                </h2>
                                {resolvedName && (
                                    <p className="mt-0.5 text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                                        {resolvedName}
                                    </p>
                                )}
                                <p className="mt-0.5 truncate text-xs text-gray-600 dark:text-gray-400">
                                    {resolvedRoom ? `Room: ${resolvedRoom} · ` : ''}Component attach &amp; detach trail
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close history"
                            className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto px-6 py-5">
                    <div className="mb-3 flex items-center gap-2">
                        <HistoryIcon className="h-4 w-4 text-indigo-500" />
                        <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-700 dark:text-slate-300">Timeline</h3>
                        <button
                            type="button"
                            onClick={() => void load()}
                            disabled={loading}
                            className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
                            aria-label="Refresh history"
                            title="Refresh"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    {error && (
                        <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</p>
                    )}

                    {!error && entries === null && (
                        <p className="text-sm text-slate-500 dark:text-slate-400">Loading history...</p>
                    )}

                    {!error && entries && entries.length === 0 && (
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            No history recorded yet. Attach or detach a component to start the trail.
                        </p>
                    )}

                    {!error && entries && entries.length > 0 && (
                        <ol className="relative space-y-3 border-l-2 border-slate-200 pl-4 dark:border-slate-700">
                            {entries.map((entry) => {
                                const item = entry.Item;
                                const itemLabel = item
                                    ? `${formatItemType(item.Item_Type) || item.Item_Type || 'Component'} · ${item.Item_Code}`
                                    : 'Component';
                                return (
                                    <li key={entry.Item_History_ID} className="relative">
                                        <span className="absolute -left-[21px] top-1.5 h-3 w-3 rounded-full bg-indigo-500 ring-2 ring-white dark:ring-slate-900" />
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span
                                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                                                    ACTION_TONES[entry.Action] ?? 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                                                }`}
                                            >
                                                {ACTION_LABELS[entry.Action] ?? entry.Action}
                                            </span>
                                            <span className="text-sm font-semibold text-slate-900 dark:text-white">{itemLabel}</span>
                                        </div>
                                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                                            <span>{formatDateTime(entry.Created_At)}</span>
                                            {entry.Performed_By && (
                                                <span>by {entry.Performed_By.First_Name} {entry.Performed_By.Last_Name}</span>
                                            )}
                                            {item?.Serial_Number && <span>SN {item.Serial_Number}</span>}
                                        </div>
                                        {entry.Reason && (
                                            <p className="mt-1 text-xs italic text-slate-600 dark:text-slate-400">
                                                Reason: {entry.Reason}
                                            </p>
                                        )}
                                        {entry.Notes && (
                                            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                                                {entry.Notes}
                                            </p>
                                        )}
                                    </li>
                                );
                            })}
                        </ol>
                    )}
                </div>

                <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 px-6 py-3 dark:border-gray-700 dark:bg-gray-900/60">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Read-only. Logs every component attach/detach for this PC.
                    </p>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                    >
                        Close
                    </button>
                </footer>
            </div>
        </div>,
        document.body
    );
}
