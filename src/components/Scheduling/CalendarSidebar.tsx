import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import type { Room } from '@/types/room';

interface CalendarSidebarProps {
    rooms: Room[];
    selectedRooms: number[];
    onRoomToggle: (roomId: number) => void;
    onSelectAll: (selectAll: boolean) => void;
    onDateSelect: (date: Date) => void;
    selectedDate: Date;
    onCreateClick: () => void;
    onReportIssueClick: () => void;
    hideReportIssue?: boolean;
}

export default function CalendarSidebar({
    rooms,
    selectedRooms,
    onRoomToggle,
    onSelectAll,
    onDateSelect,
    selectedDate,
    onCreateClick,
    onReportIssueClick,
    hideReportIssue = false,
}: CalendarSidebarProps) {
    const allSelected = rooms.length > 0 && selectedRooms.length === rooms.length;
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
            <div className="flex-1 overflow-y-auto">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-300">Rooms</span>
                    <button className="text-gray-500 hover:text-white text-lg">▼</button>
                </div>

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
            </div>

            {/* Report Issue - hidden for Lab Head */}
            {!hideReportIssue && (
                <button
                    onClick={onReportIssueClick}
                    className="flex items-center gap-2 px-3 py-2 mt-4 rounded-lg text-red-400 hover:bg-gray-800 transition-colors"
                >
                    <span>🚨</span>
                    <span className="text-sm">Report Issue</span>
                </button>
            )}
        </div>
    );
}
