import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import type { Room, RoomSession } from '@/types/room'

interface RoomQueueItem {
    roomId: number;
    roomName: string;
    startTime: string;
    endTime: string;
    user: string;
    status: 'pending' | 'approved' | 'rejected';
}

export interface WeeklySlot {
    startTime: string; // ISO datetime
    endTime: string;   // ISO datetime
}

type QueueMode = 'single' | 'weekly';

interface QueueModalProps {
    isOpen: boolean;
    onClose: () => void;
    onQueue: (startTime: string, endTime: string, roomId: number) => Promise<void> | void;
    onQueueWeekly?: (roomId: number, slots: WeeklySlot[]) => Promise<void> | void;
    onRemove: (item: RoomQueueItem) => void;
    availableRooms: Room[];
    categorySessions?: RoomSession[];
    weekSessions?: RoomSession[];
    weekStart?: Date;
    editingSessionId?: number;
    initialStartTime?: string;
    initialEndTime?: string;
    initialMode?: QueueMode;
    selectedQueueItem: RoomQueueItem | null;
    fullyBookedSlots?: { startMinutes: number; endMinutes: number }[];
    readOnly?: boolean;
}

// Generate 30-minute time slots from 7:00 AM to 9:00 PM
const generateTimeSlots = () => {
    const slots: string[] = [];
    for (let h = 7; h <= 21; h++) {
        slots.push(`${h.toString().padStart(2, '0')}:00`);
        if (h < 21) {
            slots.push(`${h.toString().padStart(2, '0')}:30`);
        }
    }
    return slots;
};

const timeSlots = generateTimeSlots();

const formatTimeDisplay = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'pm' : 'am';
    const hour12 = h % 12 || 12;
    return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
};

// Get the Monday of the week containing `date` (local time).
const getMondayOfWeek = (date: Date): Date => {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const offset = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + offset);
    return d;
};

// Convert HH:MM string to total minutes (e.g. "07:30" -> 450)
const timeToMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
};

// Pad 2-digit helper
const pad2 = (n: number) => n.toString().padStart(2, '0');

// Build an ISO-ish local datetime string for a day + HH:MM (keeps local tz)
const buildLocalDateTime = (day: Date, hhmm: string): Date => {
    const [h, m] = hhmm.split(':').map(Number);
    return new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m, 0, 0);
};

export default function QueueModal({
    isOpen,
    onClose,
    onQueue,
    onQueueWeekly,
    onRemove,
    availableRooms,
    categorySessions = [],
    weekSessions,
    weekStart,
    editingSessionId,
    initialStartTime,
    initialEndTime,
    initialMode = 'weekly',
    selectedQueueItem,
    fullyBookedSlots = [],
    readOnly = false,
}: QueueModalProps) {

    const [mode, setMode] = useState<QueueMode>(initialMode);
    const [startTime, setStartTime] = useState('')
    const [endTime, setEndTime] = useState('')
    const [selectedRoom, setSelectedRoom] = useState<number | null>(null)
    const [error, setError] = useState('')
    const [startDropdownOpen, setStartDropdownOpen] = useState(false)
    const [endDropdownOpen, setEndDropdownOpen] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    // Weekly-mode state: set of "dayIndex-timeSlotIndex" keys (0..6 day, 0..N slot).
    const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set())
    const isDraggingRef = useRef(false)
    const dragModeRef = useRef<'add' | 'remove'>('add')
    const dragDayRef = useRef<number | null>(null)

    useEffect(() => {
        if (selectedQueueItem) {
            const startDate = new Date(selectedQueueItem.startTime);
            const endDate = new Date(selectedQueueItem.endTime);
            setStartTime(`${pad2(startDate.getHours())}:${pad2(startDate.getMinutes())}`);
            setEndTime(`${pad2(endDate.getHours())}:${pad2(endDate.getMinutes())}`);
            setSelectedRoom(selectedQueueItem.roomId);
        } else {
            setStartTime(initialStartTime || '07:00');
            setEndTime(initialEndTime || '09:00');
            if (availableRooms.length > 0) {
                setSelectedRoom(availableRooms[0].Room_ID);
            } else {
                setSelectedRoom(null);
            }
        }
        setError('');
        setSelectedCells(new Set());
        setMode(initialMode);
    }, [selectedQueueItem, isOpen, availableRooms, initialStartTime, initialEndTime, initialMode]);

    // End dragging on any mouseup globally
    useEffect(() => {
        const stop = () => {
            isDraggingRef.current = false;
            dragDayRef.current = null;
        };
        window.addEventListener('mouseup', stop);
        return () => window.removeEventListener('mouseup', stop);
    }, []);

    const isEditing = !!selectedQueueItem;

    // Build week days (Mon..Sun) starting from `weekStart` prop, falling back to the current week's Monday.
    const weekDays = useMemo(() => {
        const monday = weekStart ? getMondayOfWeek(weekStart) : getMondayOfWeek(new Date());
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            return d;
        });
    }, [weekStart]);

    // Check if a specific room is blocked for the selected single-mode time range
    const getRoomBlocker = (roomId: number): RoomSession | null => {
        if (!categorySessions || !startTime || !endTime) return null;
        const startMinutes = timeToMinutes(startTime);
        const endMinutes = timeToMinutes(endTime);

        return categorySessions
            .filter(s => s.roomId === roomId && s.id !== editingSessionId)
            .find(s => {
                const sStart = new Date(s.startTime);
                const sEnd = new Date(s.endTime);
                const sStartMin = sStart.getHours() * 60 + sStart.getMinutes();
                const sEndMin = sEnd.getHours() * 60 + sEnd.getMinutes();
                return startMinutes < sEndMin && endMinutes > sStartMin;
            }) || null;
    };

    // In weekly mode, a room is "blocked" if ANY selected cell overlaps a session for that room.
    const getWeeklyRoomBlocker = useCallback((roomId: number): RoomSession | null => {
        if (!weekSessions || selectedCells.size === 0) return null;

        for (const key of selectedCells) {
            const [dayIdxStr, slotIdxStr] = key.split('-');
            const dayIdx = parseInt(dayIdxStr);
            const slotIdx = parseInt(slotIdxStr);
            const day = weekDays[dayIdx];
            if (!day) continue;

            const slotStart = buildLocalDateTime(day, timeSlots[slotIdx]);
            const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000);

            const blocker = weekSessions.find(s => {
                if (s.roomId !== roomId) return false;
                if (s.id === editingSessionId) return false;
                const sStart = new Date(s.startTime);
                const sEnd = new Date(s.endTime);
                return slotStart < sEnd && slotEnd > sStart;
            });
            if (blocker) return blocker;
        }
        return null;
    }, [weekSessions, selectedCells, weekDays, editingSessionId]);

    // Check if a time slot is fully booked across all rooms (single-mode)
    const isTimeOccupied = (time: string, isEndTime: boolean = false) => {
        if (!fullyBookedSlots) return false;
        const timeMinutes = timeToMinutes(time);

        return fullyBookedSlots.some(slot => {
            if (isEndTime) {
                return timeMinutes > slot.startMinutes && timeMinutes <= slot.endMinutes;
            }
            return timeMinutes >= slot.startMinutes && timeMinutes < slot.endMinutes;
        });
    };

    const getEndTimeOptions = () => {
        if (!startTime) return timeSlots;
        const startIndex = timeSlots.indexOf(startTime);
        return timeSlots.slice(startIndex + 1);
    };

    // Find blocker (if any) for a specific weekly cell. Returns null if empty/selectable.
    const getCellBlocker = useCallback((dayIdx: number, slotIdx: number, roomId?: number): RoomSession | null => {
        const sessions = weekSessions || [];
        if (sessions.length === 0) return null;
        const day = weekDays[dayIdx];
        if (!day) return null;

        const slotStart = buildLocalDateTime(day, timeSlots[slotIdx]);
        const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000);

        // If a room is selected, only count blockers for that room.
        // Otherwise, show a blocker only when EVERY room in availableRooms is blocked
        // at this cell (full occupancy). That mirrors single-mode's fully-booked logic.
        if (roomId != null) {
            return sessions.find(s => {
                if (s.roomId !== roomId) return false;
                if (s.id === editingSessionId) return false;
                const sStart = new Date(s.startTime);
                const sEnd = new Date(s.endTime);
                return slotStart < sEnd && slotEnd > sStart;
            }) || null;
        }

        if (availableRooms.length === 0) return null;
        const blockersForCell: RoomSession[] = [];
        for (const room of availableRooms) {
            const b = sessions.find(s => {
                if (s.roomId !== room.Room_ID) return false;
                if (s.id === editingSessionId) return false;
                const sStart = new Date(s.startTime);
                const sEnd = new Date(s.endTime);
                return slotStart < sEnd && slotEnd > sStart;
            });
            if (!b) return null; // at least one room is free at this cell
            blockersForCell.push(b);
        }
        // All rooms blocked -> return the first (priority: schedule > other booking > queued)
        const priority = (b: RoomSession) =>
            b.type === 'schedule' ? 0 : (b.purpose === 'Student Usage' ? 2 : 1);
        blockersForCell.sort((a, b) => priority(a) - priority(b));
        return blockersForCell[0] || null;
    }, [weekSessions, weekDays, availableRooms, editingSessionId]);

    const toggleCell = (dayIdx: number, slotIdx: number, forceMode?: 'add' | 'remove') => {
        const key = `${dayIdx}-${slotIdx}`;
        setSelectedCells(prev => {
            const next = new Set(prev);
            const has = next.has(key);
            const shouldAdd = forceMode ? forceMode === 'add' : !has;
            if (shouldAdd) next.add(key);
            else next.delete(key);
            return next;
        });
    };

    const handleCellMouseDown = (dayIdx: number, slotIdx: number, blocked: boolean) => {
        if (readOnly || blocked) return;
        const key = `${dayIdx}-${slotIdx}`;
        const willAdd = !selectedCells.has(key);
        dragModeRef.current = willAdd ? 'add' : 'remove';
        dragDayRef.current = dayIdx;
        isDraggingRef.current = true;
        toggleCell(dayIdx, slotIdx, dragModeRef.current);
    };

    const handleCellMouseEnter = (dayIdx: number, slotIdx: number, blocked: boolean) => {
        if (!isDraggingRef.current || readOnly || blocked) return;
        // Only extend selection within the same day column.
        if (dragDayRef.current !== dayIdx) return;
        toggleCell(dayIdx, slotIdx, dragModeRef.current);
    };

    // Collapse selected cells into contiguous intervals per day.
    const collapseSelectedCellsToSlots = useCallback((): WeeklySlot[] => {
        const perDay = new Map<number, number[]>(); // dayIdx -> sorted slotIdx[]
        for (const key of selectedCells) {
            const [d, s] = key.split('-').map(Number);
            if (!perDay.has(d)) perDay.set(d, []);
            perDay.get(d)!.push(s);
        }

        const result: WeeklySlot[] = [];
        for (const [dayIdx, slotsArr] of perDay.entries()) {
            slotsArr.sort((a, b) => a - b);
            const day = weekDays[dayIdx];
            if (!day) continue;

            let runStart: number | null = null;
            let prev: number | null = null;
            const flush = (rs: number, re: number) => {
                const startStr = timeSlots[rs];
                // end slot is the slot AFTER the last selected, i.e. last + 30min.
                const lastSlotStart = timeSlots[re];
                const [lh, lm] = lastSlotStart.split(':').map(Number);
                const endMinutes = lh * 60 + lm + 30;
                const eh = Math.floor(endMinutes / 60);
                const em = endMinutes % 60;
                const endStr = `${pad2(eh)}:${pad2(em)}`;
                const start = buildLocalDateTime(day, startStr);
                const end = buildLocalDateTime(day, endStr);
                result.push({
                    startTime: start.toISOString(),
                    endTime: end.toISOString()
                });
            };

            for (const s of slotsArr) {
                if (runStart === null) {
                    runStart = s;
                    prev = s;
                } else if (prev !== null && s === prev + 1) {
                    prev = s;
                } else if (prev !== null) {
                    flush(runStart, prev);
                    runStart = s;
                    prev = s;
                }
            }
            if (runStart !== null && prev !== null) flush(runStart, prev);
        }
        return result;
    }, [selectedCells, weekDays]);

    const handleSubmit = async () => {
        if (!selectedRoom) {
            setError('Please select a room');
            return;
        }

        if (mode === 'single') {
            if (!startTime || !endTime) {
                setError('Please select both start and end times');
                return;
            }
            if (startTime >= endTime) {
                setError('End time must be after start time');
                return;
            }
            try {
                setSubmitting(true);
                await onQueue(startTime, endTime, selectedRoom);
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : 'Failed to set room availability';
                setError(msg);
            } finally {
                setSubmitting(false);
            }
            return;
        }

        // Weekly mode
        if (selectedCells.size === 0) {
            setError('Please select at least one time slot');
            return;
        }
        if (!onQueueWeekly) {
            setError('Weekly queueing is not configured');
            return;
        }
        const slots = collapseSelectedCellsToSlots();
        try {
            setSubmitting(true);
            await onQueueWeekly(selectedRoom, slots);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to set weekly availability';
            setError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const modalWidth = mode === 'weekly' ? 'max-w-4xl' : 'max-w-lg';

    return (
        <div
            className="fixed inset-0 bg-black/40 grid place-items-center p-4 z-50"
            onClick={onClose}
        >
            <div
                className={`w-full ${modalWidth} rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-6 shadow-xl max-h-[90vh] overflow-y-auto`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center mb-1">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        {isEditing ? 'Edit Room' : 'Add Room'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                        aria-label="Close"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                    {mode === 'weekly'
                        ? 'Select time cells across the week to queue a room for student usage.'
                        : 'Select a Room to add in the Queue'}
                </p>

                {/* Mode Tabs — hidden while editing an existing session */}
                {!isEditing && (
                    <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 p-1 bg-gray-50 dark:bg-gray-800 mb-5">
                        <button
                            type="button"
                            onClick={() => setMode('single')}
                            className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === 'single'
                                ? 'bg-indigo-600 text-white'
                                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                        >
                            Single Session
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('weekly')}
                            className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === 'weekly'
                                ? 'bg-indigo-600 text-white'
                                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                        >
                            Weekly Schedule
                        </button>
                    </div>
                )}

                {error && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg text-sm border border-red-200 dark:border-red-500/50">
                        {error}
                    </div>
                )}

                {mode === 'single' && (
                    <>
                        {/* Time Selection Row */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            {/* Start Time Dropdown */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Start Time
                                </label>
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (readOnly) return;
                                            setStartDropdownOpen(!startDropdownOpen);
                                            setEndDropdownOpen(false);
                                        }}
                                        disabled={readOnly}
                                        className={`w-full px-4 py-2 bg-white dark:bg-[#1e2939] border border-gray-300 dark:border-[#334155] rounded-md text-left text-gray-900 dark:text-white flex justify-between items-center text-sm ${readOnly ? 'opacity-60 cursor-not-allowed' : 'hover:border-gray-400 dark:hover:border-[#475569]'}`}
                                    >
                                        {startTime ? formatTimeDisplay(startTime) : 'Select time'}
                                        {!readOnly && <span className="text-gray-400">▼</span>}
                                    </button>
                                    {startDropdownOpen && (
                                        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-[#1e2939] border border-gray-300 dark:border-[#334155] rounded-md shadow-lg max-h-48 overflow-y-auto">
                                            {timeSlots.map((time) => {
                                                const occupied = isTimeOccupied(time);
                                                return (
                                                    <button
                                                        key={time}
                                                        type="button"
                                                        onClick={() => {
                                                            setStartTime(time);
                                                            setStartDropdownOpen(false);
                                                            if (endTime && time >= endTime) {
                                                                setEndTime('');
                                                            }
                                                        }}
                                                        className={`w-full px-4 py-2 text-left text-sm ${occupied
                                                            ? 'bg-red-50 text-red-600 dark:bg-red-500/30 dark:text-red-300'
                                                            : time === startTime
                                                                ? 'bg-blue-50 text-blue-600 dark:bg-blue-600 dark:text-white'
                                                                : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10'
                                                            }`}
                                                    >
                                                        {formatTimeDisplay(time)}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* End Time Dropdown */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    End Time
                                </label>
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (readOnly) return;
                                            setEndDropdownOpen(!endDropdownOpen);
                                            setStartDropdownOpen(false);
                                        }}
                                        disabled={readOnly}
                                        className={`w-full px-4 py-2 bg-white dark:bg-[#1e2939] border border-gray-300 dark:border-[#334155] rounded-md text-left text-gray-900 dark:text-white flex justify-between items-center text-sm ${readOnly ? 'opacity-60 cursor-not-allowed' : 'hover:border-gray-400 dark:hover:border-[#475569]'}`}
                                    >
                                        {endTime ? formatTimeDisplay(endTime) : 'Select time'}
                                        {!readOnly && <span className="text-gray-400">▼</span>}
                                    </button>
                                    {endDropdownOpen && (
                                        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-[#1e2939] border border-gray-300 dark:border-[#334155] rounded-md shadow-lg max-h-48 overflow-y-auto">
                                            {getEndTimeOptions().map((time) => {
                                                const occupied = isTimeOccupied(time, true);
                                                return (
                                                    <button
                                                        key={time}
                                                        type="button"
                                                        onClick={() => {
                                                            setEndTime(time);
                                                            setEndDropdownOpen(false);
                                                        }}
                                                        className={`w-full px-4 py-2 text-left text-sm ${occupied
                                                            ? 'bg-red-50 text-red-600 dark:bg-red-500/30 dark:text-red-300'
                                                            : time === endTime
                                                                ? 'bg-blue-50 text-blue-600 dark:bg-blue-600 dark:text-white'
                                                                : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10'
                                                            }`}
                                                    >
                                                        {formatTimeDisplay(time)}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {mode === 'weekly' && (
                    <div className="mb-6">
                        {/* Legend */}
                        <div className="mb-3 flex flex-wrap gap-3 text-xs text-gray-600 dark:text-gray-400">
                            <span className="inline-flex items-center gap-1.5">
                                <span className="h-3 w-3 rounded bg-gray-200 border border-gray-300" />
                                Available
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                                <span className="h-3 w-3 rounded bg-indigo-600" />
                                Selected
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                                <span className="h-3 w-3 rounded bg-red-400" />
                                Class
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                                <span className="h-3 w-3 rounded bg-amber-400" />
                                Booked
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                                <span className="h-3 w-3 rounded bg-blue-400" />
                                Queued
                            </span>
                        </div>

                        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-auto select-none" onMouseLeave={() => { isDraggingRef.current = false; dragDayRef.current = null; }}>
                            <div className="grid" style={{ gridTemplateColumns: '70px repeat(7, minmax(72px, 1fr))' }}>
                                {/* Header: corner + day columns */}
                                <div className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 border-b border-r border-gray-200 dark:border-gray-700 p-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                                    Time
                                </div>
                                {weekDays.map((day, dIdx) => (
                                    <div
                                        key={dIdx}
                                        className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-2 text-center text-xs font-semibold text-gray-700 dark:text-gray-300"
                                    >
                                        <div>{dayLabels[dIdx]}</div>
                                        <div className="text-[10px] font-normal text-gray-500 dark:text-gray-400">
                                            {`${day.getMonth() + 1}/${day.getDate()}`}
                                        </div>
                                    </div>
                                ))}

                                {/* Rows: one per 30-min slot */}
                                {timeSlots.map((time, slotIdx) => (
                                    <>
                                        <div
                                            key={`label-${slotIdx}`}
                                            className="border-b border-r border-gray-200 dark:border-gray-700 px-2 py-1 text-[11px] text-gray-500 dark:text-gray-400"
                                        >
                                            {formatTimeDisplay(time)}
                                        </div>
                                        {weekDays.map((_, dIdx) => {
                                            const key = `${dIdx}-${slotIdx}`;
                                            const selected = selectedCells.has(key);
                                            const blocker = getCellBlocker(dIdx, slotIdx, selectedRoom ?? undefined);
                                            let cellClass = 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700';
                                            let tip: string | undefined;
                                            if (blocker) {
                                                if (blocker.type === 'schedule') {
                                                    cellClass = 'bg-red-400 cursor-not-allowed';
                                                    tip = blocker.purpose || 'Class';
                                                } else if (blocker.purpose === 'Student Usage') {
                                                    cellClass = 'bg-blue-400 cursor-not-allowed';
                                                    tip = 'Queued';
                                                } else {
                                                    cellClass = 'bg-amber-400 cursor-not-allowed';
                                                    tip = blocker.purpose || blocker.bookedByName || 'Booked';
                                                }
                                            } else if (selected) {
                                                cellClass = 'bg-indigo-600 hover:bg-indigo-700';
                                            }
                                            return (
                                                <button
                                                    key={key}
                                                    type="button"
                                                    title={tip}
                                                    disabled={!!blocker || readOnly}
                                                    onMouseDown={() => handleCellMouseDown(dIdx, slotIdx, !!blocker)}
                                                    onMouseEnter={() => handleCellMouseEnter(dIdx, slotIdx, !!blocker)}
                                                    onClick={(e) => {
                                                        // If click came without drag (mouseup with no enter), ensure toggle still happens.
                                                        e.preventDefault();
                                                    }}
                                                    className={`h-7 border-b border-gray-200 dark:border-gray-700 ${dIdx < 6 ? 'border-r' : ''} ${cellClass} transition-colors`}
                                                />
                                            );
                                        })}
                                    </>
                                ))}
                            </div>
                        </div>
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            Tip: click and drag within a day column to select a range.
                        </p>
                    </div>
                )}

                {/* Available Rooms Grid */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {mode === 'weekly' ? 'Available Rooms (for all selected cells)' : 'Available Rooms for Current Time'}
                    </label>
                    <div className="grid grid-cols-4 gap-3">
                        {availableRooms.length === 0 ? (
                            <p className="col-span-4 text-center text-gray-500 dark:text-gray-400 py-4 text-sm">
                                No rooms available for this category
                            </p>
                        ) : (
                            availableRooms.map((room) => {
                                const blocker = mode === 'weekly'
                                    ? getWeeklyRoomBlocker(room.Room_ID)
                                    : getRoomBlocker(room.Room_ID);
                                const booked = !!blocker;
                                const blockedLabel = blocker?.type === 'schedule'
                                    ? 'Class'
                                    : blocker?.purpose === 'Student Usage'
                                        ? 'Queued'
                                        : 'Booked';
                                return (
                                    <button
                                        key={room.Room_ID}
                                        type="button"
                                        onClick={() => !booked && !isEditing && setSelectedRoom(room.Room_ID)}
                                        disabled={isEditing || booked}
                                        className={`px-2 py-2.5 rounded-md border text-sm font-medium transition-colors truncate ${booked
                                            ? 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed dark:border-gray-700 dark:bg-gray-800 dark:text-gray-600'
                                            : selectedRoom === room.Room_ID
                                                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-600/20 dark:text-indigo-300'
                                                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-700'
                                            } ${isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        title={booked ? `${room.Name} - ${blockedLabel}` : room.Name}
                                    >
                                        {room.Name}
                                        {booked && <span className="block text-xs text-gray-400">{blockedLabel}</span>}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Single-session: show today's schedule for the selected room */}
                {mode === 'single' && selectedRoom !== null && (() => {
                    const room = availableRooms.find(r => r.Room_ID === selectedRoom);
                    if (!room) return null;
                    // Determine the target day from initialStartTime (or current startTime).
                    const refIso = initialStartTime || startTime;
                    const targetDay = refIso && refIso.includes('T')
                        ? new Date(refIso)
                        : new Date();
                    const dayStart = new Date(targetDay);
                    dayStart.setHours(0, 0, 0, 0);
                    const dayEnd = new Date(dayStart);
                    dayEnd.setDate(dayEnd.getDate() + 1);
                    const todaysSessions = (weekSessions || [])
                        .filter(s => s.roomId === selectedRoom)
                        .filter(s => {
                            const sStart = new Date(s.startTime).getTime();
                            const sEnd = new Date(s.endTime).getTime();
                            return sStart < dayEnd.getTime() && sEnd > dayStart.getTime();
                        })
                        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

                    const formatTime = (iso: string) => {
                        const d = new Date(iso);
                        const h = d.getHours();
                        const m = d.getMinutes();
                        const period = h >= 12 ? 'PM' : 'AM';
                        const h12 = h % 12 || 12;
                        return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
                    };
                    const dateLabel = dayStart.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

                    return (
                        <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/60">
                            <div className="mb-2 flex items-center justify-between">
                                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                    {room.Name} · {dateLabel}
                                </span>
                                <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                                    {todaysSessions.length} {todaysSessions.length === 1 ? 'entry' : 'entries'}
                                </span>
                            </div>
                            {todaysSessions.length === 0 ? (
                                <p className="text-xs italic text-gray-500 dark:text-gray-400">
                                    Nothing scheduled for this room today.
                                </p>
                            ) : (
                                <ul className="space-y-1.5">
                                    {todaysSessions.map((s, i) => {
                                        const kindLabel = s.type === 'schedule'
                                            ? 'Class'
                                            : s.purpose === 'Student Usage'
                                                ? 'Queued'
                                                : 'Booked';
                                        const kindClass = s.type === 'schedule'
                                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                            : s.purpose === 'Student Usage'
                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
                                        return (
                                            <li key={i} className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                                                <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${kindClass}`}>
                                                    {kindLabel}
                                                </span>
                                                <span className="font-mono tabular-nums text-gray-600 dark:text-gray-400">
                                                    {formatTime(s.startTime)} – {formatTime(s.endTime)}
                                                </span>
                                                <span className="truncate">
                                                    {s.purpose || (s.type === 'schedule' ? 'Scheduled class' : 'Booked')}
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    );
                })()}

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Cancel
                    </button>
                    {isEditing && !readOnly && (
                        <button
                            type="button"
                            onClick={() => selectedQueueItem && onRemove(selectedQueueItem)}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                            Remove
                        </button>
                    )}
                    {!readOnly && (
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            {submitting ? 'Saving...' : 'Confirm'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
