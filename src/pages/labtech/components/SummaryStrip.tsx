import { Monitor, Apple } from 'lucide-react';
import type { Room as RoomType, RoomSession } from '@/types/room';

interface SummaryStripProps {
    rooms: RoomType[];
    weekSessions: RoomSession[];
    currentTime: Date;
}

// Counts queued rooms for TODAY (not just currently-running) so queues
// scheduled later in the day still reflect.
export default function SummaryStrip({ rooms, weekSessions, currentTime }: SummaryStripProps) {
    const dayStart = new Date(currentTime);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const windowsRoomIds = new Set(rooms.filter(r => r.Lab_Type === 'WINDOWS').map(r => r.Room_ID));
    const macRoomIds = new Set(rooms.filter(r => r.Lab_Type === 'MAC').map(r => r.Room_ID));

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

    return (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-900 dark:text-gray-200">
                <Monitor className="h-3.5 w-3.5 text-indigo-600" />
                Windows
                <span className="font-semibold text-green-700 dark:text-green-400">
                    {windowsQueuedRooms.size} lab{windowsQueuedRooms.size === 1 ? '' : 's'} queued today
                </span>
            </span>

            <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-900 dark:text-gray-200">
                <Apple className="h-3.5 w-3.5 text-indigo-600" />
                Mac
                <span className="font-semibold text-green-700 dark:text-green-400">
                    {macQueuedRooms.size} lab{macQueuedRooms.size === 1 ? '' : 's'} queued today
                </span>
            </span>
        </div>
    );
}
