import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Monitor, Apple, Clock, DoorOpen, AlertTriangle } from 'lucide-react';
import type { ActiveQueueItem, QueueStatus } from '@/services/room';
import { getActiveQueues, updateQueueOccupancyStatus } from '@/services/room';
import type { Room as RoomType, RoomSession } from '@/types/room';

interface ActiveQueueDashboardProps {
    allRooms: RoomType[];
    weekSessions: RoomSession[];
    onOpenOverflow: (preset: OverflowPreset) => void;
    refreshSignal?: number;
}

export interface OverflowPreset {
    labType: 'WINDOWS' | 'MAC';
    startTimeIso: string;
    endTimeIso: string;
    eligibleRooms: RoomType[];
    sourceRoomName: string;
}

const formatTimeWindow = (startIso: string, endIso: string) => {
    const start = dayjs(startIso).format('h:mm A');
    const end = dayjs(endIso).format('h:mm A');
    return `${start} – ${end}`;
};

const statusLabel: Record<QueueStatus, string> = {
    OPEN: 'Open',
    NEAR_FULL: 'Near Full',
    FULL: 'Full',
};

const statusBg: Record<QueueStatus, string> = {
    OPEN: 'bg-white dark:bg-gray-800',
    NEAR_FULL: 'bg-amber-50 dark:bg-amber-900/10',
    FULL: 'bg-red-50 dark:bg-red-900/10',
};

const statusBorder: Record<QueueStatus, string> = {
    OPEN: 'border-gray-200 dark:border-gray-700',
    NEAR_FULL: 'border-amber-300 dark:border-amber-700',
    FULL: 'border-red-300 dark:border-red-700',
};

const statusPill: Record<QueueStatus, string> = {
    OPEN: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200 border-gray-300',
    NEAR_FULL: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 border-amber-400',
    FULL: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200 border-red-400',
};

// Find rooms of the same Lab_Type with no overlapping approved booking or
// class schedule for [now, endIso]. Used to pre-filter the overflow picker.
const findOverflowEligibleRooms = (
    allRooms: RoomType[],
    labType: 'WINDOWS' | 'MAC',
    sourceRoomId: number,
    nowIso: string,
    endIso: string,
    weekSessions: RoomSession[]
): RoomType[] => {
    const nowMs = new Date(nowIso).getTime();
    const endMs = new Date(endIso).getTime();

    return allRooms.filter(r => {
        if (r.Room_Type !== 'LAB') return false;
        if (r.Lab_Type !== labType) return false;
        if (r.Room_ID === sourceRoomId) return false;

        // Reject if any week session overlaps [nowMs, endMs] on this room.
        const hasConflict = weekSessions.some(s => {
            if (s.roomId !== r.Room_ID) return false;
            const sStart = new Date(s.startTime).getTime();
            const sEnd = new Date(s.endTime).getTime();
            return sStart < endMs && sEnd > nowMs;
        });
        return !hasConflict;
    });
};

export default function ActiveQueueDashboard({
    allRooms,
    weekSessions,
    onOpenOverflow,
    refreshSignal = 0,
}: ActiveQueueDashboardProps) {
    const [queues, setQueues] = useState<ActiveQueueItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<number | null>(null);

    const loadQueues = useCallback(async () => {
        try {
            const data = await getActiveQueues();
            setQueues(data);
        } catch (err) {
            console.error('Failed to load active queues:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Poll every 30s + refresh on window focus + refresh on external signal.
    useEffect(() => {
        loadQueues();
        const interval = window.setInterval(loadQueues, 30000);
        const onFocus = () => loadQueues();
        window.addEventListener('focus', onFocus);
        return () => {
            window.clearInterval(interval);
            window.removeEventListener('focus', onFocus);
        };
    }, [loadQueues, refreshSignal]);

    const handleStatusChange = async (queue: ActiveQueueItem, newStatus: QueueStatus) => {
        const prevStatus = queue.Queue_Status;
        setUpdatingId(queue.Booked_Room_ID);
        // Optimistic update
        setQueues(prev => prev.map(q =>
            q.Booked_Room_ID === queue.Booked_Room_ID
                ? { ...q, Queue_Status: newStatus }
                : q
        ));
        try {
            await updateQueueOccupancyStatus(queue.Booked_Room_ID, newStatus);
        } catch (err) {
            console.error('Failed to update queue status:', err);
            // Revert on failure.
            setQueues(prev => prev.map(q =>
                q.Booked_Room_ID === queue.Booked_Room_ID
                    ? { ...q, Queue_Status: prevStatus }
                    : q
            ));
        } finally {
            setUpdatingId(null);
        }
    };

    const sortedQueues = useMemo(() => {
        // Show FULL first, then NEAR_FULL, then OPEN.
        const priority: Record<QueueStatus, number> = { FULL: 0, NEAR_FULL: 1, OPEN: 2 };
        return [...queues].sort((a, b) => priority[a.Queue_Status] - priority[b.Queue_Status]);
    }, [queues]);

    if (loading) {
        return (
            <div className="space-y-3">
                {[...Array(2)].map((_, i) => (
                    <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
                ))}
            </div>
        );
    }

    if (sortedQueues.length === 0) {
        return (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800/40 dark:text-gray-400">
                No rooms are actively queued for student use right now.
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {sortedQueues.map(queue => {
                const labType = queue.Room?.Lab_Type;
                const DeviceIcon = labType === 'MAC' ? Apple : Monitor;
                const status = queue.Queue_Status;
                const isFull = status === 'FULL';
                const eligibleRooms = isFull && (labType === 'WINDOWS' || labType === 'MAC')
                    ? findOverflowEligibleRooms(
                        allRooms,
                        labType,
                        queue.Room_ID,
                        new Date().toISOString(),
                        queue.End_Time,
                        weekSessions
                    )
                    : [];

                return (
                    <div
                        key={queue.Booked_Room_ID}
                        className={`rounded-xl border p-4 shadow-sm transition-colors ${statusBg[status]} ${statusBorder[status]}`}
                    >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                                    <DeviceIcon className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                                        {queue.Room?.Name || `Room ${queue.Room_ID}`}
                                    </h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {labType === 'MAC' ? 'Mac Lab' : 'Windows Lab'}
                                        {queue.Room?.Capacity ? ` · ${queue.Room.Capacity} PCs` : ''}
                                    </p>
                                    <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
                                        <Clock className="h-4 w-4 text-gray-400" />
                                        {formatTimeWindow(queue.Start_Time, queue.End_Time)}
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-col items-end gap-2">
                                <div className="relative">
                                    <select
                                        value={status}
                                        onChange={(e) => handleStatusChange(queue, e.target.value as QueueStatus)}
                                        disabled={updatingId === queue.Booked_Room_ID}
                                        className={`cursor-pointer appearance-none rounded-full border px-3 py-1 pr-8 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-wait ${statusPill[status]}`}
                                    >
                                        <option value="OPEN">{statusLabel.OPEN}</option>
                                        <option value="NEAR_FULL">{statusLabel.NEAR_FULL}</option>
                                        <option value="FULL">{statusLabel.FULL}</option>
                                    </select>
                                    <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs opacity-60">
                                        ▼
                                    </span>
                                </div>

                                {isFull && (
                                    <button
                                        type="button"
                                        disabled={eligibleRooms.length === 0}
                                        title={eligibleRooms.length === 0
                                            ? `No other ${labType === 'MAC' ? 'Mac' : 'Windows'} labs available for this time window`
                                            : `Queue another room for overflow`}
                                        onClick={() => {
                                            if (!labType) return;
                                            onOpenOverflow({
                                                labType,
                                                startTimeIso: new Date().toISOString(),
                                                endTimeIso: queue.End_Time,
                                                eligibleRooms,
                                                sourceRoomName: queue.Room?.Name || `Room ${queue.Room_ID}`,
                                            });
                                        }}
                                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${eligibleRooms.length === 0
                                            ? 'cursor-not-allowed bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                            }`}
                                    >
                                        {eligibleRooms.length === 0 ? (
                                            <>
                                                <AlertTriangle className="h-3.5 w-3.5" />
                                                No overflow available
                                            </>
                                        ) : (
                                            <>
                                                <DoorOpen className="h-3.5 w-3.5" />
                                                Open overflow room
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
