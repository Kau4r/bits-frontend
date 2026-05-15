import { useEffect, useMemo, useRef, useState } from 'react';
import { Trophy, RefreshCw, Calendar, Check, ChevronDown } from 'lucide-react';
import { getLabTechLeaderboard, type LeaderboardEntry } from '@/services/dashboard';
import { useTicketEvents } from '@/hooks/useTicketEvents';
import { useBookingEvents } from '@/hooks/useBookingEvents';
import Table from '@/components/Table';
import { LoadingSkeleton } from '@/ui';

type SortKey = 'rank' | 'name' | 'borrowings' | 'bookings' | 'tickets' | 'total';
type SortDir = 'asc' | 'desc';

type Period =
    | 'this_month'
    | 'last_month'
    | 'this_quarter'
    | 'this_year'
    | 'all_time'
    | 'specific_month';

const PRESET_LABELS: Record<Exclude<Period, 'specific_month'>, string> = {
    this_month: 'This month',
    last_month: 'Last month',
    this_quarter: 'This quarter',
    this_year: 'This year',
    all_time: 'All time',
};

const PRESETS: Exclude<Period, 'specific_month'>[] = [
    'this_month',
    'last_month',
    'this_quarter',
    'this_year',
    'all_time',
];

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const endOfDay = (d: Date) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };

const computePresetRange = (period: Exclude<Period, 'specific_month'>): { from: Date | null; to: Date | null } => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    switch (period) {
        case 'this_month':
            return { from: startOfDay(new Date(y, m, 1)), to: endOfDay(now) };
        case 'last_month': {
            const start = new Date(y, m - 1, 1);
            const end = new Date(y, m, 0);
            return { from: startOfDay(start), to: endOfDay(end) };
        }
        case 'this_quarter': {
            const qStart = Math.floor(m / 3) * 3;
            return { from: startOfDay(new Date(y, qStart, 1)), to: endOfDay(now) };
        }
        case 'this_year':
            return { from: startOfDay(new Date(y, 0, 1)), to: endOfDay(now) };
        case 'all_time':
        default:
            return { from: null, to: null };
    }
};

const computeSpecificMonthRange = (year: number, month: number): { from: Date; to: Date } => ({
    from: startOfDay(new Date(year, month, 1)),
    to: endOfDay(new Date(year, month + 1, 0)),
});

const rankBadge = (rank: number) => {
    if (rank === 1) return 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200';
    if (rank === 2) return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    if (rank === 3) return 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-200';
    return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
};

export default function LeaderboardPage() {
    const now = useMemo(() => new Date(), []);
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [period, setPeriod] = useState<Period>('last_month');
    const [selectedYear, setSelectedYear] = useState<number>(currentYear);
    const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
    const [sortKey, setSortKey] = useState<SortKey>('total');
    const [sortDir, setSortDir] = useState<SortDir>('desc');
    const [filterOpen, setFilterOpen] = useState(false);
    const filterRef = useRef<HTMLDivElement>(null);

    const yearOptions = useMemo(() => {
        const years: number[] = [];
        for (let y = currentYear; y >= currentYear - 5; y--) years.push(y);
        return years;
    }, [currentYear]);

    const periodLabel =
        period === 'specific_month'
            ? `${MONTH_NAMES[selectedMonth]} ${selectedYear}`
            : PRESET_LABELS[period];

    const load = async () => {
        setLoading(true);
        try {
            const params: { from?: string; to?: string } = {};
            if (period === 'specific_month') {
                const r = computeSpecificMonthRange(selectedYear, selectedMonth);
                params.from = r.from.toISOString();
                params.to = r.to.toISOString();
            } else {
                const r = computePresetRange(period);
                if (r.from) params.from = r.from.toISOString();
                if (r.to) params.to = r.to.toISOString();
            }
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
    }, [period, selectedYear, selectedMonth]);

    // Live updates from the same WebSocket channels that drive the underlying counts
    useTicketEvents(load);
    useBookingEvents(load);

    useEffect(() => {
        if (!filterOpen) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
                setFilterOpen(false);
            }
        };
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setFilterOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKey);
        };
    }, [filterOpen]);

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

    const isFiltered = period !== 'all_time';

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
                <div className="flex items-center gap-2">
                    <div ref={filterRef} className="relative">
                        <button
                            type="button"
                            onClick={() => setFilterOpen(o => !o)}
                            aria-expanded={filterOpen}
                            aria-haspopup="dialog"
                            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${isFiltered
                                ? 'border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-200 dark:hover:bg-indigo-500/20'
                                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
                                }`}
                        >
                            <Calendar className="h-4 w-4" />
                            {periodLabel}
                            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {filterOpen && (
                            <div
                                role="dialog"
                                className="absolute right-0 top-full z-30 mt-2 w-72 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
                            >
                                <div className="border-b border-gray-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400">
                                    Period
                                </div>
                                <div className="flex flex-wrap gap-1.5 p-3">
                                    {PRESETS.map(p => (
                                        <button
                                            key={p}
                                            type="button"
                                            onClick={() => { setPeriod(p); setFilterOpen(false); }}
                                            className={`rounded-md border px-2 py-1 text-xs font-medium transition-colors ${period === p
                                                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-500/20 dark:text-indigo-100'
                                                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700/60'
                                                }`}
                                        >
                                            {PRESET_LABELS[p]}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex items-end gap-2 p-3 pt-2">
                                    <label className="flex flex-1 flex-col text-xs font-medium text-gray-500 dark:text-gray-400">
                                        Month
                                        <select
                                            value={selectedMonth}
                                            onChange={(e) => { setSelectedMonth(Number(e.target.value)); setPeriod('specific_month'); }}
                                            className="mt-1 rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                                        >
                                            {MONTH_NAMES.map((name, idx) => (
                                                <option key={idx} value={idx}>{name}</option>
                                            ))}
                                        </select>
                                    </label>
                                    <label className="flex w-24 flex-col text-xs font-medium text-gray-500 dark:text-gray-400">
                                        Year
                                        <select
                                            value={selectedYear}
                                            onChange={(e) => { setSelectedYear(Number(e.target.value)); setPeriod('specific_month'); }}
                                            className="mt-1 rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                                        >
                                            {yearOptions.map(y => (
                                                <option key={y} value={y}>{y}</option>
                                            ))}
                                        </select>
                                    </label>
                                </div>
                                {period === 'specific_month' && (
                                    <div className="flex items-center gap-1.5 px-3 pb-3 text-xs font-medium text-indigo-700 dark:text-indigo-200">
                                        <Check className="h-3.5 w-3.5" /> Showing {MONTH_NAMES[selectedMonth]} {selectedYear}
                                    </div>
                                )}
                                
                            </div>
                        )}
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
                </div>
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

            {error && (
                <p className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</p>
            )}

            <section className="min-h-0 flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                {loading && entries === null ? (
                    <LoadingSkeleton type="table-rows" columns={7} rows={5} className="flex-1" />
                ) : ranked.length === 0 ? (
                    <div className="flex h-full items-center justify-center p-10 text-center text-sm text-gray-500 dark:text-gray-400">
                        No activity recorded for {periodLabel.toLowerCase()}.
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
