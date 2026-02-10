import dayjs from 'dayjs';
import type { RoomSession } from '@/types/room';

interface TimeSlotGridProps {
    sessions: RoomSession[];
    totalRoomsInCategory: number;
    onAddRoom: (startTime: string, endTime: string) => void;
    onSlotDetail?: (startTime: string, sessions: RoomSession[]) => void;
}

// Generate 30-minute time slots
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

const amSlots = generateTimeSlots(7, 14).slice(0, -1); // 7:00 – 13:30 (no duplication)
const pmSlots = generateTimeSlots(14, 21); // 14:00 – 21:00

interface TimeRowProps {
    slots: string[];
    sessions: RoomSession[];
    totalRoomsInCategory: number;
    onAddRoom: (startTime: string, endTime: string) => void;
    onSlotDetail?: (startTime: string, sessions: RoomSession[]) => void;
}

function TimeRow({ slots, sessions, totalRoomsInCategory, onAddRoom, onSlotDetail }: TimeRowProps) {
    const getSessionsForSlot = (slotTime: string): RoomSession[] => {
        const slotMinutes = parseInt(slotTime.split(':')[0]) * 60 + parseInt(slotTime.split(':')[1]);

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

    return (
        <div className="flex flex-col gap-2">
            {/* Time Header */}
            <div className="flex">
                {slots.map((slot) => (
                    <div
                        key={slot}
                        className="flex-1 min-w-[60px] px-1 py-1 text-center text-xs text-gray-400 border border-gray-700 bg-gray-800"
                    >
                        {formatTime(slot)}
                    </div>
                ))}
            </div>

            {/* Capacity Row */}
            <div className="flex">
                {slots.map((slot) => {
                    const slotSessions = getSessionsForSlot(slot);
                    const occupiedRoomIds = new Set(slotSessions.map(s => s.roomId));
                    const occupiedRoomsCount = occupiedRoomIds.size;
                    const isFull = occupiedRoomsCount >= totalRoomsInCategory;
                    const isPartial = occupiedRoomsCount > 0 && !isFull;
                    const isEmpty = occupiedRoomsCount === 0;
                    const endTime = getEndTime(slot);

                    if (isFull) {
                        return (
                            <div
                                key={slot}
                                className="flex-1 min-w-[60px] flex items-center justify-center text-xs py-2 rounded cursor-pointer bg-red-500/70 text-white hover:bg-red-600/70 transition-colors"
                                onClick={() => onSlotDetail?.(slot, slotSessions)}
                                title={`All ${totalRoomsInCategory} rooms booked`}
                            >
                                Full
                            </div>
                        );
                    }

                    if (isPartial) {
                        return (
                            <div
                                key={slot}
                                className="flex-1 min-w-[60px] flex items-center justify-center text-xs py-2 rounded cursor-pointer bg-blue-500/30 border border-blue-500/50 text-blue-300 hover:bg-blue-500/40 transition-colors relative group"
                                onClick={() => onAddRoom(slot, endTime)}
                                title={`${occupiedRoomsCount}/${totalRoomsInCategory} rooms booked — click to add`}
                            >
                                {occupiedRoomsCount}/{totalRoomsInCategory}
                                {onSlotDetail && (
                                    <button
                                        className="absolute right-0.5 top-0.5 opacity-0 group-hover:opacity-100 text-blue-300 hover:text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] bg-blue-600/50"
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
                    return (
                        <div
                            key={slot}
                            className="flex-1 min-w-[60px] flex items-center justify-center text-xs py-2 rounded cursor-pointer bg-gray-700 border border-gray-600 hover:bg-gray-600 text-gray-300 transition-colors"
                            onClick={() => onAddRoom(slot, endTime)}
                        >
                            + Add
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default function TimeSlotGrid({ sessions, totalRoomsInCategory, onAddRoom, onSlotDetail }: TimeSlotGridProps) {
    return (
        <div className="space-y-6">
            {/* AM Row */}
            <TimeRow
                slots={amSlots}
                sessions={sessions}
                totalRoomsInCategory={totalRoomsInCategory}
                onAddRoom={onAddRoom}
                onSlotDetail={onSlotDetail}
            />

            {/* PM Row */}
            <TimeRow
                slots={pmSlots}
                sessions={sessions}
                totalRoomsInCategory={totalRoomsInCategory}
                onAddRoom={onAddRoom}
                onSlotDetail={onSlotDetail}
            />
        </div>
    );
}
