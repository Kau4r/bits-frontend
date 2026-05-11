import { useEffect, useMemo, useState } from 'react';
import { Trophy, RefreshCw, Calendar } from 'lucide-react';
import { getLabTechLeaderboard, type LeaderboardEntry } from '@/services/dashboard';
import { useTicketEvents } from '@/hooks/useTicketEvents';
import { useBookingEvents } from '@/hooks/useBookingEvents';
import Table from '@/components/Table';
import { LoadingSkeleton } from '@/ui';

type SortKey = 'rank' | 'name' | 'borrowings' | 'bookings' | 'tickets' | 'total';
type SortDir = 'asc' | 'desc';

const rankBadge = (rank: number) => {
    if (rank === 1) return 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200';
    if (rank === 2) return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    if (rank === 3) return 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-200';
    return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
};

export default function LeaderboardPage() {
    const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [sortKey, setSortKey] = useState<SortKey>('total');
    const [sortDir, setSortDir] = useState<SortDir>('desc');

    const load = async () => {
        setLoading(true);
        try {
            const params: { from?: string; to?: string } = {};
            if (fromDate) params.from = new Date(fromDate).toISOString();
            if (toDate) params.to = new Date(toDate + 'T23:59:59').toISOString();
            const data = await getLabTechLeaderboard(params);
            setEntries(data.entries);
            setError(null);
        } catch (e: any) {
            setError(e?.response?.data?.error ?? 'Failed to load leaderboard');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Live updates from the same WebSocket channels that drive the underlying counts
    useTicketEvents(load);
    useBookingEvents(load);

    const ranked = useMemo(() => {
        if (!entries) return [];
        // Sort by total desc first to lock in rank, then resort by chosen key
        const withRank = [...entries]
            .sort((a, b) => b.total - a.total)
            .map((e, i) => ({ ...e, rank: i + 1 }));
        const dir = sortDir === 'asc' ? 1 : -1;
        return [...withRank].sort((a, b) => {
            switch (sortKey) {
                case 'rank': return (a.rank - b.rank) * dir;
                case 'name': return a.Name.localeCompare(b.Name) * dir;
                case 'borrowings': return (a.borrowings - b.borrowings) * dir;
                case 'bookings': return (a.bookings - b.bookings) * dir;
                case 'tickets': return (a.tickets - b.tickets) * dir;
                case 'total':
                default:
                    return (a.total - b.total) * dir;
            }
        });
    }, [entries, sortKey, sortDir]);

    const totals = useMemo(() => ({
        techs: ranked.length,
        handled: ranked.reduce((s, e) => s + e.total, 0),
        borrowings: ranked.reduce((s, e) => s + e.borrowings, 0),
        bookings: ranked.reduce((s, e) => s + e.bookings, 0),
        tickets: ranked.reduce((s, e) => s + e.tickets, 0),
    }), [ranked]);

    const toggleSort = (key: SortKey) => {
        if (key === sortKey) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir(key === 'name' ? 'asc' : 'desc');
        }
    };

    const sortArrow = (key: SortKey) => (sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '');

    const headers = useMemo(() => [
        { label: `Rank${sortArrow('rank')}`, align: 'left' as const, onClick: () => toggleSort('rank') },
        { label: `Name${sortArrow('name')}`, align: 'left' as const, onClick: () => toggleSort('name') },
        { label: 'Role', align: 'left' as const },
        { label: `Borrowings${sortArrow('borrowings')}`, align: 'right' as const, onClick: () => toggleSort('borrowings') },
        { label: `Bookings${sortArrow('bookings')}`, align: 'right' as const, onClick: () => toggleSort('bookings') },
        { label: `Tickets${sortArrow('tickets')}`, align: 'right' as const, onClick: () => toggleSort('tickets') },
        { label: `Total${sortArrow('total')}`, align: 'right' as const, onClick: () => toggleSort('total') },
        // eslint-disable-next-line react-hooks/exhaustive-deps
    ], [sortKey, sortDir]);

    return (
        <main className="flex h-full w-full flex-col bg-white p-6 dark:bg-gray-900 sm:px-8 lg:px-10">
            <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
                        <Trophy className="h-7 w-7 text-amber-500" />
                        Lab Tech Leaderboard
                    </h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Volume of requests handled per lab tech. Counts include approvals, rejections, and ticket actions performed by each user.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => void load()}
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </header>

            <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Active Lab Techs</p>
                    <p className="mt-1 text-2xl font-black text-gray-900 dark:text-white">{totals.techs}</p>
                </div>
                <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 shadow-sm dark:border-purple-500/30 dark:bg-purple-500/10">
                    <p className="text-xs font-semibold uppercase tracking-wide text-purple-700 dark:text-purple-200">Borrowings handled</p>
                    <p className="mt-1 text-2xl font-black text-purple-900 dark:text-purple-100">{totals.borrowings}</p>
                </div>
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 shadow-sm dark:border-blue-500/30 dark:bg-blue-500/10">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-200">Bookings handled</p>
                    <p className="mt-1 text-2xl font-black text-blue-900 dark:text-blue-100">{totals.bookings}</p>
                </div>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 shadow-sm dark:border-emerald-500/30 dark:bg-emerald-500/10">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-200">Tickets handled</p>
                    <p className="mt-1 text-2xl font-black text-emerald-900 dark:text-emerald-100">{totals.tickets}</p>
                </div>
            </section>

            <section className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Filter by date</span>
                </div>
                <label className="flex flex-col text-xs font-medium text-gray-500 dark:text-gray-400">
                    From
                    <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="mt-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                    />
                </label>
                <label className="flex flex-col text-xs font-medium text-gray-500 dark:text-gray-400">
                    To
                    <input
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className="mt-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                    />
                </label>
                <button
                    type="button"
                    onClick={() => void load()}
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                >
                    Apply
                </button>
                {(fromDate || toDate) && (
                    <button
                        type="button"
                        onClick={() => { setFromDate(''); setToDate(''); setTimeout(load, 0); }}
                        className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                    >
                        Clear
                    </button>
                )}
            </section>

            {error && (
                <p className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</p>
            )}

            <section className="min-h-0 flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                {loading && entries === null ? (
                    <LoadingSkeleton type="table-rows" columns={7} rows={5} className="flex-1" />
                ) : ranked.length === 0 ? (
                    <div className="flex h-full items-center justify-center p-10 text-center text-sm text-gray-500 dark:text-gray-400">
                        No activity recorded{fromDate || toDate ? ' for the selected range' : ''}.
                    </div>
                ) : (
                    <Table headers={headers} columnWidths="0.6fr 1.4fr 0.9fr 1fr 1fr 1fr 0.8fr" density="compact">
                        {ranked.map((e) => (
                            <div key={e.User_ID} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${rankBadge(e.rank)}`}>
                                    {e.rank}
                                </span>
                                <span className="text-sm font-semibold text-gray-900 dark:text-white">{e.Name}</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {e.User_Role === 'LAB_HEAD' ? 'Lab Head' : 'Lab Tech'}
                                </span>
                                <span className="text-right text-sm font-medium text-gray-900 dark:text-white">{e.borrowings}</span>
                                <span className="text-right text-sm font-medium text-gray-900 dark:text-white">{e.bookings}</span>
                                <span className="text-right text-sm font-medium text-gray-900 dark:text-white">{e.tickets}</span>
                                <span className="text-right text-base font-black text-indigo-600 dark:text-indigo-300">{e.total}</span>
                            </div>
                        ))}
                    </Table>
                )}
            </section>
        </main>
    );
}
