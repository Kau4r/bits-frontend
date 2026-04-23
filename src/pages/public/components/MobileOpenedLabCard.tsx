import { Users, Clock, Apple, Monitor, User } from 'lucide-react';
import type { OpenedLabRoom, QueueStatus } from '@/services/room';

interface MobileOpenedLabCardProps {
    lab: OpenedLabRoom;
}

const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

export default function MobileOpenedLabCard({ lab }: MobileOpenedLabCardProps) {
    const booking = lab.Booked_Rooms?.[0];
    const opener = booking?.User || lab.Opened_By_User;
    const openedByName = opener ? `${opener.First_Name} ${opener.Last_Name}` : 'Lab Staff';

    const isMac = lab.Lab_Type === 'MAC';
    const DeviceIcon = isMac ? Apple : Monitor;

    const scheduleText = booking
        ? `${formatTime(booking.Start_Time)} – ${formatTime(booking.End_Time)}`
        : 'Available';

    const now = Date.now();
    const startsAt = booking ? new Date(booking.Start_Time).getTime() : 0;
    const endsAt = booking ? new Date(booking.End_Time).getTime() : 0;
    const isOpenNow = !!booking && startsAt <= now && endsAt > now;

    // Queue status comes from the enhanced public endpoint. Fall back to OPEN
    // for older responses that don't include Queue_Status.
    const queueStatus: QueueStatus = lab.Queue_Status || booking?.Queue_Status || 'OPEN';

    return (
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm p-4">
            <div className="flex items-start gap-3">
                <div className="shrink-0 p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10">
                    <DeviceIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                                {lab.Name}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {isMac ? 'Mac Lab' : 'Windows Lab'}
                            </p>
                        </div>
                        {isOpenNow && (
                            <span className="shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                                Open now
                            </span>
                        )}
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-1.5 text-sm">
                        <div className="flex items-center text-gray-600 dark:text-gray-300">
                            <Users className="w-4 h-4 mr-2 text-gray-400" />
                            <span>Capacity: <span className="font-medium text-gray-900 dark:text-white">{lab.Capacity}</span></span>
                            {queueStatus === 'NEAR_FULL' && (
                                <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                                    Filling up
                                </span>
                            )}
                            {queueStatus === 'FULL' && (
                                <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                                    Full
                                </span>
                            )}
                        </div>

                        <div className="flex items-center text-gray-600 dark:text-gray-300">
                            <Clock className="w-4 h-4 mr-2 text-gray-400" />
                            <span className="truncate">{scheduleText}</span>
                        </div>

                        <div className="flex items-center text-gray-600 dark:text-gray-300">
                            <User className="w-4 h-4 mr-2 text-gray-400" />
                            <span className="truncate">Opened by <span className="text-gray-900 dark:text-white">{openedByName}</span></span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
