import dayjs from 'dayjs';
import { useState, useEffect, useMemo } from 'react';
import type { RoomSession, Room as RoomType } from '@/types/room';

interface TimeSlotGridProps {
    sessions: RoomSession[];
    categoryRooms: RoomType[]; // Active queue rooms for this category
    onAddRoom: (startTime: string, endTime: string) => void;
    onSlotDetail?: (startTime: string, sessions: RoomSession[]) => void;
    currentTime?: Date;
    testTimeOverride?: Date; // For testing
    isTomorrow?: boolean;
}

const generateTimeSlots = (startHour: number, startMinute: number, endHour: number, endMinute: number) => {
    const slots: string[] = [];
    let h = startHour;
    let m = startMinute;
    while (h < endHour || (h === endHour && m <= endMinute)) {
        slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
        m += 30;
        if (m >= 60) {
            m = 0;
            h++;
        }
    }
    return slots;
};

// Base slots 7:00 AM to 9:00 PM
const baseSlots = generateTimeSlots(7, 0, 21, 0);

interface TimeRowProps {
    slots: string[];
    sessions: RoomSession[];
    categoryRooms: RoomType[];
    currentTime: Date;
    onAddRoom: (startTime: string, endTime: string) => void;
    onSlotDetail?: (startTime: string, sessions: RoomSession[]) => void;
}

function TimeRow({ slots, sessions, categoryRooms, currentTime, onAddRoom, onSlotDetail }: TimeRowProps) {
    const currentHour = currentTime.getHours();
    const currentMinutes = currentTime.getMinutes();
    const currentSlotMinutes = currentHour * 60 + currentMinutes;

    const getSessionsForSlot = (slotTime: string): RoomSession[] => {
        const [h, m] = slotTime.split(':').map(Number);
        const slotMinutes = h * 60 + m;

        return sessions.filter(session => {
            const start = dayjs(session.startTime);
            const end = dayjs(session.endTime);
            const startMinutes = start.hour() * 60 + start.minute();
            const endMinutes = end.hour() * 60 + end.minute();
            return slotMinutes >= startMinutes && slotMinutes < endMinutes;
        });
    };

    const formatTime = (time: string) => {
        const [h, m] = time.split(':');
        const hour = parseInt(h);
        const period = hour >= 12 ? 'PM' : 'AM';
        const display = hour % 12 || 12;
        return `${display}:${m} ${period}`;
    };

    const getEndTime = (slot: string): string => {
        const [h, m] = slot.split(':').map(Number);
        const endH = m === 30 ? h + 1 : h;
        const endM = m === 30 ? 0 : 30;
        return `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
    };

    const checkIfCurrentSlot = (slotTime: string) => {
        const [h, m] = slotTime.split(':').map(Number);
        const slotStart = h * 60 + m;
        const slotEnd = slotStart + 30;
        return currentSlotMinutes >= slotStart && currentSlotMinutes < slotEnd;
    };

    if (slots.length === 0) return null;

    const slotMeta = slots.map((slot) => {
        const slotSessions = getSessionsForSlot(slot);
        const isCurrent = checkIfCurrentSlot(slot);
        const endTime = getEndTime(slot);

        const queuedRoomIds = new Set<number>();
        const queuedRoomNames = new Set<string>();
        const classRoomIds = new Set<number>();
        const otherBookingRoomIds = new Set<number>();
        const queuedSessions: RoomSession[] = [];

        slotSessions.forEach(session => {
            if (session.type === 'schedule') {
                classRoomIds.add(session.roomId);
                return;
            }

            if (session.type === 'booking' && session.purpose !== 'Student Usage') {
                otherBookingRoomIds.add(session.roomId);
                return;
            }

            if (session.type === 'booking' && session.purpose === 'Student Usage') {
                queuedRoomIds.add(session.roomId);
                const room = categoryRooms.find(r => r.Room_ID === session.roomId);
                queuedRoomNames.add(room?.Name || session.roomName || `Room ${session.roomId}`);
                queuedSessions.push(session);
            }
        });

        const activeRoomsForQueue = categoryRooms.filter(
            r => !classRoomIds.has(r.Room_ID) && !otherBookingRoomIds.has(r.Room_ID)
        );

        const isQueueFull = activeRoomsForQueue.length > 0 && queuedRoomIds.size >= activeRoomsForQueue.length;
        const hasClasses = classRoomIds.size > 0;
        const roomNames = Array.from(queuedRoomNames);
        const roomIds = Array.from(queuedRoomIds).sort((a, b) => a - b);
        const hasQueuedRooms = roomNames.length > 0;
        const queuedLabel = roomNames.length === 1 ? roomNames[0] : `${roomNames.length} rooms queued`;

        let queuedRangeLabel = '';
        if (queuedSessions.length > 0) {
            let minStart = Number.POSITIVE_INFINITY;
            let maxEnd = Number.NEGATIVE_INFINITY;
            queuedSessions.forEach(session => {
                const start = dayjs(session.startTime);
                const end = dayjs(session.endTime);
                const startMin = start.hour() * 60 + start.minute();
                const endMin = end.hour() * 60 + end.minute();
                if (startMin < minStart) minStart = startMin;
                if (endMin > maxEnd) maxEnd = endMin;
            });
            if (Number.isFinite(minStart) && Number.isFinite(maxEnd)) {
                const startH = Math.floor(minStart / 60).toString().padStart(2, '0');
                const startM = (minStart % 60).toString().padStart(2, '0');
                const endH = Math.floor(maxEnd / 60).toString().padStart(2, '0');
                const endM = (maxEnd % 60).toString().padStart(2, '0');
                queuedRangeLabel = `${formatTime(`${startH}:${startM}`)} - ${formatTime(`${endH}:${endM}`)}`;
            }
        }

        return {
            slot,
            slotSessions,
            isCurrent,
            endTime,
            activeRoomsForQueue,
            hasClasses,
            isQueueFull,
            hasQueuedRooms,
            queuedLabel,
            queuedRangeLabel,
            roomNames,
            roomIds,
        };
    });

    const inSameQueuedRange = (a: (typeof slotMeta)[number], b: (typeof slotMeta)[number]) => {
        if (!a.hasQueuedRooms || !b.hasQueuedRooms) return false;
        if (a.queuedRangeLabel !== b.queuedRangeLabel) return false;
        if (a.roomIds.length !== b.roomIds.length) return false;
        return a.roomIds.every((id, idx) => id === b.roomIds[idx]);
    };

    const queuedRanges: Array<{
        start: number;
        end: number;
        startSlot: string;
        endSlot: string;
        display: (typeof slotMeta)[number];
        allSessions: RoomSession[];
    }> = [];

    const coveredByQueuedRange = new Set<number>();
    const queuedRangeByStart = new Map<number, {
        start: number;
        end: number;
        startSlot: string;
        endSlot: string;
        display: (typeof slotMeta)[number];
        allSessions: RoomSession[];
    }>();
    let i = 0;
    while (i < slotMeta.length) {
        const meta = slotMeta[i];
        if (!meta.hasQueuedRooms) {
            i++;
            continue;
        }

        let end = i;
        while (end < slotMeta.length - 1 && inSameQueuedRange(slotMeta[end], slotMeta[end + 1])) {
            end++;
        }

        const center = Math.floor((i + end) / 2);
        const dedupedSessions = new Map<string, RoomSession>();
        slotMeta.slice(i, end + 1).forEach(s => {
            s.slotSessions.forEach(session => {
                const key = `${session.type}-${session.id ?? 'na'}-${session.roomId}-${session.startTime}-${session.endTime}`;
                if (!dedupedSessions.has(key)) {
                    dedupedSessions.set(key, session);
                }
            });
        });
        queuedRanges.push({
            start: i,
            end,
            startSlot: slotMeta[i].slot,
            endSlot: getEndTime(slotMeta[end].slot),
            display: slotMeta[center],
            allSessions: Array.from(dedupedSessions.values()),
        });

        queuedRangeByStart.set(i, queuedRanges[queuedRanges.length - 1]);
        for (let idx = i + 1; idx <= end; idx++) coveredByQueuedRange.add(idx);
        i = end + 1;
    }

    const fillerSegmentByStart = new Map<number, {
        start: number;
        end: number;
        startSlot: string;
        endSlot: string;
        type: 'add' | 'unavailable';
        hasClasses: boolean;
    }>();
    const coveredByFillerSegment = new Set<number>();

    let j = 0;
    while (j < slotMeta.length) {
        if (queuedRangeByStart.has(j) || coveredByQueuedRange.has(j)) {
            j++;
            continue;
        }

        const startMeta = slotMeta[j];
        const startType: 'add' | 'unavailable' = startMeta.activeRoomsForQueue.length > 0 ? 'add' : 'unavailable';
        let end = j;
        let hasClasses = startMeta.hasClasses;

        while (end + 1 < slotMeta.length) {
            const nextIdx = end + 1;
            if (queuedRangeByStart.has(nextIdx) || coveredByQueuedRange.has(nextIdx)) break;
            const nextMeta = slotMeta[nextIdx];
            const nextType: 'add' | 'unavailable' = nextMeta.activeRoomsForQueue.length > 0 ? 'add' : 'unavailable';
            if (nextType !== startType) break;
            hasClasses = hasClasses || nextMeta.hasClasses;
            end = nextIdx;
        }

        fillerSegmentByStart.set(j, {
            start: j,
            end,
            startSlot: slotMeta[j].slot,
            endSlot: getEndTime(slotMeta[end].slot),
            type: startType,
            hasClasses,
        });
        for (let idx = j + 1; idx <= end; idx++) coveredByFillerSegment.add(idx);
        j = end + 1;
    }

    const gridTemplateStyle = {
        gridTemplateColumns: `repeat(${slots.length}, minmax(60px, 1fr))`,
    } as const;

    return (
        <div className="flex flex-col gap-2 relative mt-4">
            {/* Time Header */}
            <div className="grid" style={gridTemplateStyle}>
                {slots.map((slot, idx) => {
                    const isCurrent = checkIfCurrentSlot(slot);
                    const isFirstSlot = idx === 0;
                    const isLastSlot = idx === slots.length - 1;
                    return (
                        <div
                            key={`header-${slot}`}
                            className={`min-w-[60px] px-1 py-1 text-center text-xs border-y ${isFirstSlot ? 'border-l rounded-l-lg' : 'border-l-0'} ${isLastSlot ? 'border-r rounded-r-lg' : 'border-r'} ${isCurrent ? 'bg-cyan-50 border-cyan-400 text-cyan-900 shadow-[inset_0_2px_4px_rgba(34,211,238,0.2)] dark:bg-cyan-900/30 dark:border-cyan-500 dark:text-cyan-100 font-bold relative' : 'text-gray-600 border-gray-300 bg-gray-100 dark:text-gray-400 dark:border-gray-700 dark:bg-gray-800'}`}
                        >
                            {isCurrent && <div className="current-time-label">▼ NOW ▼</div>}
                            {formatTime(slot)}
                        </div>
                    );
                })}
            </div>

            {/* Capacity Row */}
            <div className="grid relative" style={gridTemplateStyle}>
                {slotMeta.map((_, idx) => {
                    const queuedRange = queuedRangeByStart.get(idx);
                    const filler = fillerSegmentByStart.get(idx);

                    if (queuedRange) {
                        return (
                            <div
                                key={`queued-range-${idx}-${queuedRange.startSlot}-${queuedRange.endSlot}`}
                                style={{ gridColumn: `${queuedRange.start + 1} / ${queuedRange.end + 2}` }}
                                className={`min-h-[52px] flex flex-col items-center justify-center py-2 px-2 border border-indigo-500 cursor-pointer relative rounded-lg ${queuedRange.display.isQueueFull ? 'bg-indigo-700 text-white dark:bg-indigo-600/90' : 'bg-indigo-600 text-white dark:bg-indigo-500/80'}`}
                                onClick={() => onAddRoom(queuedRange.startSlot, queuedRange.endSlot)}
                                title={`${queuedRange.display.roomNames.join(', ')}${queuedRange.display.queuedRangeLabel ? ` (${queuedRange.display.queuedRangeLabel})` : ''}`}
                            >
                                <span className={`text-[11px] leading-tight font-semibold truncate max-w-full text-center ${queuedRange.display.isCurrent ? 'drop-shadow-md' : ''}`}>
                                    {queuedRange.display.queuedLabel}
                                </span>
                                <span className="text-[10px] opacity-85 truncate max-w-full text-center">
                                    {queuedRange.display.queuedRangeLabel || `${formatTime(queuedRange.startSlot)} - ${formatTime(queuedRange.endSlot)}`}
                                </span>
                                {queuedRange.display.hasClasses && (
                                    <div
                                        className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border border-white dark:border-gray-800"
                                        title="Classes Ongoing"
                                    />
                                )}
                                {onSlotDetail && (
                                    <button
                                        className="absolute right-1 top-1 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] bg-black/20 hover:bg-black/40"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSlotDetail(queuedRange.startSlot, queuedRange.allSessions);
                                        }}
                                        title="View bookings"
                                    >
                                        i
                                    </button>
                                )}
                            </div>
                        );
                    }

                    if (filler) {
                        const spanSlots = filler.end - filler.start + 1;
                        const addLabel = spanSlots <= 1 ? '+ Add' : '+ Add Room';
                        return (
                            <div
                                key={`filler-${idx}-${filler.type}`}
                                style={{ gridColumn: `${filler.start + 1} / ${filler.end + 2}` }}
                                className={`min-h-[52px] flex items-center justify-center gap-2 px-3 border rounded-lg relative ${filler.type === 'add'
                                    ? 'cursor-pointer bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-600'
                                    : 'cursor-default bg-rose-200/80 border-rose-300 text-rose-900 dark:bg-rose-900/30 dark:border-rose-700 dark:text-rose-200'
                                    }`}
                                onClick={filler.type === 'add' ? () => onAddRoom(filler.startSlot, filler.endSlot) : undefined}
                                title={filler.type === 'add'
                                    ? `Add room between ${formatTime(filler.startSlot)} and ${formatTime(filler.endSlot)}`
                                    : 'No available rooms in this range'}
                            >
                                {filler.type === 'add' ? (
                                    <span className="text-sm font-semibold whitespace-nowrap">{addLabel}</span>
                                ) : (
                                    <span className="text-sm font-semibold">No Available Rooms</span>
                                )}
                                {filler.hasClasses && (
                                    <div
                                        className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border border-white dark:border-gray-800"
                                        title="Classes Ongoing"
                                    />
                                )}
                            </div>
                        );
                    }

                    if (coveredByQueuedRange.has(idx) || coveredByFillerSegment.has(idx)) return null;
                    return null;
                })}
            </div>
        </div>
    );
}

export default function TimeSlotGrid({
    sessions,
    categoryRooms,
    onAddRoom,
    onSlotDetail,
    currentTime: controlledCurrentTime,
    testTimeOverride,
    isTomorrow = false
}: TimeSlotGridProps) {
    const [fallbackCurrentTime, setFallbackCurrentTime] = useState(new Date());

    useEffect(() => {
        if (testTimeOverride || controlledCurrentTime) {
            return;
        }

        // Update current time every minute
        const interval = setInterval(() => setFallbackCurrentTime(new Date()), 60000);
        return () => clearInterval(interval);
    }, [testTimeOverride, controlledCurrentTime]);

    const currentTime = testTimeOverride || controlledCurrentTime || fallbackCurrentTime;

    const visibleSlots = useMemo(() => {
        // Show all slots for tomorrow (no past-time filtering)
        if (isTomorrow) return baseSlots;

        // Filter slots to current time and future today
        const now = currentTime;
        return baseSlots.filter(slot => {
            const [h, m] = slot.split(':').map(Number);
            const slotDate = new Date(now);
            slotDate.setHours(h, m, 0, 0);

            const slotEnd = new Date(slotDate);
            slotEnd.setMinutes(slotEnd.getMinutes() + 30);

            return slotEnd > now;
        });
    }, [currentTime, isTomorrow]);

    // Split into morning and afternoon rows based on 14:00 (2 PM) like original
    const morningSlots = visibleSlots.filter(slot => {
        const h = parseInt(slot.split(':')[0]);
        return h < 14;
    });

    const afternoonSlots = visibleSlots.filter(slot => {
        const h = parseInt(slot.split(':')[0]);
        return h >= 14;
    });

    const currentHour = currentTime.getHours();
    const isPastEndOfDay = currentHour >= 21; // Passed 9:00 PM
    const isBeforeStartOfDay = currentHour < 7;

    if (isPastEndOfDay && !isTomorrow) {
        return (
            <div className="py-8 text-center text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <p>No more available slots today. Queue opens tomorrow at 7:00 AM.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {isBeforeStartOfDay && !isTomorrow && (
                <div className="text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-lg inline-block">
                    Queue opens at 7:00 AM
                </div>
            )}

            {/* AM Row */}
            {morningSlots.length > 0 && (
                <TimeRow
                    slots={morningSlots}
                    sessions={sessions}
                    categoryRooms={categoryRooms}
                    currentTime={currentTime}
                    onAddRoom={onAddRoom}
                    onSlotDetail={onSlotDetail}
                />
            )}

            {/* PM Row */}
            {afternoonSlots.length > 0 && (
                <TimeRow
                    slots={afternoonSlots}
                    sessions={sessions}
                    categoryRooms={categoryRooms}
                    currentTime={currentTime}
                    onAddRoom={onAddRoom}
                    onSlotDetail={onSlotDetail}
                />
            )}

        </div>
    );
}
