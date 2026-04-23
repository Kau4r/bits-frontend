import { useEffect, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import {
    getPublicRoomSchedule,
    type PublicRoomSchedule,
    type PublicScheduleSlot,
} from '@/services/publicRooms';

interface RoomSchedule7DayDrawerProps {
    roomId: number | null;
    roomName?: string;
    onClose: () => void;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Fixed timeline window. Rooms rarely operate outside 7 AM – 9 PM, and a fixed range
// keeps the hourly grid consistent across all 7 days.
const DAY_START_HOUR = 7;
const DAY_END_HOUR = 21;
const HOUR_HEIGHT = 44; // px per hour
const TIMELINE_HEIGHT = (DAY_END_HOUR - DAY_START_HOUR) * HOUR_HEIGHT;

const formatTimeRange = (startIso: string, endIso: string) => {
    const start = new Date(startIso);
    const end = new Date(endIso);
    return `${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
};

const formatDateLabel = (dateStr: string, dayOfWeek: number) => {
    // dateStr is YYYY-MM-DD in local (PH) time — safe to split rather than Date() to avoid tz shift.
    const [y, m, d] = dateStr.split('-').map(n => parseInt(n, 10));
    if (!y || !m || !d) return dateStr;
    return `${DAY_NAMES[dayOfWeek] ?? ''}, ${m}/${d}/${y}`;
};

const slotChip = (slot: PublicScheduleSlot) => {
    if (slot.sources.length === 0) {
        return {
            label: 'Available',
            className: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
        };
    }
    // Prefer SCHEDULE over BOOKING when both overlap.
    const schedule = slot.sources.find(s => s.source === 'SCHEDULE');
    if (schedule) {
        return {
            label: `Class: ${schedule.title || 'Scheduled'}`,
            className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
        };
    }
    const booking = slot.sources.find(s => s.source === 'BOOKING');
    return {
        label: `Booked: ${booking?.title || 'Reserved'}`,
        className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    };
};

const buildScheduleBlocks = (slots: PublicScheduleSlot[]) => {
    const blocks: Array<{
        key: string;
        startIso: string;
        endIso: string;
        chip: ReturnType<typeof slotChip>;
    }> = [];

    slots.forEach(slot => {
        const chip = slotChip(slot);
        const last = blocks[blocks.length - 1];
        if (last && last.chip.label === chip.label && last.chip.className === chip.className && last.endIso === slot.startIso) {
            last.endIso = slot.endIso;
            return;
        }

        blocks.push({
            key: slot.startIso,
            startIso: slot.startIso,
            endIso: slot.endIso,
            chip,
        });
    });

    return blocks;
};

// Convert a Date to fractional hours since local midnight. Used to place blocks on the timeline.
const hoursSinceMidnight = (iso: string) => {
    const d = new Date(iso);
    return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
};

// Returns { top, height } in px for a block, clamped to the visible window.
// Returns null when the block falls entirely outside the window.
const positionBlock = (startIso: string, endIso: string) => {
    const startH = Math.max(hoursSinceMidnight(startIso), DAY_START_HOUR);
    const endH = Math.min(hoursSinceMidnight(endIso), DAY_END_HOUR);
    if (endH <= startH) return null;
    const top = (startH - DAY_START_HOUR) * HOUR_HEIGHT;
    const height = (endH - startH) * HOUR_HEIGHT;
    return { top, height };
};

const HOUR_MARKS = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR + 1 }, (_, i) => DAY_START_HOUR + i);
const formatHourLabel = (h: number) => {
    const hour12 = ((h + 11) % 12) + 1;
    const period = h < 12 || h === 24 ? 'AM' : 'PM';
    return `${hour12} ${period}`;
};

export default function RoomSchedule7DayDrawer({ roomId, roomName, onClose }: RoomSchedule7DayDrawerProps) {
    const [schedule, setSchedule] = useState<PublicRoomSchedule | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (roomId == null) return;

        let isMounted = true;
        const fetchSchedule = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const data = await getPublicRoomSchedule(roomId);
                if (isMounted) setSchedule(data);
            } catch (err) {
                console.error('Failed to fetch schedule:', err);
                if (isMounted) setError('Failed to load schedule. Please try again.');
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        fetchSchedule();
        return () => {
            isMounted = false;
        };
    }, [roomId]);

    if (roomId == null) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={onClose}
                aria-label="Close schedule"
            />

            {/* Sheet */}
            <div
                className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-2xl shadow-xl flex flex-col"
                style={{ maxHeight: '85vh' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-700">
                    <div className="min-w-0">
                        <h2 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                            {roomName || schedule?.room?.Name || 'Room schedule'}
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Today</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Legend */}
                <div className="px-4 py-2 border-b border-gray-200 dark:border-slate-700 flex items-center gap-3 text-[11px]">
                    <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Available
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Class
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Booked
                    </span>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-4">
                    {isLoading && (
                        <div className="flex items-center justify-center py-10">
                            <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                            <span className="ml-2 text-sm text-gray-600 dark:text-gray-300">Loading schedule…</span>
                        </div>
                    )}

                    {error && !isLoading && (
                        <div className="py-6 text-center text-sm text-red-600 dark:text-red-300">{error}</div>
                    )}

                    {!isLoading && !error && schedule && (() => {
                        // Show only today's schedule. The backend still sends 7 days, but
                        // for the student mobile view we restrict to the current local date.
                        const now = new Date();
                        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                        const todaysDays = schedule.days.filter(d => d.date === todayStr);
                        if (todaysDays.length === 0) {
                            return (
                                <div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                                    No schedule for today.
                                </div>
                            );
                        }
                        return (
                        <div className="space-y-5 pt-3 pb-3">
                            {todaysDays.map(day => {
                                // Filter out "Available" chips — timeline shows only occupied blocks.
                                // Empty space on the grid == available.
                                const occupiedBlocks = buildScheduleBlocks(day.slots).filter(b => b.chip.label !== 'Available');
                                return (
                                    <div key={day.date}>
                                        <h3 className="sticky top-0 z-10 -mx-4 px-4 py-2 mb-2 text-sm font-semibold text-gray-900 dark:text-white bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-gray-100 dark:border-slate-800">
                                            {formatDateLabel(day.date, day.dayOfWeek)}
                                        </h3>
                                        <div
                                            className="relative grid grid-cols-[52px_minmax(0,1fr)] gap-2"
                                            style={{ height: `${TIMELINE_HEIGHT}px` }}
                                        >
                                            {/* Hour labels (left rail) */}
                                            <div className="relative">
                                                {HOUR_MARKS.map((h, idx) => (
                                                    <span
                                                        key={h}
                                                        className="absolute right-0 -translate-y-1/2 pr-1 text-[11px] font-semibold tabular-nums text-gray-400 dark:text-gray-500"
                                                        style={{ top: `${idx * HOUR_HEIGHT}px` }}
                                                    >
                                                        {formatHourLabel(h)}
                                                    </span>
                                                ))}
                                            </div>

                                            {/* Timeline grid + positioned event blocks */}
                                            <div className="relative rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50/70 dark:bg-slate-800/60 overflow-hidden">
                                                {/* Hour gridlines */}
                                                {HOUR_MARKS.slice(1, -1).map((h, idx) => (
                                                    <div
                                                        key={h}
                                                        className="absolute inset-x-0 border-t border-dashed border-gray-200 dark:border-slate-700"
                                                        style={{ top: `${(idx + 1) * HOUR_HEIGHT}px` }}
                                                    />
                                                ))}

                                                {/* Half-hour markers (lighter) */}
                                                {HOUR_MARKS.slice(0, -1).map((h, idx) => (
                                                    <div
                                                        key={`half-${h}`}
                                                        className="absolute inset-x-0 border-t border-dotted border-gray-100 dark:border-slate-700/50"
                                                        style={{ top: `${idx * HOUR_HEIGHT + HOUR_HEIGHT / 2}px` }}
                                                    />
                                                ))}

                                                {/* Event blocks */}
                                                {occupiedBlocks.map(block => {
                                                    const pos = positionBlock(block.startIso, block.endIso);
                                                    if (!pos) return null;
                                                    const compact = pos.height < 38;
                                                    return (
                                                        <div
                                                            key={block.key}
                                                            className={`absolute left-1 right-1 rounded-md border px-2 py-1 shadow-sm overflow-hidden ${block.chip.className}`}
                                                            style={{ top: `${pos.top}px`, height: `${Math.max(pos.height - 2, 14)}px` }}
                                                            title={`${block.chip.label} • ${formatTimeRange(block.startIso, block.endIso)}`}
                                                        >
                                                            <span className={`block truncate font-bold ${compact ? 'text-[10px]' : 'text-xs'}`}>
                                                                {block.chip.label}
                                                            </span>
                                                            {!compact && (
                                                                <span className="mt-0.5 block truncate text-[10px] font-medium tabular-nums opacity-80">
                                                                    {formatTimeRange(block.startIso, block.endIso)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    );
                                                })}

                                                {/* Empty-day hint */}
                                                {occupiedBlocks.length === 0 && (
                                                    <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400 dark:text-gray-500">
                                                        Available all day
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        );
                    })()}
                </div>
            </div>
        </div>
    );
}
