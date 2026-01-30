import { useState, useEffect } from 'react'
import type { Room } from '@/types/room'

interface RoomQueueItem {
    roomName: string;
    startTime: string;
    endTime: string;
    user: string;
    status: 'pending' | 'approved' | 'rejected';
}

interface QueueModalProps {
    isOpen: boolean;
    onClose: () => void;
    onQueue: (startTime: string, endTime: string, roomName: string) => Promise<void> | void;
    onRemove: (item: RoomQueueItem) => void;
    availableRooms: Room[];
    selectedQueueItem: RoomQueueItem | null;
    occupiedSlots?: { roomName: string; startTime: string; endTime: string }[];
    readOnly?: boolean;
}

// Generate 30-minute time slots
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

export default function QueueModal({
    isOpen,
    onClose,
    onQueue,
    onRemove,
    availableRooms,
    selectedQueueItem,
    occupiedSlots = [],
    readOnly = false,
}: QueueModalProps) {

    const [startTime, setStartTime] = useState('')
    const [endTime, setEndTime] = useState('')
    const [selectedRoom, setSelectedRoom] = useState<string | null>(null)
    const [error, setError] = useState('')
    const [startDropdownOpen, setStartDropdownOpen] = useState(false)
    const [endDropdownOpen, setEndDropdownOpen] = useState(false)

    useEffect(() => {
        if (selectedQueueItem) {
            // Extract time from ISO string
            const startDate = new Date(selectedQueueItem.startTime);
            const endDate = new Date(selectedQueueItem.endTime);
            setStartTime(`${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')}`);
            setEndTime(`${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`);
            setSelectedRoom(selectedQueueItem.roomName);
        } else {
            setStartTime('09:00');
            setEndTime('10:30');
            // Pre-select the first room from availableRooms when adding new
            if (availableRooms.length > 0) {
                setSelectedRoom(availableRooms[0].Name);
            } else {
                setSelectedRoom(null);
            }
        }
        setError('');
    }, [selectedQueueItem, isOpen, availableRooms]);

    const isEditing = !!selectedQueueItem;
    // If readOnly, we are just viewing details


    // Check if a time slot is occupied for any room
    const isTimeOccupied = (time: string, isEndTime: boolean = false) => {
        const timeMinutes = parseInt(time.split(':')[0]) * 60 + parseInt(time.split(':')[1]);

        return occupiedSlots.some(slot => {
            const slotStart = new Date(slot.startTime);
            const slotEnd = new Date(slot.endTime);
            const startMinutes = slotStart.getHours() * 60 + slotStart.getMinutes();
            const endMinutes = slotEnd.getHours() * 60 + slotEnd.getMinutes();

            if (isEndTime) {
                return timeMinutes > startMinutes && timeMinutes <= endMinutes;
            }
            return timeMinutes >= startMinutes && timeMinutes < endMinutes;
        });
    };

    // Get end time options (must be after start time)
    const getEndTimeOptions = () => {
        if (!startTime) return timeSlots;
        const startIndex = timeSlots.indexOf(startTime);
        return timeSlots.slice(startIndex + 1);
    };

    const handleSubmit = async () => {
        if (!selectedRoom) {
            setError('Please select a room');
            return;
        }

        if (!startTime || !endTime) {
            setError('Please select both start and end times');
            return;
        }

        if (startTime >= endTime) {
            setError('End time must be after start time');
            return;
        }

        try {
            await onQueue(startTime, endTime, selectedRoom);
            // Only close on success - the parent handles closing after API success
        } catch (err: any) {
            setError(err.message || 'Failed to set room availability');
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/40 grid place-items-center p-4 z-50"
            onClick={onClose}
        >
            <div
                className="w-full max-w-lg rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-6 shadow-xl"
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
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Select a Room to add in the Queue</p>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg text-sm border border-red-200 dark:border-red-500/50">
                        {error}
                    </div>
                )}

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
                                className={`w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-left text-gray-900 dark:text-white flex justify-between items-center text-sm ${readOnly ? 'opacity-60 cursor-not-allowed' : 'hover:border-gray-400 dark:hover:border-gray-500'}`}
                            >
                                {startTime ? formatTimeDisplay(startTime) : 'Select time'}
                                {!readOnly && <span className="text-gray-400">▼</span>}
                            </button>
                            {startDropdownOpen && (
                                <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto">
                                    {timeSlots.map((time) => {
                                        const occupied = isTimeOccupied(time);
                                        return (
                                            <button
                                                key={time}
                                                type="button"
                                                onClick={() => {
                                                    setStartTime(time);
                                                    setStartDropdownOpen(false);
                                                    // Reset end time if it's before new start time
                                                    if (endTime && time >= endTime) {
                                                        setEndTime('');
                                                    }
                                                }}
                                                className={`w-full px-4 py-2 text-left text-sm ${occupied
                                                    ? 'bg-red-50 text-red-600 dark:bg-red-500/30 dark:text-red-300'
                                                    : time === startTime
                                                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-600 dark:text-white'
                                                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
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
                                className={`w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-left text-gray-900 dark:text-white flex justify-between items-center text-sm ${readOnly ? 'opacity-60 cursor-not-allowed' : 'hover:border-gray-400 dark:hover:border-gray-500'}`}
                            >
                                {endTime ? formatTimeDisplay(endTime) : 'Select time'}
                                {!readOnly && <span className="text-gray-400">▼</span>}
                            </button>
                            {endDropdownOpen && (
                                <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto">
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
                                                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
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

                {/* Available Rooms Grid */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Available Rooms for Current Time
                    </label>
                    <div className="grid grid-cols-4 gap-3">
                        {availableRooms.length === 0 ? (
                            <p className="col-span-4 text-center text-gray-500 dark:text-gray-400 py-4 text-sm">
                                No rooms available for this category
                            </p>
                        ) : (
                            availableRooms.map((room) => (
                                <button
                                    key={room.Room_ID}
                                    type="button"
                                    onClick={() => setSelectedRoom(room.Name)}
                                    disabled={isEditing}
                                    className={`px-2 py-2.5 rounded-md border text-sm font-medium transition-colors truncate ${selectedRoom === room.Name
                                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-600/20 dark:text-blue-300'
                                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-700'
                                        } ${isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    title={room.Name}
                                >
                                    {room.Name}
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            Confirm
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
