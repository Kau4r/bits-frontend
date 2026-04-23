import { Monitor, Apple, Users } from 'lucide-react';
import type { ActiveQueueItem } from '@/services/room';
import type { Room as RoomType, RoomSession } from '@/types/room';

interface SummaryStripProps {
    activeQueues: ActiveQueueItem[];
    rooms: RoomType[];
    weekSessions: RoomSession[];
    currentTime: Date;
}

// Counts queued rooms for TODAY (not just currently-running) so queues
// scheduled later in the day still reflect. "Full" is only meaningful for
// currently-active queues, so that comes from activeQueues.
export default function SummaryStrip({ activeQueues, rooms, weekSessions, currentTime }: SummaryStripProps) {
    // Build today's UTC day range.
    const dayStart = new Date(currentTime);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const windowsRoomIds = new Set(rooms.filter(r => r.Lab_Type === 'WINDOWS').map(r => r.Room_ID));
    const macRoomIds = new Set(rooms.filter(r => r.Lab_Type === 'MAC').map(r => r.Room_ID));

    // Student-usage bookings that INTERSECT today.
    const todayStudentUsage = weekSessions.filter(s => {
        if (s.type !== 'booking') return false;
        if (s.purpose !== 'Student Usage') return false;
        const sStart = new Date(s.startTime).getTime();
        const sEnd = new Date(s.endTime).getTime();
        return sStart < dayEnd.getTime() && sEnd > dayStart.getTime();
    });

    const windowsQueuedRooms = new Set<number>();
    const macQueuedRooms = new Set<number>();
    for (const s of todayStudentUsage) {
        if (windowsRoomIds.has(s.roomId)) windowsQueuedRooms.add(s.roomId);
        else if (macRoomIds.has(s.roomId)) macQueuedRooms.add(s.roomId);
    }

    // "Full" = currently-running queues flagged FULL.
    const nowMs = currentTime.getTime();
    const windowsFullRooms = new Set<number>();
    const macFullRooms = new Set<number>();
    for (const q of activeQueues) {
        if (q.Queue_Status !== 'FULL') continue;
        const sStart = new Date(q.Start_Time).getTime();
        const sEnd = new Date(q.End_Time).getTime();
        if (sStart > nowMs || sEnd <= nowMs) continue;
        if (windowsRoomIds.has(q.Room_ID)) windowsFullRooms.add(q.Room_ID);
        else if (macRoomIds.has(q.Room_ID)) macFullRooms.add(q.Room_ID);
    }

    const total = todayStudentUsage.reduce((acc, s) => {
        acc.add(`${s.roomId}-${s.startTime}`);
        return acc;
    }, new Set<string>()).size;

    return (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-900 dark:text-gray-200">
                <Monitor className="h-3.5 w-3.5 text-indigo-600" />
                Windows
                <span className="font-semibold text-green-700 dark:text-green-400">
                    {windowsQueuedRooms.size} lab{windowsQueuedRooms.size === 1 ? '' : 's'} queued today
                </span>
                <span className="text-gray-400">·</span>
                <span className="font-semibold text-red-600 dark:text-red-400">
                    {windowsFullRooms.size} full
                </span>
            </span>

            <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-900 dark:text-gray-200">
                <Apple className="h-3.5 w-3.5 text-indigo-600" />
                Mac
                <span className="font-semibold text-green-700 dark:text-green-400">
                    {macQueuedRooms.size} lab{macQueuedRooms.size === 1 ? '' : 's'} queued today
                </span>
                <span className="text-gray-400">·</span>
                <span className="font-semibold text-red-600 dark:text-red-400">
                    {macFullRooms.size} full
                </span>
            </span>

            <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                <Users className="h-3.5 w-3.5" />
                Total sessions today: <span className="font-semibold">{total}</span>
            </span>
        </div>
    );
}
