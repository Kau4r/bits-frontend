import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Plus, X } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';

export type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
export type RecurrenceEndType = 'NEVER' | 'ON_DATE' | 'AFTER_COUNT';
export type MonthlyMode = 'BYMONTHDAY' | 'BYSETPOS';

export interface RecurrenceConfig {
    frequency: RecurrenceFrequency;
    interval: number;
    byDay: number[];          // 0=Sun … 6=Sat (used by WEEKLY and BY*POS)
    monthlyMode: MonthlyMode; // for MONTHLY + YEARLY
    byMonthDay: number;       // 1-31
    setPos: number;           // 1,2,3,4,-1
    byMonth: number;          // 1-12 (for YEARLY)
    endType: RecurrenceEndType;
    endDate: string;          // YYYY-MM-DD
    endCount: number;
    excludedDates: string[];  // YYYY-MM-DD
}

interface ConflictItem {
    when: string;       // ISO datetime of the offending occurrence
    reason: string;
}

interface RecurrenceModalProps {
    isOpen: boolean;
    anchorStart: Date;       // first occurrence start (drives time-of-day + defaults)
    anchorEnd?: Date;        // first occurrence end — used for live conflict checks
    initial?: Partial<RecurrenceConfig>;
    conflicts?: ConflictItem[];   // when set, replaces the preview pane with a fixable conflicts list
    // Live client-side conflict check. Returns a reason string when the
    // (start, end) pair overlaps a known class schedule or approved booking
    // for the target room. The preview pane uses this to flag bad dates in
    // red BEFORE the user submits, so they don't have to round-trip the 409.
    checkConflict?: (start: Date, end: Date) => string | null;
    onClose: () => void;
    onSave: (config: RecurrenceConfig, rrule: string) => void;
}

const DAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const;
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTH_LABELS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] as const;
const SETPOS_OPTIONS = [
    { value: 1, label: 'first' },
    { value: 2, label: 'second' },
    { value: 3, label: 'third' },
    { value: 4, label: 'fourth' },
    { value: -1, label: 'last' },
];

const pad = (n: number) => String(n).padStart(2, '0');
const toYmd = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const buildDefault = (anchor: Date): RecurrenceConfig => ({
    frequency: 'WEEKLY',
    interval: 1,
    byDay: [anchor.getDay()],
    monthlyMode: 'BYMONTHDAY',
    byMonthDay: anchor.getDate(),
    setPos: Math.min(4, Math.ceil(anchor.getDate() / 7)),
    byMonth: anchor.getMonth() + 1,
    endType: 'NEVER',
    endDate: toYmd(new Date(anchor.getFullYear(), anchor.getMonth() + 3, anchor.getDate())),
    endCount: 10,
    excludedDates: [],
});

const buildRrule = (cfg: RecurrenceConfig): string => {
    const parts: string[] = [`FREQ=${cfg.frequency}`];
    if (cfg.interval > 1) parts.push(`INTERVAL=${cfg.interval}`);

    if (cfg.frequency === 'WEEKLY' && cfg.byDay.length > 0) {
        parts.push(`BYDAY=${[...cfg.byDay].sort().map(d => DAY_CODES[d]).join(',')}`);
    }

    if (cfg.frequency === 'MONTHLY') {
        if (cfg.monthlyMode === 'BYSETPOS' && cfg.byDay.length > 0) {
            parts.push(`BYDAY=${cfg.byDay.map(d => `${cfg.setPos}${DAY_CODES[d]}`).join(',')}`);
        } else {
            parts.push(`BYMONTHDAY=${cfg.byMonthDay}`);
        }
    }

    if (cfg.frequency === 'YEARLY') {
        parts.push(`BYMONTH=${cfg.byMonth}`);
        if (cfg.monthlyMode === 'BYSETPOS' && cfg.byDay.length > 0) {
            parts.push(`BYDAY=${cfg.byDay.map(d => `${cfg.setPos}${DAY_CODES[d]}`).join(',')}`);
        } else {
            parts.push(`BYMONTHDAY=${cfg.byMonthDay}`);
        }
    }

    if (cfg.endType === 'ON_DATE' && cfg.endDate) {
        parts.push(`UNTIL=${cfg.endDate.replace(/-/g, '')}T235959Z`);
    } else if (cfg.endType === 'AFTER_COUNT' && cfg.endCount > 0) {
        parts.push(`COUNT=${cfg.endCount}`);
    }

    return parts.join(';');
};

const nthWeekdayOfMonth = (year: number, month: number, weekday: number, n: number): Date | null => {
    if (n === -1) {
        const last = new Date(year, month + 1, 0);
        const offset = (last.getDay() - weekday + 7) % 7;
        return new Date(year, month, last.getDate() - offset);
    }
    const first = new Date(year, month, 1);
    const offset = (weekday - first.getDay() + 7) % 7;
    const day = 1 + offset + (n - 1) * 7;
    const result = new Date(year, month, day);
    if (result.getMonth() !== month) return null;
    return result;
};

// Lightweight client-side expander used only for the modal's preview list.
// The backend will be the source of truth when actually creating the series.
const expandRecurrence = (cfg: RecurrenceConfig, anchor: Date, maxCount = 8): Date[] => {
    const results: Date[] = [];
    const endDate = cfg.endType === 'ON_DATE' && cfg.endDate
        ? new Date(`${cfg.endDate}T23:59:59`)
        : null;
    const cap = cfg.endType === 'AFTER_COUNT' && cfg.endCount > 0
        ? Math.min(cfg.endCount, maxCount)
        : maxCount;

    const bound = new Date(anchor);
    bound.setFullYear(bound.getFullYear() + 5);
    const excluded = new Set(cfg.excludedDates);
    const interval = Math.max(1, cfg.interval);

    const push = (occ: Date) => {
        if (occ < anchor) return false;
        if (endDate && occ > endDate) return false;
        if (occ > bound) return false;
        if (excluded.has(toYmd(occ))) return true; // skipped, but loop continues
        results.push(occ);
        return true;
    };

    if (cfg.frequency === 'DAILY') {
        const d = new Date(anchor);
        while (results.length < cap && d <= bound) {
            if (!push(new Date(d))) break;
            d.setDate(d.getDate() + interval);
        }
    } else if (cfg.frequency === 'WEEKLY') {
        const days = cfg.byDay.length > 0 ? [...cfg.byDay].sort() : [anchor.getDay()];
        const weekStart = new Date(anchor);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        weekStart.setHours(0, 0, 0, 0);
        while (results.length < cap && weekStart <= bound) {
            for (const day of days) {
                const occ = new Date(weekStart);
                occ.setDate(weekStart.getDate() + day);
                occ.setHours(anchor.getHours(), anchor.getMinutes(), 0, 0);
                if (!push(occ)) break;
                if (results.length >= cap) break;
            }
            weekStart.setDate(weekStart.getDate() + 7 * interval);
        }
    } else if (cfg.frequency === 'MONTHLY') {
        const cursor = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
        while (results.length < cap && cursor <= bound) {
            let occ: Date | null;
            if (cfg.monthlyMode === 'BYSETPOS' && cfg.byDay.length > 0) {
                occ = nthWeekdayOfMonth(cursor.getFullYear(), cursor.getMonth(), cfg.byDay[0], cfg.setPos);
            } else {
                occ = new Date(cursor.getFullYear(), cursor.getMonth(), cfg.byMonthDay);
                if (occ.getMonth() !== cursor.getMonth()) occ = null;
            }
            if (occ) {
                occ.setHours(anchor.getHours(), anchor.getMinutes(), 0, 0);
                if (!push(occ)) break;
            }
            cursor.setMonth(cursor.getMonth() + interval);
        }
    } else if (cfg.frequency === 'YEARLY') {
        const cursor = new Date(anchor.getFullYear(), cfg.byMonth - 1, 1);
        while (results.length < cap && cursor <= bound) {
            let occ: Date | null;
            if (cfg.monthlyMode === 'BYSETPOS' && cfg.byDay.length > 0) {
                occ = nthWeekdayOfMonth(cursor.getFullYear(), cursor.getMonth(), cfg.byDay[0], cfg.setPos);
            } else {
                occ = new Date(cursor.getFullYear(), cursor.getMonth(), cfg.byMonthDay);
                if (occ.getMonth() !== cursor.getMonth()) occ = null;
            }
            if (occ) {
                occ.setHours(anchor.getHours(), anchor.getMinutes(), 0, 0);
                if (!push(occ)) break;
            }
            cursor.setFullYear(cursor.getFullYear() + interval);
        }
    }

    return results;
};

const formatPreview = (d: Date) =>
    d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

export default function RecurrenceModal({
    isOpen,
    anchorStart,
    anchorEnd,
    initial,
    conflicts,
    checkConflict,
    onClose,
    onSave,
}: RecurrenceModalProps) {
    const [config, setConfig] = useState<RecurrenceConfig>(() => ({
        ...buildDefault(anchorStart),
        ...initial,
    }));
    const dialogRef = useRef<HTMLDivElement>(null);
    useFocusTrap(dialogRef, isOpen);

    const [excludeDraft, setExcludeDraft] = useState('');

    useEffect(() => {
        if (isOpen) {
            setConfig({ ...buildDefault(anchorStart), ...initial });
            setExcludeDraft('');
        }
    }, [isOpen, anchorStart]);

    // Auto-skip conflicting dates as soon as conflicts are provided so the
    // user can click Done immediately without manually hitting every Skip button.
    useEffect(() => {
        if (!isOpen || !conflicts || conflicts.length === 0) return;
        const conflictDates = conflicts.map(c => toYmd(new Date(c.when)));
        setConfig(prev => {
            const merged = Array.from(new Set([...prev.excludedDates, ...conflictDates])).sort();
            if (
                merged.length === prev.excludedDates.length &&
                merged.every((d, i) => d === prev.excludedDates[i])
            ) return prev;
            return { ...prev, excludedDates: merged };
        });
    }, [isOpen, conflicts]);

    const rrule = useMemo(() => buildRrule(config), [config]);
    const preview = useMemo(() => expandRecurrence(config, anchorStart, 8), [config, anchorStart]);

    if (!isOpen) return null;

    const update = (patch: Partial<RecurrenceConfig>) =>
        setConfig(prev => ({ ...prev, ...patch }));

    const toggleByDay = (day: number) =>
        setConfig(prev => {
            const next = prev.byDay.includes(day)
                ? prev.byDay.filter(d => d !== day)
                : [...prev.byDay, day];
            return { ...prev, byDay: next.length > 0 ? next : prev.byDay };
        });

    const addExcludedDate = () => {
        const trimmed = excludeDraft.trim();
        if (!trimmed) return;
        if (config.excludedDates.includes(trimmed)) return;
        update({ excludedDates: [...config.excludedDates, trimmed].sort() });
        setExcludeDraft('');
    };

    const removeExcludedDate = (date: string) => {
        update({ excludedDates: config.excludedDates.filter(d => d !== date) });
    };

    const handleSave = () => {
        // Parent receives the config AND is responsible for closing the modal.
        // Doing it here would race the parent's state update — the next render
        // could read a stale `recurrenceConfig` and reset the repeat selector.
        onSave(config, rrule);
    };

    const showByDay = config.frequency === 'WEEKLY';
    const showMonthlyControls = config.frequency === 'MONTHLY' || config.frequency === 'YEARLY';
    const showYearMonth = config.frequency === 'YEARLY';

    return createPortal(
        <div
            className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]"
            data-recurrence-modal="true"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={onClose}
        >
            <div
                ref={dialogRef}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-label="Custom recurrence"
                className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/30 dark:border-white/10 dark:bg-[#111827]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/90 px-5 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                    <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200">Custom recurrence</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="grid h-9 w-9 place-items-center rounded-full text-slate-500 transition hover:bg-slate-200 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                        aria-label="Close"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-y-auto px-6 py-5 lg:grid-cols-[1fr_240px]">
                    <div className="space-y-5">
                        {/* Frequency + interval */}
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Repeat every</span>
                            <input
                                type="number"
                                min={1}
                                max={99}
                                value={config.interval}
                                onChange={(e) => update({ interval: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                                className="w-20 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
                            />
                            <select
                                value={config.frequency}
                                onChange={(e) => update({ frequency: e.target.value as RecurrenceFrequency })}
                                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
                            >
                                <option value="DAILY">day{config.interval !== 1 ? 's' : ''}</option>
                                <option value="WEEKLY">week{config.interval !== 1 ? 's' : ''}</option>
                                <option value="MONTHLY">month{config.interval !== 1 ? 's' : ''}</option>
                                <option value="YEARLY">year{config.interval !== 1 ? 's' : ''}</option>
                            </select>
                        </div>

                        {/* Weekly: BYDAY */}
                        {showByDay && (
                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Repeat on</label>
                                <div className="flex flex-wrap gap-2">
                                    {DAY_LABELS.map((label, idx) => {
                                        const active = config.byDay.includes(idx);
                                        return (
                                            <button
                                                key={label}
                                                type="button"
                                                onClick={() => toggleByDay(idx)}
                                                className={`grid h-9 w-9 place-items-center rounded-full text-xs font-semibold transition ${
                                                    active
                                                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/[0.06] dark:text-slate-300 dark:hover:bg-white/[0.1]'
                                                }`}
                                            >
                                                {label[0]}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Monthly / Yearly: monthly mode */}
                        {showMonthlyControls && (
                            <div className="space-y-3">
                                {showYearMonth && (
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">In</span>
                                        <select
                                            value={config.byMonth}
                                            onChange={(e) => update({ byMonth: parseInt(e.target.value, 10) })}
                                            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
                                        >
                                            {MONTH_LABELS.map((m, i) => (
                                                <option key={m} value={i + 1}>{m}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                                    <input
                                        type="radio"
                                        checked={config.monthlyMode === 'BYMONTHDAY'}
                                        onChange={() => update({ monthlyMode: 'BYMONTHDAY' })}
                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span>On day</span>
                                    <input
                                        type="number"
                                        min={1}
                                        max={31}
                                        value={config.byMonthDay}
                                        onChange={(e) => update({
                                            byMonthDay: Math.min(31, Math.max(1, parseInt(e.target.value, 10) || 1)),
                                            monthlyMode: 'BYMONTHDAY',
                                        })}
                                        className="w-20 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
                                    />
                                </label>

                                <label className="flex flex-wrap items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                                    <input
                                        type="radio"
                                        checked={config.monthlyMode === 'BYSETPOS'}
                                        onChange={() => update({
                                            monthlyMode: 'BYSETPOS',
                                            byDay: config.byDay.length > 0 ? [config.byDay[0]] : [anchorStart.getDay()],
                                        })}
                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span>On the</span>
                                    <select
                                        value={config.setPos}
                                        onChange={(e) => update({ setPos: parseInt(e.target.value, 10), monthlyMode: 'BYSETPOS' })}
                                        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
                                    >
                                        {SETPOS_OPTIONS.map((o) => (
                                            <option key={o.value} value={o.value}>{o.label}</option>
                                        ))}
                                    </select>
                                    <select
                                        value={config.byDay[0] ?? anchorStart.getDay()}
                                        onChange={(e) => update({ byDay: [parseInt(e.target.value, 10)], monthlyMode: 'BYSETPOS' })}
                                        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
                                    >
                                        {DAY_LABELS.map((d, i) => (
                                            <option key={d} value={i}>{d}day</option>
                                        ))}
                                    </select>
                                </label>
                            </div>
                        )}

                        {/* Ends */}
                        <fieldset className="space-y-2 border-t border-slate-200 pt-4 dark:border-white/10">
                            <legend className="text-sm font-medium text-slate-700 dark:text-slate-200">Ends</legend>

                            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                                <input
                                    type="radio"
                                    checked={config.endType === 'NEVER'}
                                    onChange={() => update({ endType: 'NEVER' })}
                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span>Never</span>
                            </label>

                            <label className="flex flex-wrap items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                                <input
                                    type="radio"
                                    checked={config.endType === 'ON_DATE'}
                                    onChange={() => update({ endType: 'ON_DATE' })}
                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span>On</span>
                                <input
                                    type="date"
                                    value={config.endDate}
                                    onChange={(e) => update({ endDate: e.target.value, endType: 'ON_DATE' })}
                                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
                                />
                            </label>

                            <label className="flex flex-wrap items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                                <input
                                    type="radio"
                                    checked={config.endType === 'AFTER_COUNT'}
                                    onChange={() => update({ endType: 'AFTER_COUNT' })}
                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span>After</span>
                                <input
                                    type="number"
                                    min={1}
                                    max={500}
                                    value={config.endCount}
                                    onChange={(e) => update({ endCount: Math.max(1, parseInt(e.target.value, 10) || 1), endType: 'AFTER_COUNT' })}
                                    className="w-20 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
                                />
                                <span>occurrence{config.endCount !== 1 ? 's' : ''}</span>
                            </label>
                        </fieldset>

                        {/* Excluded dates */}
                        <div className="border-t border-slate-200 pt-4 dark:border-white/10">
                            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                                Skip dates
                                <span className="ml-1 text-xs font-normal text-slate-500 dark:text-slate-400">(holidays, cancellations)</span>
                            </label>
                            <div className="flex flex-wrap items-center gap-2">
                                <input
                                    type="date"
                                    value={excludeDraft}
                                    onChange={(e) => setExcludeDraft(e.target.value)}
                                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
                                />
                                <button
                                    type="button"
                                    onClick={addExcludedDate}
                                    disabled={!excludeDraft}
                                    className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/[0.06] dark:text-slate-200 dark:hover:bg-white/[0.1]"
                                >
                                    <Plus className="h-4 w-4" />
                                    Add
                                </button>
                            </div>
                            {config.excludedDates.length > 0 && (
                                <ul className="mt-3 flex flex-wrap gap-2">
                                    {config.excludedDates.map((date) => (
                                        <li key={date}>
                                            <button
                                                type="button"
                                                onClick={() => removeExcludedDate(date)}
                                                className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 transition hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20"
                                            >
                                                {date}
                                                <X className="h-3 w-3" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    {/* Right pane: live preview, OR conflicts when the parent
                        has handed us a 409 response with per-occurrence reasons. */}
                    {conflicts && conflicts.length > 0 ? (
                        <aside className="flex flex-col rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-500/40 dark:bg-amber-500/10">
                            <div className="flex items-center justify-between gap-2">
                                <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-200">
                                    <AlertTriangle className="h-4 w-4" />
                                    {conflicts.length} conflict{conflicts.length === 1 ? '' : 's'}
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const skips = conflicts.map(c => toYmd(new Date(c.when)));
                                        const merged = Array.from(new Set([...config.excludedDates, ...skips])).sort();
                                        update({ excludedDates: merged });
                                    }}
                                    className="rounded-md bg-amber-600 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-sm transition hover:bg-amber-500"
                                >
                                    Skip all
                                </button>
                            </div>

                            <p className="mt-2 text-xs text-amber-800/80 dark:text-amber-200/80">
                                These occurrences clash with class schedules or other approved bookings. Skip them or change the rule above, then click Done to retry.
                            </p>

                            <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
                                {conflicts.map((c) => {
                                    const ymd = toYmd(new Date(c.when));
                                    const isAlreadySkipped = config.excludedDates.includes(ymd);
                                    return (
                                        <li key={`${c.when}-${c.reason}`} className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs text-slate-700 dark:border-amber-500/30 dark:bg-slate-900/50 dark:text-slate-200">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <p className="font-semibold">
                                                        {new Date(c.when).toLocaleString(undefined, {
                                                            weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                                                        })}
                                                    </p>
                                                    <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                                                        {c.reason}
                                                    </p>
                                                </div>
                                                {isAlreadySkipped ? (
                                                    <span className="shrink-0 rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                                                        Skipping
                                                    </span>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => update({ excludedDates: [...config.excludedDates, ymd].sort() })}
                                                        className="shrink-0 rounded-md border border-slate-300 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 transition hover:bg-slate-100 dark:border-white/20 dark:text-slate-300 dark:hover:bg-white/10"
                                                    >
                                                        Skip
                                                    </button>
                                                )}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </aside>
                    ) : (
                        <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-white/10 dark:bg-white/[0.03]">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Next occurrences</h3>
                            {preview.length === 0 ? (
                                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">No matching dates yet — adjust the rule above.</p>
                            ) : (() => {
                                const durationMs = anchorEnd
                                    ? Math.max(0, anchorEnd.getTime() - anchorStart.getTime())
                                    : 60 * 60 * 1000;
                                const previewWithFlags = preview.map((d) => {
                                    const dEnd = new Date(d.getTime() + durationMs);
                                    const reason = checkConflict ? checkConflict(d, dEnd) : null;
                                    return { d, reason };
                                });
                                const conflictCount = previewWithFlags.filter(p => p.reason).length;
                                return (
                                    <>
                                        {conflictCount > 0 && (
                                            <p className="mt-2 inline-flex items-center gap-1 rounded-md bg-red-100 px-2 py-1 text-[11px] font-semibold text-red-700 dark:bg-red-500/20 dark:text-red-200">
                                                <AlertTriangle className="h-3 w-3" />
                                                {conflictCount} of {preview.length} previewed conflict
                                            </p>
                                        )}
                                        <ol className="mt-2 space-y-1 text-slate-700 dark:text-slate-200">
                                            {previewWithFlags.map(({ d, reason }) => (
                                                <li
                                                    key={d.toISOString()}
                                                    className={`rounded-md px-2 py-1 text-xs ${
                                                        reason
                                                            ? 'bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-500/10 dark:text-red-200 dark:ring-red-500/30'
                                                            : ''
                                                    }`}
                                                >
                                                    <div className="flex items-start justify-between gap-1">
                                                        <div>
                                                            <div className="font-medium">{formatPreview(d)}</div>
                                                            {reason && (
                                                                <div className="mt-0.5 text-[10px] opacity-90">{reason}</div>
                                                            )}
                                                        </div>
                                                        {reason && (
                                                            <button
                                                                type="button"
                                                                onClick={() => update({ excludedDates: [...config.excludedDates, toYmd(d)].sort() })}
                                                                className="shrink-0 rounded border border-red-300 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700 transition hover:bg-red-100 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-500/20"
                                                            >
                                                                Skip
                                                            </button>
                                                        )}
                                                    </div>
                                                </li>
                                            ))}
                                        </ol>
                                    </>
                                );
                            })()}
                        </aside>
                    )}
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-200 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 transition hover:bg-indigo-500"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

export { buildRrule, expandRecurrence, buildDefault as buildDefaultRecurrence };
