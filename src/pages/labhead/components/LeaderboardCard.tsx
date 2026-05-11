import { useEffect, useState, useCallback } from 'react';
import { Trophy } from 'lucide-react';
import { getLabTechLeaderboard, type LeaderboardEntry } from '@/services/dashboard';
import { useTicketEvents } from '@/hooks/useTicketEvents';
import { useBookingEvents } from '@/hooks/useBookingEvents';

const rankColors = [
    'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200',  // 1st
    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',         // 2nd
    'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-200', // 3rd
];

export default function LeaderboardCard() {
    const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            const data = await getLabTechLeaderboard();
            setEntries(data.entries);
            setError(null);
        } catch (e: any) {
            setError(e?.response?.data?.error ?? 'Failed to load leaderboard');
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    // Refresh on the same events that drive the underlying counts
    useTicketEvents(load);
    useBookingEvents(load);

    return (
        <section className="flex h-full min-h-0 flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-3 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                <h2 className="text-sm font-bold text-gray-900 dark:text-white">Lab Tech Leaderboard</h2>
                <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">By requests handled</span>
            </div>

            {error && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</p>
            )}

            {entries === null && !error && (
                <p className="text-xs text-gray-500 dark:text-gray-400">Loading...</p>
            )}

            {entries && entries.length === 0 && !error && (
                <p className="text-xs text-gray-500 dark:text-gray-400">No activity yet.</p>
            )}

            {entries && entries.length > 0 && (
                <ul className="flex flex-col gap-2 overflow-y-auto">
                    {entries.map((e, idx) => (
                        <li
                            key={e.User_ID}
                            className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-900/40"
                        >
                            <span
                                className={`inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                    rankColors[idx] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                }`}
                            >
                                {idx + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{e.Name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {e.User_Role === 'LAB_HEAD' ? 'Lab Head' : 'Lab Tech'} · {e.borrowings} borrow · {e.bookings} booking · {e.tickets} ticket
                                </p>
                            </div>
                            <span className="text-base font-black text-indigo-600 dark:text-indigo-300">{e.total}</span>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
