import dayjs from 'dayjs';

interface RoomSession {
    roomName: string;
    startTime: string;
    endTime: string;
    status: 'pending' | 'approved' | 'rejected';
    labCategory?: string;
}

interface TimeSlotGridProps {
    sessions: RoomSession[];
    totalRoomsInCategory: number;
    onAddRoom: (startTime: string, endTime: string) => void;
    onSessionClick: (session: RoomSession) => void;
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

const amSlots = generateTimeSlots(7, 14); // 7:00 AM - 2:00 PM
const pmSlots = generateTimeSlots(14, 21); // 2:00 PM - 9:00 PM

interface TimeRowProps {
    slots: string[];
    sessions: RoomSession[];
    totalRoomsInCategory: number;
    onAddRoom: (startTime: string, endTime: string) => void;
    onSessionClick: (session: RoomSession) => void;
}

function TimeRow({ slots, sessions, totalRoomsInCategory, onAddRoom, onSessionClick }: TimeRowProps) {
    // Get all sessions that overlap with a given slot time
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

    // Check if this slot is the start of a session
    const isSessionStart = (slotTime: string, session: RoomSession): boolean => {
        const slotMinutes = parseInt(slotTime.split(':')[0]) * 60 + parseInt(slotTime.split(':')[1]);
        const start = dayjs(session.startTime);
        const startMinutes = start.hour() * 60 + start.minute();
        return slotMinutes === startMinutes;
    };

    // Calculate session span (how many slots it covers)
    const getSessionSpan = (session: RoomSession, currentSlotIndex: number): number => {
        const start = dayjs(session.startTime);
        const end = dayjs(session.endTime);
        const durationMinutes = end.diff(start, 'minute');
        const slotsNeeded = Math.ceil(durationMinutes / 30);

        // Make sure we don't exceed remaining slots in this row
        return Math.min(slotsNeeded, slots.length - currentSlotIndex);
    };

    const formatTime = (time: string) => {
        const [h, m] = time.split(':');
        return `${parseInt(h) % 12 || 12}:${m}`;
    };

    // Track which slots are covered by sessions to avoid rendering duplicates
    const coveredSlots = new Set<number>();

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

            {/* Session Row */}
            <div className="flex">
                {slots.map((slot, index) => {
                    // Skip if this slot is already covered by a previous session block
                    if (coveredSlots.has(index)) {
                        return null;
                    }

                    const slotSessions = getSessionsForSlot(slot);
                    const occupiedRoomsCount = slotSessions.length;
                    const availableRoomsCount = totalRoomsInCategory - occupiedRoomsCount;

                    // Check if there's a session starting at this slot
                    const startingSession = slotSessions.find(s => isSessionStart(slot, s));

                    if (startingSession) {
                        const span = getSessionSpan(startingSession, index);
                        // Mark slots as covered
                        for (let i = 0; i < span; i++) {
                            coveredSlots.add(index + i);
                        }

                        return (
                            <div
                                key={slot}
                                className="flex items-center justify-center bg-blue-600 text-white text-xs font-medium rounded cursor-pointer hover:bg-blue-700 relative group py-2"
                                style={{
                                    flex: span,
                                    minWidth: `${span * 60}px`
                                }}
                                onClick={() => onSessionClick(startingSession)}
                            >
                                {startingSession.roomName}
                                {/* Three dot menu */}
                                <button className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-white">
                                    ⋮
                                </button>
                            </div>
                        );
                    }

                    // No session starting here - check availability
                    const allRoomsOccupied = availableRoomsCount <= 0;

                    return (
                        <div
                            key={slot}
                            className={`flex-1 min-w-[60px] flex items-center justify-center text-xs py-2 rounded cursor-pointer transition-colors ${allRoomsOccupied
                                    ? 'bg-red-500/70 text-white cursor-not-allowed'
                                    : 'bg-gray-700 border border-gray-600 hover:bg-gray-600 text-gray-300'
                                }`}
                            onClick={() => {
                                if (!allRoomsOccupied) {
                                    // Calculate end time (30 min later)
                                    const [h, m] = slot.split(':').map(Number);
                                    const endH = m === 30 ? h + 1 : h;
                                    const endM = m === 30 ? 0 : 30;
                                    const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
                                    onAddRoom(slot, endTime);
                                }
                            }}
                        >
                            {allRoomsOccupied ? 'No Rooms' : '+ Add'}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default function TimeSlotGrid({ sessions, totalRoomsInCategory, onAddRoom, onSessionClick }: TimeSlotGridProps) {
    return (
        <div className="space-y-6">
            {/* AM Row */}
            <TimeRow
                slots={amSlots}
                sessions={sessions}
                totalRoomsInCategory={totalRoomsInCategory}
                onAddRoom={onAddRoom}
                onSessionClick={onSessionClick}
            />

            {/* PM Row */}
            <TimeRow
                slots={pmSlots}
                sessions={sessions}
                totalRoomsInCategory={totalRoomsInCategory}
                onAddRoom={onAddRoom}
                onSessionClick={onSessionClick}
            />
        </div>
    );
}
