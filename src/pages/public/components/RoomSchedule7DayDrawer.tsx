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

const formatHourLabel = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:00 ${period}`;
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
                        <p className="text-xs text-gray-500 dark:text-gray-400">Next 7 days</p>
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
                <div className="flex-1 overflow-y-auto px-4 py-3">
                    {isLoading && (
                        <div className="flex items-center justify-center py-10">
                            <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                            <span className="ml-2 text-sm text-gray-600 dark:text-gray-300">Loading schedule…</span>
                        </div>
                    )}

                    {error && !isLoading && (
                        <div className="py-6 text-center text-sm text-red-600 dark:text-red-300">{error}</div>
                    )}

                    {!isLoading && !error && schedule && (
                        <div className="space-y-5">
                            {schedule.days.map(day => (
                                <div key={day.date}>
                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 sticky top-0 bg-white dark:bg-slate-900 py-1">
                                        {formatDateLabel(day.date, day.dayOfWeek)}
                                    </h3>
                                    <ul className="divide-y divide-gray-100 dark:divide-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
                                        {day.slots.map(slot => {
                                            const chip = slotChip(slot);
                                            return (
                                                <li
                                                    key={slot.startIso}
                                                    className="flex items-center justify-between gap-3 px-3 py-2 bg-white dark:bg-slate-800"
                                                >
                                                    <span className="text-sm text-gray-700 dark:text-gray-200 tabular-nums w-20 shrink-0">
                                                        {formatHourLabel(slot.hour)}
                                                    </span>
                                                    <span
                                                        className={`ml-auto text-xs font-medium px-2 py-1 rounded-md truncate max-w-[60%] ${chip.className}`}
                                                        title={chip.label}
                                                    >
                                                        {chip.label}
                                                    </span>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
