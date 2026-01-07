import { useState, useRef, useEffect } from 'react';
import dayjs from 'dayjs';
import type { Room } from '@/types/room';

interface ViewingBooking {
    id: string;
    title: string;
    description: string;
    roomId: number;
    roomName: string;
    date: string;
    startTime: string;
    endTime: string;
    createdBy: string;
    createdById: number;
    status: string;
}

interface BookingPopoverProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: {
        title: string;
        description: string;
        roomId: number;
        date: string;
        startTime: string;
        endTime: string;
        repeat: boolean;
    }) => void;
    onUpdate?: (id: string, data: {
        title: string;
        description: string;
        roomId: number;
        date: string;
        startTime: string;
        endTime: string;
    }) => void;
    onApprove?: (id: string) => void;
    onReject?: (id: string) => void;
    startTime: Date;
    endTime: Date;
    rooms: Room[];
    selectedRoomId?: number;
    isSubmitting?: boolean;
    viewingBooking?: ViewingBooking | null;
    canEdit?: boolean;
    canApprove?: boolean;
}

// Generate time options in 30-minute intervals
const generateTimeOptions = () => {
    const options: string[] = [];
    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 30) {
            const hour = h.toString().padStart(2, '0');
            const min = m.toString().padStart(2, '0');
            options.push(`${hour}:${min}`);
        }
    }
    return options;
};

const TIME_OPTIONS = generateTimeOptions();

const formatTimeDisplay = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'pm' : 'am';
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${hour12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${period}`;
};

const statusColors: Record<string, { bg: string; text: string }> = {
    APPROVED: { bg: 'bg-green-500/20', text: 'text-green-400' },
    PENDING: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
    REJECTED: { bg: 'bg-red-500/20', text: 'text-red-400' },
    CANCELLED: { bg: 'bg-gray-500/20', text: 'text-gray-400' },
};

export default function BookingPopover({
    isOpen,
    onClose,
    onSave,
    onUpdate,
    onApprove,
    onReject,
    startTime,
    endTime,
    rooms,
    selectedRoomId,
    isSubmitting = false,
    viewingBooking,
    canEdit = false,
    canApprove = false,
}: BookingPopoverProps) {
    const isViewMode = !!viewingBooking && !canEdit;
    const isEditMode = !!viewingBooking && canEdit;
    const isCreateMode = !viewingBooking;

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [roomId, setRoomId] = useState(selectedRoomId || 0);
    const [date, setDate] = useState(dayjs(startTime).format('YYYY-MM-DD'));
    const [startTimeValue, setStartTimeValue] = useState(dayjs(startTime).format('HH:mm'));
    const [endTimeValue, setEndTimeValue] = useState(dayjs(endTime).format('HH:mm'));
    const [repeat, setRepeat] = useState(false);
    const [showRoomDropdown, setShowRoomDropdown] = useState(false);

    const popoverRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Update form when props change
    useEffect(() => {
        if (isOpen) {
            if (viewingBooking) {
                setTitle(viewingBooking.title);
                setDescription(viewingBooking.description);
                setRoomId(viewingBooking.roomId);
                setDate(viewingBooking.date);
                setStartTimeValue(viewingBooking.startTime);
                setEndTimeValue(viewingBooking.endTime);
                setRepeat(false);
            } else {
                setTitle('');
                setDescription('');
                setDate(dayjs(startTime).format('YYYY-MM-DD'));
                setStartTimeValue(dayjs(startTime).format('HH:mm'));
                setEndTimeValue(dayjs(endTime).format('HH:mm'));
                if (selectedRoomId) setRoomId(selectedRoomId);
                setRepeat(false);
            }
        }
    }, [isOpen, startTime, endTime, selectedRoomId, viewingBooking]);

    // Focus input when opened (only in edit/create mode)
    useEffect(() => {
        if (isOpen && inputRef.current && !isViewMode) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen, isViewMode]);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    // Close on Escape
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !roomId) return;

        if (isEditMode && viewingBooking && onUpdate) {
            onUpdate(viewingBooking.id, {
                title: title.trim(),
                description: description.trim(),
                roomId,
                date,
                startTime: startTimeValue,
                endTime: endTimeValue,
            });
        } else if (isCreateMode) {
            onSave({
                title: title.trim(),
                description: description.trim(),
                roomId,
                date,
                startTime: startTimeValue,
                endTime: endTimeValue,
                repeat,
            });
        }
        setTitle('');
        setDescription('');
        setRepeat(false);
    };

    const selectedRoom = rooms.find(r => r.Room_ID === roomId);

    // Modal overlay and container styles
    const overlayStyle: React.CSSProperties = {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    };

    const modalStyle: React.CSSProperties = {
        position: 'relative',
        width: 400,
        maxHeight: '90vh',
        backgroundColor: '#1f2937',
        borderRadius: '0.75rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #4b5563',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
    };

    // VIEW-ONLY MODE
    if (isViewMode && viewingBooking) {
        const statusStyle = statusColors[viewingBooking.status] || statusColors.PENDING;

        return (
            <div style={overlayStyle} onClick={onClose}>
                <div ref={popoverRef} style={modalStyle} onClick={e => e.stopPropagation()}>
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
                        <h3 className="font-semibold text-white">Booking Details</h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
                    </div>

                    {/* Details */}
                    <div className="p-4 space-y-4 overflow-y-auto">
                        <div>
                            <div className="text-xl font-semibold text-white">{viewingBooking.title}</div>
                            {viewingBooking.description && (
                                <div className="text-sm text-gray-400 mt-1">{viewingBooking.description}</div>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                                {viewingBooking.status}
                            </span>
                        </div>

                        <div className="bg-gray-700/50 rounded-lg p-3 space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-gray-400">👤</span>
                                <span className="text-white font-medium">{viewingBooking.createdBy}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-gray-400">🏠</span>
                                <span className="text-gray-300">{viewingBooking.roomName}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-gray-400">📅</span>
                                <span className="text-gray-300">{dayjs(viewingBooking.date).format('dddd, MMMM D, YYYY')}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-gray-400">🕐</span>
                                <span className="text-gray-300">
                                    {formatTimeDisplay(viewingBooking.startTime)} – {formatTimeDisplay(viewingBooking.endTime)}
                                </span>
                            </div>
                        </div>

                        {canApprove && viewingBooking.status === 'PENDING' && (
                            <div className="flex gap-3 pt-2 border-t border-gray-700">
                                <button
                                    onClick={() => onReject?.(viewingBooking.id)}
                                    disabled={isSubmitting}
                                    className="flex-1 px-4 py-2 text-sm bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 disabled:opacity-50"
                                >
                                    Reject
                                </button>
                                <button
                                    onClick={() => onApprove?.(viewingBooking.id)}
                                    disabled={isSubmitting}
                                    className="flex-1 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-500 disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Approving...' : 'Approve'}
                                </button>
                            </div>
                        )}

                        <div className="flex justify-end pt-2">
                            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-300 hover:text-white">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // CREATE / EDIT MODE
    return (
        <div style={overlayStyle} onClick={onClose}>
            <div ref={popoverRef} style={modalStyle} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
                    <h3 className="font-semibold text-white">{isEditMode ? 'Edit Booking' : 'New Booking'}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto">
                    {/* Event Title */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Event Title</label>
                        <input
                            ref={inputRef}
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                            required
                        />
                    </div>

                    {/* Event Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Event Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
                        />
                    </div>

                    {/* Room */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Room</label>
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setShowRoomDropdown(!showRoomDropdown)}
                                className="w-auto px-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white text-left flex items-center gap-2 hover:bg-gray-600"
                            >
                                <span className="text-lg">+</span>
                                <span>{selectedRoom?.Name || 'Add Room'}</span>
                            </button>

                            {showRoomDropdown && (
                                <div className="absolute top-full left-0 mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-lg z-10 min-w-[200px]">
                                    {rooms.map((room) => (
                                        <button
                                            key={room.Room_ID}
                                            type="button"
                                            onClick={() => {
                                                setRoomId(room.Room_ID);
                                                setShowRoomDropdown(false);
                                            }}
                                            className={`w-full px-4 py-2 text-left hover:bg-gray-600 first:rounded-t-lg last:rounded-b-lg ${roomId === room.Room_ID ? 'bg-indigo-900/30 text-indigo-400' : 'text-gray-300'}`}
                                        >
                                            {room.Name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Date */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Date</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                            required
                        />
                    </div>

                    {/* Time Range */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Start Time</label>
                            <select
                                value={startTimeValue}
                                onChange={(e) => setStartTimeValue(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                            >
                                {TIME_OPTIONS.map((t) => (
                                    <option key={`start-${t}`} value={t}>{formatTimeDisplay(t)}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">End Time</label>
                            <select
                                value={endTimeValue}
                                onChange={(e) => setEndTimeValue(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                            >
                                {TIME_OPTIONS.map((t) => (
                                    <option key={`end-${t}`} value={t}>{formatTimeDisplay(t)}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Repeat */}
                    {isCreateMode && (
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="repeat"
                                checked={repeat}
                                onChange={(e) => setRepeat(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500"
                            />
                            <label htmlFor="repeat" className="text-sm text-gray-300">Repeat Event</label>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-300 hover:text-white">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!title.trim() || !roomId || isSubmitting}
                            className="px-6 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Saving...' : isEditMode ? 'Update' : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
