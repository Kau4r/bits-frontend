import dayjs from 'dayjs';
import { useState, useEffect, useMemo } from 'react';
import type { RoomSession, Room as RoomType } from '@/types/room';

interface TimeSlotGridProps {
    sessions: RoomSession[];
    categoryRooms: RoomType[]; // Active queue rooms for this category
    onAddRoom: (startTime: string, endTime: string) => void;
    onSlotDetail?: (startTime: string, sessions: RoomSession[]) => void;
    testTimeOverride?: Date; // For testing
}

const generateTimeSlots = (startHour: number, endHour: number) => {
    const slots: string[] = [];
    for (let h = startHour; h <= endHour; h++) {
        slots.push(`${h.toString().padStart(2, '0')}:00`);
        if (h < endHour) {
            slots.push(`${h.toString().padStart(2, '0')}:30`);
        }
    }
    return slots;
};

// Base slots 8:00 AM to 8:30 PM
const baseSlots = generateTimeSlots(8, 20);

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

    return (
        <div className="flex flex-col gap-2 relative mt-4">
            {/* Time Header */}
            <div className="flex">
                {slots.map((slot) => {
                    const isCurrent = checkIfCurrentSlot(slot);
                    return (
                        <div
                            key={`header-${slot}`}
                            className={`flex-1 min-w-[60px] px-1 py-1 text-center text-xs border ${isCurrent ? 'bg-cyan-50 border-cyan-400 text-cyan-900 shadow-[inset_0_2px_4px_rgba(34,211,238,0.2)] dark:bg-cyan-900/30 dark:border-cyan-500 dark:text-cyan-100 font-bold relative' : 'text-gray-600 border-gray-300 bg-gray-100 dark:text-gray-400 dark:border-gray-700 dark:bg-gray-800'}`}
                        >
                            {isCurrent && <div className="current-time-label">▼ NOW ▼</div>}
                            {formatTime(slot)}
                        </div>
                    );
                })}
            </div>

            {/* Capacity Row */}
            <div className="flex">
                {slots.map((slot) => {
                    const slotSessions = getSessionsForSlot(slot);
                    const isCurrent = checkIfCurrentSlot(slot);
                    const endTime = getEndTime(slot);

                    // Map session to room to get capacity
                    let totalCapacity = 0;
                    const queuedRoomIds = new Set<number>();
                    const classRoomIds = new Set<number>();
                    const otherBookingRoomIds = new Set<number>();

                    // Determine which rooms are occupied by which type of session
                    slotSessions.forEach(session => {
                        if (session.type === 'schedule') {
                            classRoomIds.add(session.roomId);
                        } else if (session.type === 'booking' && session.purpose !== 'Student Usage') {
                            otherBookingRoomIds.add(session.roomId);
                        } else if (session.type === 'booking' && session.purpose === 'Student Usage') {
                            const room = categoryRooms.find(r => r.Room_ID === session.roomId);
                            if (room && !queuedRoomIds.has(room.Room_ID)) {
                                totalCapacity += room.Capacity || 0;
                                queuedRoomIds.add(room.Room_ID);
                            }
                        }
                    });

                    // Rooms that are technically available for queueing
                    const activeRoomsForQueue = categoryRooms.filter(
                        r => !classRoomIds.has(r.Room_ID) && !otherBookingRoomIds.has(r.Room_ID)
                    );

                    // We are at maximum queue capacity if all available rooms have a queue session in this slot
                    const isQueueFull = activeRoomsForQueue.length > 0 && queuedRoomIds.size >= activeRoomsForQueue.length;

                    const hasClasses = classRoomIds.size > 0;

                    if (totalCapacity > 0) {
                        return (
                            <div
                                key={`cap-${slot}`}
                                className={`flex-1 min-w-[60px] flex flex-col items-center justify-center py-2 rounded cursor-pointer transition-colors relative group ${isCurrent ? 'current-time-slot' : ''} ${isQueueFull ? 'bg-red-600 text-white hover:bg-red-700 dark:bg-red-500/80 dark:hover:bg-red-500' : 'bg-blue-500/30 border border-blue-500/50 text-blue-800 hover:bg-blue-500/40 dark:text-blue-200'}`}
                                onClick={() => onAddRoom(slot, endTime)}
                                title={`${queuedRoomIds.size} room(s) queued. Total capacity: ${totalCapacity}`}
                            >
                                <span className={`text-sm font-bold ${isCurrent ? 'drop-shadow-md' : ''}`}>{totalCapacity}</span>
                                <span className="text-[10px] opacity-75">seats</span>
                                {hasClasses && (
                                    <div
                                        className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border border-white dark:border-gray-800"
                                        title="Classes Ongoing"
                                    />
                                )}
                                {onSlotDetail && (
                                    <button
                                        className="absolute right-0.5 top-0.5 opacity-0 group-hover:opacity-100 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] bg-black/20 hover:bg-black/40"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSlotDetail(slot, slotSessions);
                                        }}
                                        title="View bookings"
                                    >
                                        i
                                    </button>
                                )}
                            </div>
                        );
                    }

                    // Empty slot
                    if (isCurrent && activeRoomsForQueue.length > 0) {
                        // Current time frame empty placeholder showing MAX available capacity
                        const totalCategoryCapacity = activeRoomsForQueue.reduce((sum, room) => sum + (room.Capacity || 0), 0);
                        return (
                            <div
                                key={`empty-${slot}`}
                                className="flex-1 min-w-[60px] flex flex-col items-center justify-center text-xs py-2 rounded cursor-pointer transition-colors current-time-slot bg-emerald-50 border border-emerald-300 dark:bg-emerald-900/30 dark:border-emerald-600 dark:text-emerald-100 hover:bg-emerald-100 dark:hover:bg-emerald-800/50 relative"
                                onClick={() => onAddRoom(slot, endTime)}
                                title={`No bookings right now. Total available capacity: ${totalCategoryCapacity}`}
                            >
                                <span className="font-bold text-emerald-700 dark:text-emerald-300">{totalCategoryCapacity}</span>
                                <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">Available</span>
                                {hasClasses && (
                                    <div
                                        className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border border-white dark:border-gray-800"
                                        title="Classes Ongoing"
                                    />
                                )}
                            </div>
                        );
                    }

                    return (
                        <div
                            key={`empty-${slot}`}
                            className={`flex-1 min-w-[60px] flex items-center justify-center text-xs py-2 rounded cursor-pointer hover:bg-gray-200 text-gray-500 transition-colors bg-gray-100 border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600 dark:text-gray-300 relative`}
                            onClick={() => onAddRoom(slot, endTime)}
                        >
                            {activeRoomsForQueue.length === 0 && categoryRooms.length > 0 ? (
                                <span className="text-red-500 font-semibold" title="No rooms available (Class/Booking Open)">Full</span>
                            ) : (
                                <>+ Add</>
                            )}
                            {hasClasses && (
                                <div
                                    className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border border-white dark:border-gray-800"
                                    title="Classes Ongoing"
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default function TimeSlotGrid({ sessions, categoryRooms, onAddRoom, onSlotDetail, testTimeOverride }: TimeSlotGridProps) {
    const [currentTime, setCurrentTime] = useState(testTimeOverride || new Date());

    useEffect(() => {
        if (testTimeOverride) {
            setCurrentTime(testTimeOverride);
            return;
        }

        // Update current time every minute
        const interval = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(interval);
    }, [testTimeOverride]);

    const visibleSlots = useMemo(() => {
        // Filter slots to current time and future today
        const now = currentTime;
        return baseSlots.filter(slot => {
            const [h, m] = slot.split(':').map(Number);
            const slotDate = new Date();
            slotDate.setHours(h, m, 0, 0);

            // Allow slots up to 30 mins in the past to remain visible so current slot stays
            // The PRD implies filtering strictly, but we need the current slot to be visible
            const slotEnd = new Date(slotDate);
            slotEnd.setMinutes(slotEnd.getMinutes() + 30);

            return slotEnd > now;
        });
    }, [currentTime]);

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
    const currentMinutes = currentTime.getMinutes();
    const isPastEndOfDay = currentHour > 20 || (currentHour === 20 && currentMinutes >= 30); // Passed 8:30 PM
    const isBeforeStartOfDay = currentHour < 8;

    if (isPastEndOfDay) {
        return (
            <div className="py-8 text-center text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <p>No more available slots today. Queue opens tomorrow at 8:00 AM.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {isBeforeStartOfDay && (
                <div className="text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-lg inline-block">
                    Queue opens at 8:00 AM
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
