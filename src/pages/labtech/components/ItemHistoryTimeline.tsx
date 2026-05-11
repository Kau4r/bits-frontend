import { useEffect, useState } from 'react';
import { History as HistoryIcon, RefreshCw } from 'lucide-react';
import { getItemHistory, type ItemHistoryEntry } from '@/services/inventory';

const ACTION_LABELS: Record<string, string> = {
    CREATED: 'Created',
    UPDATED: 'Updated',
    STATUS_CHANGED: 'Status changed',
    MOVED_ROOM: 'Moved to a new room',
    BORROWED: 'Borrowed',
    RETURNED: 'Returned',
    MARKED_DEFECTIVE: 'Marked defective',
    REPLACED: 'Replaced',
    DISPOSED: 'Disposed',
    AUDITED: 'Audit confirmed',
    UNAUDITED: 'Audit cleared',
    ATTACHED_TO_PARENT: 'Attached to parent',
    DETACHED_FROM_PARENT: 'Detached from parent',
};

const ACTION_TONES: Record<string, string> = {
    CREATED: 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200',
    UPDATED: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
    STATUS_CHANGED: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200',
    MOVED_ROOM: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-200',
    BORROWED: 'bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-200',
    RETURNED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200',
    MARKED_DEFECTIVE: 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-200',
    REPLACED: 'bg-pink-100 text-pink-800 dark:bg-pink-500/20 dark:text-pink-200',
    DISPOSED: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200',
    AUDITED: 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-200',
    UNAUDITED: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
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

const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
};

const renderDiff = (entry: ItemHistoryEntry) => {
    const keys = new Set([
        ...Object.keys(entry.Old_Value ?? {}),
        ...Object.keys(entry.New_Value ?? {}),
    ]);
    if (keys.size === 0) return null;
    return (
        <ul className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-400">
            {[...keys].map((k) => {
                const oldV = entry.Old_Value?.[k];
                const newV = entry.New_Value?.[k];
                return (
                    <li key={k}>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{k}:</span>{' '}
                        <span className="line-through opacity-70">{formatValue(oldV)}</span>{' '}
                        <span className="text-slate-400">→</span>{' '}
                        <span className="font-semibold text-slate-900 dark:text-white">{formatValue(newV)}</span>
                    </li>
                );
            })}
        </ul>
    );
};

interface ItemHistoryTimelineProps {
    itemId: number;
    refreshSignal?: number;
}

export default function ItemHistoryTimeline({ itemId, refreshSignal }: ItemHistoryTimelineProps) {
    const [entries, setEntries] = useState<ItemHistoryEntry[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const data = await getItemHistory(itemId);
            setEntries(data.history);
            setError(null);
        } catch (e: any) {
            setError(e?.response?.data?.error ?? 'Failed to load history');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [itemId, refreshSignal]);

    return (
        <section className="rounded-lg border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/90">
            <header className="mb-3 flex items-center gap-2">
                <HistoryIcon className="h-5 w-5 text-indigo-500" />
                <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-700 dark:text-slate-300">
                    History
                </h2>
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
            </header>

            {error && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</p>
            )}

            {!error && entries === null && (
                <p className="text-sm text-slate-500 dark:text-slate-400">Loading history...</p>
            )}

            {!error && entries && entries.length === 0 && (
                <p className="text-sm text-slate-500 dark:text-slate-400">No history recorded yet.</p>
            )}

            {!error && entries && entries.length > 0 && (
                <ol className="relative space-y-3 border-l-2 border-slate-200 pl-4 dark:border-slate-700">
                    {entries.map((entry) => (
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
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                    {formatDateTime(entry.Created_At)}
                                </span>
                                {entry.Performed_By && (
                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                        by {entry.Performed_By.First_Name} {entry.Performed_By.Last_Name}
                                    </span>
                                )}
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
                            {entry.Parent_Item && (
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                    Parent: {entry.Parent_Item.Item_Code} ({entry.Parent_Item.Item_Type})
                                </p>
                            )}
                            {renderDiff(entry)}
                        </li>
                    ))}
                </ol>
            )}
        </section>
    );
}
