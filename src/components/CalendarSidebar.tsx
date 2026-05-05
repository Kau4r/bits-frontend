import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface CalendarSidebarProps {
    onDateSelect: (date: Date) => void;
    selectedDate: Date;
    onCreateClick: () => void;
    myBookings?: any[];
    showRejectedBookings?: boolean;
    onBookingClick?: (booking: any) => void;
}

export default function CalendarSidebar({
    onDateSelect,
    selectedDate,
    onCreateClick,
    myBookings = [],
    showRejectedBookings = false,
    onBookingClick,
}: CalendarSidebarProps) {
    // Counters reflect the full picture (including rejected) so the Rejected
    // filter card is always discoverable, even when the parent passes
    // showRejectedBookings=false. The default list view still respects the
    // parent's preference — REJECTED rows are hidden until the user opts in
    // by clicking the Rejected filter.
    const requestedSchedules = myBookings.filter(b => b.extendedProps.status === 'PENDING').length;
    const acceptedSchedules = myBookings.filter(b => b.extendedProps.status === 'APPROVED').length;
    const rejectedSchedules = myBookings.filter(b => b.extendedProps.status === 'REJECTED').length;
    const visibleBookings = showRejectedBookings
        ? myBookings
        : myBookings.filter(b => b.extendedProps.status !== 'REJECTED');

    const [isCalendarCollapsed, setIsCalendarCollapsed] = useState(false);
    const [isSchedulesCollapsed, setIsSchedulesCollapsed] = useState(false);
    // null = no filter (show all visible bookings); otherwise restrict to one
    // status. When the user picks REJECTED, source from myBookings so the
    // parent's hide-rejected default is overridden by the explicit filter.
    const [statusFilter, setStatusFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | null>(null);
    const filteredBookings = statusFilter
        ? myBookings.filter(b => b.extendedProps.status === statusFilter)
        : visibleBookings;
    const toggleFilter = (status: 'PENDING' | 'APPROVED' | 'REJECTED') =>
        setStatusFilter(prev => (prev === status ? null : status));

    // Sunday-anchored week comparison (react-calendar defaults to en-US,
    // which starts the week on Sunday). Returns true when both dates fall
    // in the same calendar-week row inside the month view.
    const isSameWeek = (a: Date, b: Date) => {
        const startOfWeek = (d: Date) => {
            const start = new Date(d);
            start.setDate(start.getDate() - start.getDay());
            start.setHours(0, 0, 0, 0);
            return start;
        };
        return startOfWeek(a).getTime() === startOfWeek(b).getTime();
    };

    return (
        <div className="flex h-full w-72 shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white/95 p-4 shadow-sm shadow-slate-200/60 dark:border-[#334155] dark:bg-[#1e2939] dark:shadow-none">
            <button
                type="button"
                onClick={() => { setIsCalendarCollapsed(true); onCreateClick(); }}
                className="group mb-5 grid shrink-0 grid-cols-[1fr_1.5rem] items-center rounded-xl border border-[#615fff] bg-[#615fff] px-4 py-3 text-white shadow-sm shadow-[#615fff]/20 transition-all hover:bg-[#504eea] dark:border-[#615fff] dark:bg-[#615fff] dark:text-white dark:shadow-[#615fff]/20 dark:hover:bg-[#504eea]"
            >
                <span className="justify-self-center pl-6 font-semibold leading-6">Create booking</span>
                <span className="grid h-6 w-6 place-items-center rounded-md text-lg font-semibold leading-none transition-transform group-hover:scale-110">+</span>
            </button>

            <div className="mb-5 shrink-0 rounded-xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[0.04]">
                <button
                    type="button"
                    onClick={() => setIsCalendarCollapsed(!isCalendarCollapsed)}
                    className="flex w-full items-center justify-between px-3 py-2.5"
                >
                    <span className="text-sm font-semibold text-slate-700 dark:text-gray-300">
                        {isCalendarCollapsed
                            ? selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                            : 'Calendar'}
                    </span>
                    <ChevronDown
                        className="h-4 w-4 text-slate-400 transition-transform dark:text-gray-500"
                        style={{ transform: isCalendarCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
                    />
                </button>
                {!isCalendarCollapsed && (
                    <div className="calendar-dark px-3 pb-3">
                        <Calendar
                            onChange={(value) => {
                                if (value instanceof Date) {
                                    onDateSelect(value);
                                }
                            }}
                            value={selectedDate}
                            className="!border-none !bg-transparent text-sm"
                            tileClassName={({ date, view }) => {
                                const base = '!rounded-lg !text-slate-600 hover:!bg-white dark:!text-gray-300 dark:hover:!bg-white/10';
                                if (view !== 'month') return base;
                                const isSelectedDay = date.toDateString() === selectedDate.toDateString();
                                if (!isSelectedDay && isSameWeek(date, selectedDate)) {
                                    return `${base} !bg-[#006edc]/40 dark:!bg-[#1e40af]/40`;
                                }
                                return base;
                            }}
                            navigationLabel={({ date }) => (
                                <span className="font-semibold text-slate-950 dark:text-white">
                                    {date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                </span>
                            )}
                            prevLabel={<span className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">{'<'}</span>}
                            nextLabel={<span className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">{'>'}</span>}
                            prev2Label={null}
                            next2Label={null}
                        />
                    </div>
                )}
            </div>

            {/* Room selection lives in the schedule header now. The sidebar
                shows only the date picker, the user's own bookings, and the
                Create button. */}

            <div className={`${isSchedulesCollapsed ? 'shrink-0' : 'min-h-0 flex-1'} flex flex-col overflow-hidden`}>
                    <div className="mb-3 flex shrink-0 items-center justify-between">
                        <span className="text-sm font-semibold text-slate-700 dark:text-gray-300">My Schedules</span>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">{visibleBookings.length}</span>
                            <button
                                type="button"
                                onClick={() => setIsSchedulesCollapsed(!isSchedulesCollapsed)}
                                className="text-lg text-gray-500 transition-transform hover:text-gray-900 dark:hover:text-white"
                                style={{ transform: isSchedulesCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
                            >
                                <ChevronDown className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {!isSchedulesCollapsed && (
                        <>
                            <div className="mb-3 grid grid-cols-3 gap-2 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => toggleFilter('PENDING')}
                                    aria-pressed={statusFilter === 'PENDING'}
                                    className={`rounded-lg border p-2 text-left transition ${
                                        statusFilter === 'PENDING'
                                            ? 'border-yellow-400 bg-yellow-100 ring-2 ring-yellow-400/60 dark:border-yellow-400/60 dark:bg-yellow-500/20 dark:ring-yellow-400/40'
                                            : 'border-yellow-200 bg-yellow-50 hover:border-yellow-300 dark:border-yellow-500/20 dark:bg-yellow-500/10 dark:hover:border-yellow-400/40'
                                    }`}
                                >
                                    <div className={`text-xs text-yellow-700 dark:text-yellow-400 ${statusFilter === 'PENDING' ? 'font-bold' : ''}`}>Requested</div>
                                    <div className="text-lg font-bold text-yellow-700 dark:text-yellow-300">{requestedSchedules}</div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => toggleFilter('APPROVED')}
                                    aria-pressed={statusFilter === 'APPROVED'}
                                    className={`rounded-lg border p-2 text-left transition ${
                                        statusFilter === 'APPROVED'
                                            ? 'border-green-400 bg-green-100 ring-2 ring-green-400/60 dark:border-green-400/60 dark:bg-green-500/20 dark:ring-green-400/40'
                                            : 'border-green-200 bg-green-50 hover:border-green-300 dark:border-green-500/20 dark:bg-green-500/10 dark:hover:border-green-400/40'
                                    }`}
                                >
                                    <div className={`text-xs text-green-700 dark:text-green-400 ${statusFilter === 'APPROVED' ? 'font-bold' : ''}`}>Approved</div>
                                    <div className="text-lg font-bold text-green-700 dark:text-green-300">{acceptedSchedules}</div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => toggleFilter('REJECTED')}
                                    aria-pressed={statusFilter === 'REJECTED'}
                                    className={`rounded-lg border p-2 text-left transition ${
                                        statusFilter === 'REJECTED'
                                            ? 'border-rose-400 bg-rose-100 ring-2 ring-rose-400/60 dark:border-rose-400/60 dark:bg-rose-500/20 dark:ring-rose-400/40'
                                            : 'border-rose-200 bg-rose-50 hover:border-rose-300 dark:border-rose-500/20 dark:bg-rose-500/10 dark:hover:border-rose-400/40'
                                    }`}
                                >
                                    <div className={`text-xs text-rose-700 dark:text-rose-400 ${statusFilter === 'REJECTED' ? 'font-bold' : ''}`}>Rejected</div>
                                    <div className="text-lg font-bold text-rose-700 dark:text-rose-300">{rejectedSchedules}</div>
                                </button>
                            </div>

                            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                                {filteredBookings.length === 0 && (
                                    <div className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
                                        {statusFilter === 'PENDING' && 'No requested schedules.'}
                                        {statusFilter === 'APPROVED' && 'No approved schedules.'}
                                        {statusFilter === 'REJECTED' && 'No rejected schedules.'}
                                        {statusFilter === null && (myBookings.length === 0 ? 'No schedules yet.' : 'Click Rejected to view hidden schedules.')}
                                    </div>
                                )}
                                {filteredBookings
                                    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
                                    .map((booking) => (
                                        <div
                                            key={booking.id}
                                            onClick={() => onBookingClick?.(booking)}
                                            className="flex cursor-pointer flex-col gap-1 rounded-lg border border-slate-200 bg-slate-50 p-2 transition-colors hover:bg-white dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.07]"
                                        >
                                            <div className="flex items-start justify-between">
                                                <span className="truncate pr-2 text-xs font-medium text-gray-800 dark:text-gray-200">{booking.title}</span>
                                                <span className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${booking.extendedProps.status === 'APPROVED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                    booking.extendedProps.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                        'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                                    }`}>
                                                    {booking.extendedProps.status === 'APPROVED' ? 'APR' : booking.extendedProps.status === 'PENDING' ? 'REQ' : booking.extendedProps.status.substring(0, 3)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-[10px] text-gray-500">
                                                <span>{new Date(booking.start).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                                <span>{booking.extendedProps.roomName}</span>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </>
                    )}
                </div>
        </div>
    );
}
