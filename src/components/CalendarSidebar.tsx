import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import type { Room } from '@/types/room';
import type { BorrowingRequest } from '@/components/RequestCard';
import { useState } from 'react';
import { CalendarDays, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CircleDashed, DoorOpen, Plus, XCircle } from 'lucide-react';

interface CalendarSidebarProps {
    rooms: Room[];
    selectedRooms: number[];
    onRoomToggle: (roomId: number) => void;
    onSelectAll: (selectAll: boolean) => void;
    onDateSelect: (date: Date) => void;
    selectedDate: Date;
    onCreateClick: () => void;
    borrowingRequests?: BorrowingRequest[];
    showBorrowingRequests?: boolean;
    myBookings?: any[];
    onBookingClick?: (booking: any) => void;
}

const getStatus = (booking: any) => String(booking.extendedProps?.status || 'PENDING').toUpperCase();

const getStatusClasses = (status: string) => {
    switch (status) {
        case 'APPROVED':
            return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300';
        case 'PENDING':
            return 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300';
        case 'REJECTED':
            return 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300';
        default:
            return 'border-slate-300 bg-slate-100 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300';
    }
};

const formatBookingDate = (date: string | Date) => new Date(date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
});

const formatBookingTime = (start: string | Date, end: string | Date) => {
    const formatter = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
    return `${formatter.format(new Date(start))} - ${formatter.format(new Date(end))}`;
};

export default function CalendarSidebar({
    rooms,
    selectedRooms,
    onRoomToggle,
    onSelectAll,
    onDateSelect,
    selectedDate,
    onCreateClick,
    borrowingRequests: _borrowingRequests = [],
    showBorrowingRequests: _showBorrowingRequests = false,
    myBookings = [],
    onBookingClick,
}: CalendarSidebarProps) {
    const allSelected = rooms.length > 0 && selectedRooms.length === rooms.length;

    const requestedSchedules = myBookings.filter(b => getStatus(b) === 'PENDING').length;
    const acceptedSchedules = myBookings.filter(b => getStatus(b) === 'APPROVED').length;
    const rejectedSchedules = myBookings.filter(b => getStatus(b) === 'REJECTED').length;

    const [isRoomsCollapsed, setIsRoomsCollapsed] = useState(false);
    const [isSchedulesCollapsed, setIsSchedulesCollapsed] = useState(false);

    const scheduleStats = [
        { label: 'Requested', value: requestedSchedules, Icon: CircleDashed, classes: 'border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-300' },
        { label: 'Accepted', value: acceptedSchedules, Icon: CheckCircle2, classes: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300' },
        { label: 'Rejected', value: rejectedSchedules, Icon: XCircle, classes: 'border-rose-500/25 bg-rose-500/10 text-rose-600 dark:text-rose-300' },
    ];

    return (
        <aside className="flex h-full w-[19rem] shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white/95 p-4 text-slate-950 dark:border-white/10 dark:bg-slate-950/95 dark:text-white">
            <button
                type="button"
                onClick={onCreateClick}
                className="group mb-4 flex shrink-0 items-center justify-between rounded-3xl border border-indigo-500/20 bg-indigo-600 px-5 py-4 text-left text-white shadow-lg shadow-indigo-600/20 transition hover:-translate-y-0.5 hover:bg-indigo-500 dark:border-cyan-300/20 dark:bg-cyan-400 dark:text-slate-950 dark:shadow-cyan-400/20"
            >
                <span>
                    <span className="block text-xs font-semibold uppercase tracking-[0.22em] opacity-80">New booking</span>
                    <span className="mt-1 block text-lg font-black">Create schedule</span>
                </span>
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/20 transition group-hover:scale-105 dark:bg-slate-950/15">
                    <Plus className="h-5 w-5" />
                </span>
            </button>

            <div className="calendar-dark mb-4 shrink-0 rounded-3xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.03]">
                <Calendar
                    onChange={(value) => {
                        if (value instanceof Date) {
                            onDateSelect(value);
                        }
                    }}
                    value={selectedDate}
                    className="!border-none !bg-transparent text-sm"
                    tileClassName="!rounded-full !text-slate-700 hover:!bg-white dark:!text-slate-300 dark:hover:!bg-white/10"
                    navigationLabel={({ date }) => (
                        <span className="text-sm font-black text-slate-950 dark:text-white">
                            {date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </span>
                    )}
                    prevLabel={<ChevronLeft className="h-4 w-4 text-slate-500 dark:text-slate-400" />}
                    nextLabel={<ChevronRight className="h-4 w-4 text-slate-500 dark:text-slate-400" />}
                    prev2Label={null}
                    next2Label={null}
                />
            </div>

            <section className="flex min-h-0 flex-1 flex-col rounded-3xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="mb-3 flex shrink-0 items-center justify-between gap-3 px-1">
                    <div>
                        <div className="flex items-center gap-2 text-sm font-black text-slate-950 dark:text-white">
                            <DoorOpen className="h-4 w-4 text-indigo-500 dark:text-cyan-300" />
                            Rooms
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{selectedRooms.length} of {rooms.length} selected</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsRoomsCollapsed(!isRoomsCollapsed)}
                        className="rounded-full p-2 text-slate-400 transition hover:bg-white hover:text-slate-950 dark:hover:bg-white/10 dark:hover:text-white"
                        aria-expanded={!isRoomsCollapsed}
                        aria-label="Toggle room filters"
                    >
                        <ChevronDown className={`h-4 w-4 transition-transform ${isRoomsCollapsed ? '-rotate-90' : ''}`} />
                    </button>
                </div>

                {!isRoomsCollapsed && (
                    <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1 custom-scrollbar">
                        <label className="mb-2 flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 transition hover:border-indigo-300 dark:border-white/10 dark:bg-slate-950/40 dark:hover:border-cyan-300/40">
                            <input
                                type="checkbox"
                                checked={allSelected}
                                onChange={() => onSelectAll(!allSelected)}
                                className="h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 bg-white text-indigo-600 focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-cyan-400 dark:focus:ring-cyan-400"
                            />
                            <div className="min-w-0">
                                <span className="block text-sm font-bold text-slate-800 dark:text-slate-100">All Rooms</span>
                                <span className="block text-xs text-slate-500 dark:text-slate-500">Show every laboratory booking</span>
                            </div>
                        </label>

                        {rooms.map((room) => {
                            const isSelected = selectedRooms.includes(room.Room_ID);
                            return (
                                <label
                                    key={room.Room_ID}
                                    className={`flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 transition ${isSelected
                                        ? 'bg-indigo-50 text-indigo-700 dark:bg-cyan-400/10 dark:text-cyan-200'
                                        : 'text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-white/10'
                                        }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => onRoomToggle(room.Room_ID)}
                                        className="h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 bg-white text-indigo-600 focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-cyan-400 dark:focus:ring-cyan-400"
                                    />
                                    <span className={`h-2.5 w-2.5 rounded-full ${isSelected ? 'bg-indigo-500 dark:bg-cyan-300' : 'bg-slate-300 dark:bg-slate-600'}`} />
                                    <span className="truncate text-sm font-semibold">{room.Name}</span>
                                </label>
                            );
                        })}
                    </div>
                )}
            </section>

            {myBookings.length > 0 && (
                <section className="mt-4 flex max-h-[42%] min-h-[210px] flex-col rounded-3xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.03]">
                    <div className="mb-3 flex shrink-0 items-center justify-between gap-3 px-1">
                        <div>
                            <div className="flex items-center gap-2 text-sm font-black text-slate-950 dark:text-white">
                                <CalendarDays className="h-4 w-4 text-indigo-500 dark:text-cyan-300" />
                                My Schedules
                            </div>
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{myBookings.length} total requests</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsSchedulesCollapsed(!isSchedulesCollapsed)}
                            className="rounded-full p-2 text-slate-400 transition hover:bg-white hover:text-slate-950 dark:hover:bg-white/10 dark:hover:text-white"
                            aria-expanded={!isSchedulesCollapsed}
                            aria-label="Toggle my schedules"
                        >
                            <ChevronDown className={`h-4 w-4 transition-transform ${isSchedulesCollapsed ? '-rotate-90' : ''}`} />
                        </button>
                    </div>

                    {!isSchedulesCollapsed && (
                        <>
                            <div className="grid grid-cols-3 gap-2">
                                {scheduleStats.map(({ label, value, Icon, classes }) => (
                                    <div key={label} className={`rounded-2xl border p-2 ${classes}`}>
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-[10px] font-bold uppercase tracking-wide">{label}</span>
                                            <Icon className="h-3.5 w-3.5" />
                                        </div>
                                        <div className="mt-1 text-xl font-black">{value}</div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 custom-scrollbar">
                                {[...myBookings]
                                    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
                                    .map((booking) => {
                                        const status = getStatus(booking);
                                        return (
                                            <button
                                                key={booking.id}
                                                type="button"
                                                onClick={() => onBookingClick?.(booking)}
                                                className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-sm dark:border-white/10 dark:bg-slate-950/40 dark:hover:border-cyan-300/40"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{booking.title}</p>
                                                        <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{booking.extendedProps.roomName}</p>
                                                    </div>
                                                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${getStatusClasses(status)}`}>
                                                        {status}
                                                    </span>
                                                </div>
                                                <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                                                    <span>{formatBookingDate(booking.start)}</span>
                                                    <span>{formatBookingTime(booking.start, booking.end)}</span>
                                                </div>
                                            </button>
                                        );
                                    })}
                            </div>
                        </>
                    )}
                </section>
            )}
        </aside>
    );
}