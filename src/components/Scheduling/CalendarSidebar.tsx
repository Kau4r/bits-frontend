import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import type { Room } from '@/types/room';
import type { BorrowingRequest } from '@/components/borrowing/RequestCard';
import RequestCard from '@/components/borrowing/RequestCard';
import { useState } from 'react';

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

export default function CalendarSidebar({
    rooms,
    selectedRooms,
    onRoomToggle,
    onSelectAll,
    onDateSelect,
    selectedDate,
    onCreateClick,
    borrowingRequests = [],
    showBorrowingRequests = false,
    myBookings = [],
    onBookingClick,
}: CalendarSidebarProps) {
    const allSelected = rooms.length > 0 && selectedRooms.length === rooms.length;

    // Calculate stats for borrowing requests
    const pendingBorrowCount = borrowingRequests.filter(r => r.status === 'PENDING').length;
    const activeBorrowCount = borrowingRequests.filter(r => r.status === 'APPROVED' || r.status === 'BORROWED').length;

    // Calculate stats for schedule requests (bookings)
    const requestedSchedules = myBookings.filter(b => b.extendedProps.status === 'PENDING').length;
    const acceptedSchedules = myBookings.filter(b => b.extendedProps.status === 'APPROVED').length;

    // Collapse state
    const [isRoomsCollapsed, setIsRoomsCollapsed] = useState(false);
    const [isRequestsCollapsed, setIsRequestsCollapsed] = useState(false);
    const [isSchedulesCollapsed, setIsSchedulesCollapsed] = useState(false);

    return (
        <div className="w-64 h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col p-4 overflow-hidden">
            {/* Create Button */}
            <button
                onClick={onCreateClick}
                className="flex items-center gap-3 px-4 py-3 mb-6 rounded-2xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 shadow-lg transition-all group flex-shrink-0"
            >
                <span className="text-2xl text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">+</span>
                <span className="text-gray-900 dark:text-white font-medium">Create</span>
            </button>

            {/* Mini Calendar */}
            <div className="mb-6 calendar-dark flex-shrink-0">
                <Calendar
                    onChange={(value) => {
                        if (value instanceof Date) {
                            onDateSelect(value);
                        }
                    }}
                    value={selectedDate}
                    className="!bg-transparent !border-none text-sm"
                    tileClassName="!text-gray-700 dark:!text-gray-300 hover:!bg-gray-100 dark:hover:!bg-gray-700 !rounded-full"
                    navigationLabel={({ date }) => (
                        <span className="text-gray-900 dark:text-white font-medium">
                            {date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </span>
                    )}
                    prevLabel={<span className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">‹</span>}
                    nextLabel={<span className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">›</span>}
                    prev2Label={null}
                    next2Label={null}
                />
            </div>

            {/* Rooms Section */}
            <div className="mb-4 min-h-0 flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between mb-3 flex-shrink-0">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Rooms</span>
                    <button
                        onClick={() => setIsRoomsCollapsed(!isRoomsCollapsed)}
                        className="text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white text-lg transition-transform"
                        style={{ transform: isRoomsCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
                    >
                        ▼
                    </button>
                </div>

                {!isRoomsCollapsed && (
                    <div className="space-y-1 overflow-y-auto scrollbar-thin">
                        {/* All Rooms Toggle */}
                        <label className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer group border-b border-gray-200 dark:border-gray-700 pb-2 mb-2">
                            <input
                                type="checkbox"
                                checked={allSelected}
                                onChange={() => onSelectAll(!allSelected)}
                                className="h-4 w-4 shrink-0 cursor-pointer rounded border border-gray-400 bg-white checked:bg-indigo-600 checked:border-indigo-600 text-indigo-600 focus:ring-2 focus:ring-indigo-500 dark:border-gray-500 dark:bg-gray-700"
                            />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white">All Rooms</span>
                        </label>

                        {rooms.map((room) => (
                            <label
                                key={room.Room_ID}
                                className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer group"
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedRooms.includes(room.Room_ID)}
                                    onChange={() => onRoomToggle(room.Room_ID)}
                                    className="h-4 w-4 shrink-0 cursor-pointer rounded border border-gray-400 bg-white checked:bg-indigo-600 checked:border-indigo-600 text-indigo-600 focus:ring-2 focus:ring-indigo-500 dark:border-gray-500 dark:bg-gray-700"
                                />
                                <span className="w-3 h-3 rounded-full bg-indigo-500" />
                                <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">
                                    {room.Name}
                                </span>
                            </label>
                        ))}
                    </div>
                )}
            </div>

            {/* Schedule Requests (Bookings) Section */}
            {myBookings.length > 0 && (
                <div className="flex-1 min-h-0 flex flex-col mb-6">
                    <div className="flex items-center justify-between mb-3 flex-shrink-0">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">My Schedules</span>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">{myBookings.length}</span>
                            <button
                                onClick={() => setIsSchedulesCollapsed(!isSchedulesCollapsed)}
                                className="text-gray-500 hover:text-gray-900 dark:hover:text-white text-lg transition-transform"
                                style={{ transform: isSchedulesCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
                            >
                                ▼
                            </button>
                        </div>
                    </div>

                    {!isSchedulesCollapsed && (
                        <>
                            <div className="grid grid-cols-2 gap-2 mb-3 flex-shrink-0">
                                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2">
                                    <div className="text-xs text-yellow-400">Requested</div>
                                    <div className="text-lg font-bold text-yellow-300">{requestedSchedules}</div>
                                </div>
                                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2">
                                    <div className="text-xs text-green-400">Accepted</div>
                                    <div className="text-lg font-bold text-green-300">{acceptedSchedules}</div>
                                </div>
                            </div>

                            <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar min-h-0">
                                {myBookings
                                    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
                                    .map((booking) => (
                                        <div
                                            key={booking.id}
                                            onClick={() => onBookingClick?.(booking)}
                                            className="bg-gray-100 dark:bg-gray-800/50 p-2 rounded border border-gray-200 dark:border-gray-700/50 flex flex-col gap-1 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                                        >
                                            <div className="flex justify-between items-start">
                                                <span className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate pr-2">{booking.title}</span>
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider ${booking.extendedProps.status === 'APPROVED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                    booking.extendedProps.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                        'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                                    }`}>
                                                    {booking.extendedProps.status === 'APPROVED' ? 'ACC' : booking.extendedProps.status === 'PENDING' ? 'REQ' : booking.extendedProps.status.substring(0, 3)}
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
            )}
        </div>
    );
}
