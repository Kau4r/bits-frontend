import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Monitor, Apple, Plus } from 'lucide-react';
import type { Room as RoomType, RoomSession, LabType } from '@/types/room';

interface WeeklySwimlaneGridProps {
    rooms: RoomType[];
    weekSessions: RoomSession[];
    weekStart: Date; // Monday of the displayed week
    currentTime: Date;
    onSlotClick: (labType: LabType, startISO: string, endISO: string) => void;
    onBlockerClick: (blocker: RoomSession, room: RoomType | undefined) => void;
    onAddRoom: (labType: LabType, day: Date) => void;
}

const DAY_START_HOUR = 7;
const DAY_END_HOUR = 21; // 9 PM
const DAY_TOTAL_MINUTES = (DAY_END_HOUR - DAY_START_HOUR) * 60;
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_COUNT = DAY_LABELS.length;

// Bar height per lane in pixels; also used for min lane area.
const LANE_HEIGHT = 26;
const LANE_GAP = 3;

type BarKind = 'schedule' | 'queue' | 'booking';

interface Bar {
    id: string;
    kind: BarKind;
    label: string;
    subLabel?: string;
    startMin: number;
    endMin: number;
    lane: number;
    session: RoomSession;
    room: RoomType | undefined;
}

// Pack overlapping bars into lanes (first-fit scan). Input is mutated only in
// terms of sort order; a fresh array is returned.
const assignLanes = (bars: Bar[]): Bar[] => {
    const sorted = [...bars].sort((a, b) => a.startMin - b.startMin);
    const laneEnds: number[] = [];
    for (const bar of sorted) {
        let lane = laneEnds.findIndex(e => e <= bar.startMin);
        if (lane === -1) {
            lane = laneEnds.length;
            laneEnds.push(bar.endMin);
        } else {
            laneEnds[lane] = bar.endMin;
        }
        bar.lane = lane;
    }
    return sorted;
};

// Convert a session to a Bar for a given day (if it overlaps that day at all).
const sessionToBar = (
    s: RoomSession,
    day: Date,
    rooms: RoomType[],
): Bar | null => {
    const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0).getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;

    const sStart = new Date(s.startTime).getTime();
    const sEnd = new Date(s.endTime).getTime();
    if (sEnd <= dayStart || sStart >= dayEnd) return null;

    const clippedStart = Math.max(sStart, dayStart);
    const clippedEnd = Math.min(sEnd, dayEnd);

    // Minutes from DAY_START_HOUR, clipped to [0, DAY_TOTAL_MINUTES].
    const startOfWorkDay = dayStart + DAY_START_HOUR * 60 * 60 * 1000;
    const startMinRaw = Math.round((clippedStart - startOfWorkDay) / 60000);
    const endMinRaw = Math.round((clippedEnd - startOfWorkDay) / 60000);
    const startMin = Math.max(0, Math.min(DAY_TOTAL_MINUTES, startMinRaw));
    const endMin = Math.max(0, Math.min(DAY_TOTAL_MINUTES, endMinRaw));
    if (endMin <= startMin) return null;

    const room = rooms.find(r => r.Room_ID === s.roomId);

    let kind: BarKind;
    let label: string;
    let subLabel: string | undefined;
    if (s.type === 'schedule') {
        kind = 'schedule';
        label = s.purpose || 'Class';
        subLabel = room?.Name;
    } else if (s.purpose === 'Student Usage') {
        kind = 'queue';
        label = room?.Name || `Room ${s.roomId}`;
        subLabel = 'Student Usage';
    } else {
        kind = 'booking';
        label = room?.Name || 'Room';
        subLabel = s.purpose || s.bookedByName || 'Booked';
    }

    return {
        id: `${s.type}-${s.id ?? 'sched'}-${s.roomId}-${s.startTime}-${s.endTime}`,
        kind,
        label,
        subLabel,
        startMin,
        endMin,
        lane: 0,
        session: s,
        room,
    };
};

// Format a time in minutes-from-DAY_START_HOUR as an hour label like "2 PM".
const formatHourLabel = (hour24: number) => {
    const period = hour24 >= 12 ? 'PM' : 'AM';
    const h12 = hour24 % 12 || 12;
    return `${h12} ${period}`;
};

// Compute "available now" for a lab type: rooms with no active booking/queue
// that covers the current moment.
const computeAvailableNow = (
    rooms: RoomType[],
    sessions: RoomSession[],
    now: Date,
): number => {
    const nowMs = now.getTime();
    return rooms.filter(r => {
        const isBusy = sessions.some(s =>
            s.roomId === r.Room_ID &&
            new Date(s.startTime).getTime() <= nowMs &&
            new Date(s.endTime).getTime() > nowMs,
        );
        return !isBusy;
    }).length;
};

// A single day strip with time ruler, "+ Add Room" button, and absolute bars.
interface DayStripProps {
    day: Date;
    labType: LabType;
    rooms: RoomType[];
    sessions: RoomSession[];
    isToday: boolean;
    currentTime: Date;
    onSlotClick: (labType: LabType, startISO: string, endISO: string) => void;
    onBlockerClick: (blocker: RoomSession, room: RoomType | undefined) => void;
    onAddRoom: (labType: LabType, day: Date) => void;
}

const DayStrip = ({
    day,
    labType,
    rooms,
    sessions,
    isToday,
    currentTime,
    onSlotClick,
    onBlockerClick,
    onAddRoom,
}: DayStripProps) => {
    const bars = useMemo(() => {
        const all: Bar[] = [];
        for (const s of sessions) {
            const bar = sessionToBar(s, day, rooms);
            if (bar) all.push(bar);
        }
        return assignLanes(all);
    }, [sessions, day, rooms]);

    const laneCount = bars.reduce((m, b) => Math.max(m, b.lane + 1), 0);
    const minContainerHeight = Math.max(LANE_HEIGHT + 4, laneCount * (LANE_HEIGHT + LANE_GAP) + 4);

    // Hour ticks: 7, 8, ..., 21.
    const hourTicks = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR + 1 }, (_, i) => DAY_START_HOUR + i);

    // Count classes for the "N classes" badge.
    const classCount = bars.filter(b => b.kind === 'schedule').length;

    // Handle clicking empty space on the strip → pick a 1-hour range starting
    // at the nearest 30-minute tick.
    const handleStripClick = (e: React.MouseEvent<HTMLDivElement>) => {
        // Only allocate if the click target is the strip itself, not a bar.
        const target = e.target as HTMLElement;
        if (target.closest('[data-bar]')) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const clickedMin = Math.round((ratio * DAY_TOTAL_MINUTES) / 30) * 30;
        const startMin = Math.min(DAY_TOTAL_MINUTES - 60, clickedMin);
        const endMin = Math.min(DAY_TOTAL_MINUTES, startMin + 60);

        const start = new Date(day);
        start.setHours(DAY_START_HOUR + Math.floor(startMin / 60), startMin % 60, 0, 0);
        const end = new Date(day);
        end.setHours(DAY_START_HOUR + Math.floor(endMin / 60), endMin % 60, 0, 0);

        onSlotClick(labType, start.toISOString(), end.toISOString());
    };

    // Current-time indicator position (for today only).
    const nowIndicatorPct = (() => {
        if (!isToday) return null;
        const h = currentTime.getHours();
        const m = currentTime.getMinutes();
        const nowMin = (h - DAY_START_HOUR) * 60 + m;
        if (nowMin < 0 || nowMin > DAY_TOTAL_MINUTES) return null;
        return (nowMin / DAY_TOTAL_MINUTES) * 100;
    })();

    return (
        <div className={`rounded-lg border transition-colors ${isToday
            ? 'border-indigo-300 bg-indigo-50/50 ring-2 ring-indigo-200 dark:border-indigo-700 dark:bg-indigo-950/20 dark:ring-indigo-800'
            : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'}`}
        >
            {/* Day header */}
            <div className={`flex items-center justify-between gap-2 border-b px-3 py-2 ${isToday
                ? 'border-indigo-200 bg-indigo-100/60 dark:border-indigo-800 dark:bg-indigo-900/30'
                : 'border-gray-100 dark:border-gray-800'}`}
            >
                <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${isToday ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-900 dark:text-white'}`}>
                        {dayjs(day).format('ddd, MMM D')}
                    </span>
                    {isToday && (
                        <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                            Today
                        </span>
                    )}
                    {classCount > 0 && (
                        <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-900/40 dark:text-red-300">
                            {classCount} {classCount === 1 ? 'class' : 'classes'}
                        </span>
                    )}
                </div>
                <button
                    type="button"
                    onClick={() => onAddRoom(labType, day)}
                    className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-700"
                >
                    <Plus className="h-3 w-3" />
                    Add Room
                </button>
            </div>

            {/* Hour ruler */}
            <div className="relative h-5 border-b border-gray-100 px-3 dark:border-gray-800">
                <div className="relative h-full">
                    {hourTicks.map(h => {
                        const leftPct = ((h - DAY_START_HOUR) * 60 / DAY_TOTAL_MINUTES) * 100;
                        return (
                            <span
                                key={h}
                                className="absolute top-0.5 -translate-x-1/2 text-[9px] font-medium text-gray-400 dark:text-gray-500"
                                style={{ left: `${leftPct}%` }}
                            >
                                {formatHourLabel(h)}
                            </span>
                        );
                    })}
                </div>
            </div>

            {/* Strip with bars */}
            <div
                className="cursor-crosshair px-3 py-2 hover:bg-indigo-50/40 dark:hover:bg-indigo-900/10"
                onClick={handleStripClick}
            >
                {/* Inner canvas: bars/lines/indicator are positioned purely in %
                    relative to this box, which is the exact paintable area. This
                    prevents bars near 9 PM from leaking past the right edge. */}
                <div
                    className="relative w-full overflow-hidden"
                    style={{ minHeight: `${minContainerHeight}px` }}
                >
                    {/* Hour grid lines (subtle) */}
                    {hourTicks.map(h => {
                        const leftPct = ((h - DAY_START_HOUR) * 60 / DAY_TOTAL_MINUTES) * 100;
                        return (
                            <span
                                key={`line-${h}`}
                                className="pointer-events-none absolute top-0 bottom-0 w-px bg-gray-100 dark:bg-gray-800"
                                style={{ left: `${leftPct}%` }}
                            />
                        );
                    })}

                    {/* Current-time indicator */}
                    {nowIndicatorPct !== null && (
                        <div
                            className="pointer-events-none absolute inset-y-0 z-10 w-[2px] bg-indigo-500"
                            style={{ left: `calc(${nowIndicatorPct}% - 1px)` }}
                        />
                    )}

                    {/* Bars */}
                    {bars.map(bar => {
                        const leftPct = (bar.startMin / DAY_TOTAL_MINUTES) * 100;
                        const rawWidthPct = ((bar.endMin - bar.startMin) / DAY_TOTAL_MINUTES) * 100;
                        // Clamp width so the bar never extends past the right edge.
                        const widthPct = Math.min(rawWidthPct, 100 - leftPct);
                        const top = bar.lane * (LANE_HEIGHT + LANE_GAP) + 2;
                        const kindClass =
                            bar.kind === 'schedule'
                                ? 'bg-red-500/90 hover:bg-red-600 border-red-600 text-white'
                                : bar.kind === 'queue'
                                    ? 'bg-green-500/90 hover:bg-green-600 border-green-600 text-white'
                                    : 'bg-amber-400/90 hover:bg-amber-500 border-amber-500 text-amber-950';
                        const tooltip = `${bar.label}${bar.subLabel ? ` · ${bar.subLabel}` : ''} (${dayjs(bar.session.startTime).format('h:mm A')} – ${dayjs(bar.session.endTime).format('h:mm A')})`;
                        return (
                            <button
                                key={bar.id}
                                data-bar
                                type="button"
                                title={tooltip}
                                onClick={e => {
                                    e.stopPropagation();
                                    onBlockerClick(bar.session, bar.room);
                                }}
                                className={`absolute overflow-hidden rounded-md border px-1.5 text-left text-[10px] font-semibold shadow-sm transition-colors ${kindClass}`}
                                style={{
                                    left: `${leftPct}%`,
                                    width: `${widthPct}%`,
                                    top: `${top}px`,
                                    height: `${LANE_HEIGHT}px`,
                                }}
                            >
                                <div className="flex h-full flex-col justify-center leading-tight">
                                    <span className="truncate">{bar.label}</span>
                                    {bar.subLabel && (
                                        <span className="truncate text-[9px] font-normal opacity-90">{bar.subLabel}</span>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

// A lab-type section: header + 6 day strips stacked.
interface LabSectionProps {
    labType: LabType;
    title: string;
    rooms: RoomType[];
    weekSessions: RoomSession[];
    weekDays: Date[];
    currentTime: Date;
    onSlotClick: (labType: LabType, startISO: string, endISO: string) => void;
    onBlockerClick: (blocker: RoomSession, room: RoomType | undefined) => void;
    onAddRoom: (labType: LabType, day: Date) => void;
}

const LabSection = ({
    labType,
    title: _title,
    rooms,
    weekSessions,
    weekDays,
    currentTime,
    onSlotClick,
    onBlockerClick,
    onAddRoom,
}: LabSectionProps) => {
    const sectionRoomIds = useMemo(() => new Set(rooms.map(r => r.Room_ID)), [rooms]);

    // Only include sessions for rooms in this lab type.
    const allSectionSessions = useMemo(
        () => weekSessions.filter(s => sectionRoomIds.has(s.roomId)),
        [weekSessions, sectionRoomIds],
    );

    // Rooms that have at least one Student Usage queue in the viewed week.
    // We ONLY show sessions for these rooms to keep the swimlane simple
    // (classes/bookings on un-queued rooms were cluttering the view).
    const queuedRoomIds = useMemo(() => {
        const ids = new Set<number>();
        for (const s of allSectionSessions) {
            if (s.type === 'booking' && s.purpose === 'Student Usage') {
                ids.add(s.roomId);
            }
        }
        return ids;
    }, [allSectionSessions]);

    const sectionSessions = useMemo(
        () => allSectionSessions.filter(s => queuedRoomIds.has(s.roomId)),
        [allSectionSessions, queuedRoomIds],
    );
    // availableNow must use ALL sessions (including classes/bookings for
    // un-queued rooms), otherwise busy-with-class rooms look free.
    const availableNow = useMemo(
        () => computeAvailableNow(rooms, allSectionSessions, currentTime),
        [rooms, allSectionSessions, currentTime],
    );
    const todayKey = dayjs(currentTime).format('YYYY-MM-DD');

    return (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    {rooms.length} {rooms.length === 1 ? 'room' : 'rooms'} shown
                </p>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300">
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                    {availableNow} room{availableNow === 1 ? '' : 's'} available now
                </span>
            </div>

            {rooms.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-400">
                    No {labType === 'WINDOWS' ? 'Windows' : 'Mac'} labs configured.
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    {weekDays.map(day => (
                        <DayStrip
                            key={day.toISOString()}
                            day={day}
                            labType={labType}
                            rooms={rooms}
                            sessions={sectionSessions}
                            isToday={dayjs(day).format('YYYY-MM-DD') === todayKey}
                            currentTime={currentTime}
                            onSlotClick={onSlotClick}
                            onBlockerClick={onBlockerClick}
                            onAddRoom={onAddRoom}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default function WeeklySwimlaneGrid({
    rooms,
    weekSessions,
    weekStart,
    currentTime,
    onSlotClick,
    onBlockerClick,
    onAddRoom,
}: WeeklySwimlaneGridProps) {
    const [activeTab, setActiveTab] = useState<LabType>('WINDOWS');

    const weekDays = useMemo(
        () => Array.from({ length: DAY_COUNT }, (_, i) => {
            const d = new Date(weekStart);
            d.setDate(weekStart.getDate() + i);
            d.setHours(0, 0, 0, 0);
            return d;
        }),
        [weekStart],
    );

    const windowsLabs = useMemo(
        () => rooms.filter(r => r.Room_Type === 'LAB' && r.Lab_Type === 'WINDOWS'),
        [rooms],
    );
    const macLabs = useMemo(
        () => rooms.filter(r => r.Room_Type === 'LAB' && r.Lab_Type === 'MAC'),
        [rooms],
    );

    return (
        <div className="flex flex-col gap-3">
            {/* Tab header + legend */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex rounded-lg border border-gray-300 bg-white shadow-sm dark:border-gray-600 dark:bg-gray-900">
                    <button
                        type="button"
                        onClick={() => setActiveTab('WINDOWS')}
                        className={`inline-flex items-center gap-2 rounded-l-lg px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'WINDOWS'
                            ? 'bg-indigo-600 text-white'
                            : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                            }`}
                    >
                        <Monitor className="h-4 w-4" />
                        Windows labs
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${activeTab === 'WINDOWS'
                            ? 'bg-white/20 text-white'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
                            {windowsLabs.length}
                        </span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('MAC')}
                        className={`inline-flex items-center gap-2 rounded-r-lg px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'MAC'
                            ? 'bg-indigo-600 text-white'
                            : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                            }`}
                    >
                        <Apple className="h-4 w-4" />
                        Mac labs
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${activeTab === 'MAC'
                            ? 'bg-white/20 text-white'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
                            {macLabs.length}
                        </span>
                    </button>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                    <span className="inline-flex items-center gap-1">
                        <span className="h-2.5 w-2.5 rounded bg-red-500" /> Class
                    </span>
                    <span className="inline-flex items-center gap-1">
                        <span className="h-2.5 w-2.5 rounded bg-amber-400" /> Booked
                    </span>
                    <span className="inline-flex items-center gap-1">
                        <span className="h-2.5 w-2.5 rounded bg-green-500" /> Queued
                    </span>
                </div>
            </div>

            <p className="text-[11px] italic text-gray-500 dark:text-gray-400">
                Click an empty area to queue a room · click a colored bar for details
            </p>

            {activeTab === 'WINDOWS' ? (
                <LabSection
                    labType="WINDOWS"
                    title="Windows Laboratories"
                    rooms={windowsLabs}
                    weekSessions={weekSessions}
                    weekDays={weekDays}
                    currentTime={currentTime}
                    onSlotClick={onSlotClick}
                    onBlockerClick={onBlockerClick}
                    onAddRoom={onAddRoom}
                />
            ) : (
                <LabSection
                    labType="MAC"
                    title="Mac Laboratories"
                    rooms={macLabs}
                    weekSessions={weekSessions}
                    weekDays={weekDays}
                    currentTime={currentTime}
                    onSlotClick={onSlotClick}
                    onBlockerClick={onBlockerClick}
                    onAddRoom={onAddRoom}
                />
            )}
        </div>
    );
}
