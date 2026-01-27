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
}: CalendarSidebarProps) {
    const allSelected = rooms.length > 0 && selectedRooms.length === rooms.length;

    // Calculate stats for borrowing requests
    const pendingCount = borrowingRequests.filter(r => r.status === 'PENDING').length;
    const activeCount = borrowingRequests.filter(r => r.status === 'APPROVED' || r.status === 'BORROWED').length;

    // Collapse state
    const [isRoomsCollapsed, setIsRoomsCollapsed] = useState(false);
    const [isRequestsCollapsed, setIsRequestsCollapsed] = useState(false);

    return (
        <div className="w-64 h-full bg-gray-900 border-r border-gray-700 flex flex-col p-4">
            {/* Create Button */}
            <button
                onClick={onCreateClick}
                className="flex items-center gap-3 px-4 py-3 mb-6 rounded-2xl bg-gray-800 hover:bg-gray-700 border border-gray-600 shadow-lg transition-all group"
            >
                <span className="text-2xl text-indigo-400 group-hover:scale-110 transition-transform">+</span>
                <span className="text-white font-medium">Create</span>
            </button>

            {/* Mini Calendar */}
            <div className="mb-6 calendar-dark">
                <Calendar
                    onChange={(value) => {
                        if (value instanceof Date) {
                            onDateSelect(value);
                        }
                    }}
                    value={selectedDate}
                    className="!bg-transparent !border-none text-sm"
                    tileClassName="!text-gray-300 hover:!bg-gray-700 !rounded-full"
                    navigationLabel={({ date }) => (
                        <span className="text-white font-medium">
                            {date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </span>
                    )}
                    prevLabel={<span className="text-gray-400 hover:text-white">‹</span>}
                    nextLabel={<span className="text-gray-400 hover:text-white">›</span>}
                    prev2Label={null}
                    next2Label={null}
                />
            </div>

            {/* Rooms Section */}
            <div className="">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-300">Rooms</span>
                    <button
                        onClick={() => setIsRoomsCollapsed(!isRoomsCollapsed)}
                        className="text-gray-500 hover:text-white text-lg transition-transform"
                        style={{ transform: isRoomsCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
                    >
                        ▼
                    </button>
                </div>

                {!isRoomsCollapsed && (
                    <div className="space-y-1">
                        {/* All Rooms Toggle */}
                        <label className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-gray-800 cursor-pointer group border-b border-gray-700 pb-2 mb-2">
                            <input
                                type="checkbox"
                                checked={allSelected}
                                onChange={() => onSelectAll(!allSelected)}
                                className="w-4 h-4 rounded border-gray-500 text-indigo-600 focus:ring-indigo-500 bg-gray-700"
                            />
                            <span className="text-sm font-medium text-gray-200 group-hover:text-white">All Rooms</span>
                        </label>

                        {rooms.map((room) => (
                            <label
                                key={room.Room_ID}
                                className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-gray-800 cursor-pointer group"
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedRooms.includes(room.Room_ID)}
                                    onChange={() => onRoomToggle(room.Room_ID)}
                                    className="w-4 h-4 rounded border-gray-500 text-indigo-600 focus:ring-indigo-500 bg-gray-700"
                                />
                                <span className="w-3 h-3 rounded-full bg-indigo-500" />
                                <span className="text-sm text-gray-300 group-hover:text-white">
                                    {room.Name}
                                </span>
                            </label>
                        ))}
                    </div>
                )}
            </div>

            {/* Borrowing Requests Section */}
            {showBorrowingRequests && (
                <div className="">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-gray-300">My Requests</span>
                        <div className="flex items-center gap-2">
                            {borrowingRequests.length > 0 && (
                                <span className="text-xs text-gray-500">{borrowingRequests.length}</span>
                            )}
                            <button
                                onClick={() => setIsRequestsCollapsed(!isRequestsCollapsed)}
                                className="text-gray-500 hover:text-white text-lg transition-transform"
                                style={{ transform: isRequestsCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
                            >
                                ▼
                            </button>
                        </div>
                    </div>

                    {!isRequestsCollapsed && (
                        <>
                            {/* Stats Summary */}
                            {borrowingRequests.length > 0 && (
                                <div className="grid grid-cols-2 gap-2 mb-3">
                                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2">
                                        <div className="text-xs text-yellow-400">Pending</div>
                                        <div className="text-lg font-bold text-yellow-300">{pendingCount}</div>
                                    </div>
                                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2">
                                        <div className="text-xs text-green-400">Active</div>
                                        <div className="text-lg font-bold text-green-300">{activeCount}</div>
                                    </div>
                                </div>
                            )}

                            {/* Request Cards */}
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {borrowingRequests.length > 0 ? (
                                    borrowingRequests.slice(0, 5).map((request) => (
                                        <RequestCard key={request.id} request={request} variant="compact" />
                                    ))
                                ) : (
                                    <div className="text-center py-4">
                                        <div className="text-gray-500 text-sm">No requests yet</div>
                                        <div className="text-xs text-gray-600 mt-1">Click "Borrow" to borrow an item</div>
                                    </div>
                                )}
                            </div>

                            {borrowingRequests.length > 5 && (
                                <button className="w-full mt-2 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                                    View All ({borrowingRequests.length})
                                </button>
                            )}
                        </>
                    )}
                </div>
            )}

        </div>
    );
}
