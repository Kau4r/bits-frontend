import dayjs from 'dayjs'
import { useState, useEffect } from 'react'
import type { Room as RoomType, RoomStatus, RoomType as RoomTypeEnum, RoomSession } from '@/types/room'
import { getRooms } from '@/services/room'
import api from '@/services/api'
import { useModal } from '@/context/ModalContext'
import QueueModal from './components/QueueModal'
import RoomDetailModal from './components/RoomDetailModal'
import RoomCard from './components/RoomCard'
import TimeSlotGrid from './components/TimeSlotGrid'
import { useAuth } from '@/context/AuthContext'


type TabType = 'rooms' | 'queue';
type StatusFilterType = 'All Status' | RoomStatus;
type TypeFilterType = 'All Types' | RoomTypeEnum;

// Map backend Room_Type to display name
const roomTypeLabels: Record<RoomTypeEnum, string> = {
    CONSULTATION: 'Consultation Room',
    LECTURE: 'Lecture Room',
    LAB: 'Lab',
};

export default function Room() {
    const { user } = useAuth();
    const modal = useModal();
    const [activeTab, setActiveTab] = useState<TabType>('rooms');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilterType>('All Status');
    const [typeFilter, setTypeFilter] = useState<TypeFilterType>('All Types');

    const [rooms, setRooms] = useState<RoomType[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [sessions, setSessions] = useState<RoomSession[]>([]);
    const [queueModalOpen, setQueueModalOpen] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState<RoomType | null>(null);
    const [selectedSession, setSelectedSession] = useState<RoomSession | null>(null);
    const [selectedViewRoom, setSelectedViewRoom] = useState<RoomType | null>(null);

    // Fetch rooms from API
    useEffect(() => {
        const loadRooms = async () => {
            try {
                setIsLoading(true);
                const data = await getRooms();
                setRooms(data);
            } catch (error) {
                console.error('Failed to fetch rooms:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadRooms();
    }, []);

    // Get only LAB rooms for the queue tab
    const labRooms = rooms.filter(r => r.Room_Type === 'LAB');

    // Fetch existing schedules and approved bookings for LAB rooms when rooms are loaded
    useEffect(() => {
        const loadSchedulesAndBookings = async () => {
            if (labRooms.length === 0) return;

            try {
                // Get today's date for filtering
                const today = dayjs().startOf('day');
                const todayDayOfWeek = today.day(); // 0 = Sunday, 1 = Monday, etc.

                const allSessions: RoomSession[] = [];

                for (const room of labRooms) {
                    // 1. Fetch room schedules (from Schedule table)
                    if (room.Schedule && room.Schedule.length > 0) {
                        room.Schedule.forEach(schedule => {
                            // Check if schedule applies to today (days is comma-separated, e.g., "1,2,3,4,5")
                            const scheduleDays = schedule.Days?.split(',').map(d => parseInt(d.trim())) || [];
                            if (scheduleDays.includes(todayDayOfWeek)) {
                                // Create datetime for today with schedule times
                                const scheduleStart = dayjs(schedule.Start_Time);
                                const scheduleEnd = dayjs(schedule.End_Time);

                                allSessions.push({
                                    roomId: room.Room_ID,
                                    roomName: room.Name,
                                    startTime: today.hour(scheduleStart.hour()).minute(scheduleStart.minute()).toISOString(),
                                    endTime: today.hour(scheduleEnd.hour()).minute(scheduleEnd.minute()).toISOString(),
                                    status: 'approved',
                                    purpose: (schedule as { Title?: string }).Title || 'Scheduled',
                                    type: 'schedule',
                                    id: schedule.Schedule_ID
                                });
                            }
                        });
                    }

                    // 2. Fetch APPROVED bookings only (from Booked_Room table)
                    const response = await api.get(`/bookings`, {
                        params: {
                            roomId: room.Room_ID,
                            status: 'APPROVED' // Only approved bookings
                        }
                    });

                    const bookings = response.data as Array<{
                        Booked_Room_ID: number;
                        Room_ID: number;
                        Start_Time: string;
                        End_Time: string;
                        Status: string;
                        Purpose?: string;
                        Room?: { Name: string };
                        User_ID?: number;
                        Created_By?: number;
                    }>;

                    // Convert to RoomSession format and filter for today
                    bookings.forEach(booking => {
                        const bookingDate = dayjs(booking.Start_Time);
                        // Only show today's bookings
                        if (bookingDate.isSame(today, 'day')) {
                            allSessions.push({
                                roomId: booking.Room_ID,
                                roomName: booking.Room?.Name || room.Name,
                                startTime: booking.Start_Time,
                                endTime: booking.End_Time,
                                status: 'approved',
                                purpose: booking.Purpose || 'Booked',
                                id: booking.Booked_Room_ID,
                                type: 'booking',
                                userId: booking.User_ID || booking.Created_By
                            });
                        }
                    });
                }

                setSessions(allSessions);
            } catch (error) {
                console.error('Failed to load schedules/bookings:', error);
            }
        };

        loadSchedulesAndBookings();
    }, [labRooms.length]); // Re-run when labRooms changes

    // Get sessions for a specific room
    const getSessionsByRoom = (roomId: number) => {
        return sessions.filter(s => s.roomId === roomId);
    };

    const handleAddTimeSlot = (room: RoomType, _startTime: string, _endTime: string) => {
        setSelectedRoom(room);
        setSelectedSession(null);
        setQueueModalOpen(true);
    };

    const handleSessionClick = (session: { roomName: string; startTime: string; endTime: string; status: 'pending' | 'approved' | 'rejected' }) => {
        // Find the full session
        const fullSession = sessions.find(s => s.roomName === session.roomName && s.startTime === session.startTime);
        if (fullSession) {
            setSelectedSession(fullSession);
            const room = labRooms.find(r => r.Room_ID === fullSession.roomId);
            setSelectedRoom(room || null);
            setQueueModalOpen(true);
        }
    };

    const handleQueueRoom = async (startTime: string, endTime: string, roomName: string) => {
        if (!selectedRoom) return;

        const today = dayjs().startOf('day');
        const requestedStart = today.hour(Number(startTime.split(':')[0])).minute(Number(startTime.split(':')[1])).toISOString();
        const requestedEnd = today.hour(Number(endTime.split(':')[0])).minute(Number(endTime.split(':')[1])).toISOString();

        try {
            if (selectedSession && selectedSession.type === 'booking' && selectedSession.id) {
                // EDIT LOGIC
                if (selectedSession.userId !== user?.User_ID) {
                    await modal.showError("You can only edit your own bookings.", "Permission Denied");
                    return;
                }

                await api.patch(`/bookings/${selectedSession.id}`, {
                    startTime: requestedStart,
                    endTime: requestedEnd
                });

                setSessions(prev => prev.map(s =>
                    s === selectedSession
                        ? { ...s, startTime: requestedStart, endTime: requestedEnd }
                        : s
                ));

                setQueueModalOpen(false);
                await modal.showSuccess('Booking updated successfully.', 'Success');
            } else {
                // CREATE LOGIC
                // Call API to set room availability (with audit logging)
                const response = await api.post(`/rooms/${selectedRoom.Room_ID}/student-room-schedule`, {
                    startTime: requestedStart,
                    endTime: requestedEnd,
                    notes: `Student usage time set by staff`
                });

                if ((response.data as { success: boolean }).success) {
                    // Ideally we should reload to get the real ID and proper formatting
                    // For now, we'll force a reload of the page to simplify
                    window.location.reload();
                }
            }
        } catch (error: any) {
            console.error('Error setting room availability:', error);
            const errorMessage = error.response?.data?.details || error.response?.data?.error || 'Failed to action room availability';
            await modal.showError(errorMessage, 'Error');
        }
    };

    const handleRemoveSession = async (session: RoomSession) => {
        if (session.type !== 'booking' || !session.id) {
            await modal.showError("Cannot remove system schedules.", "Error");
            return;
        }

        if (session.userId !== user?.User_ID) {
            await modal.showError("You can only remove your own bookings.", "Permission Denied");
            return;
        }

        try {
            await api.delete(`/bookings/${session.id}`);
            setSessions(prev => prev.filter(s => s !== session));
            setQueueModalOpen(false);
            setSelectedSession(null);
            await modal.showSuccess('Booking removed.', 'Success');
        } catch (error: any) {
            console.error('Failed to remove booking:', error);
            await modal.showError('Failed to remove booking', 'Error');
        }
    };

    // Filtering for Rooms tab
    const filteredRooms = rooms.filter(room => {
        const matchesSearch = room.Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            roomTypeLabels[room.Room_Type].toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'All Status' || room.Status === statusFilter;
        const matchesType = typeFilter === 'All Types' || room.Room_Type === typeFilter;
        return matchesSearch && matchesStatus && matchesType;
    });

    return (
        <div className="flex flex-col h-screen bg-gray-900 overflow-hidden">
            {/* Fixed Header Section */}
            <div className="flex-shrink-0 p-6 pb-0">
                {/* Page Header */}
                <h1 className="text-3xl font-bold text-white mb-6">Rooms</h1>

                {/* Search and Filters */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="flex-1 relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">🔍</span>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search Rooms..."
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                        />
                    </div>
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value as TypeFilterType)}
                        className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 focus:outline-none focus:border-indigo-500"
                    >
                        <option value="All Types">All Types</option>
                        <option value="LECTURE">Lecture Room</option>
                        <option value="CONSULTATION">Consultation Room</option>
                        <option value="LAB">Lab</option>
                    </select>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as StatusFilterType)}
                        className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 focus:outline-none focus:border-indigo-500"
                    >
                        <option value="All Status">All Status</option>
                        <option value="AVAILABLE">Available</option>
                        <option value="IN_USE">In Use</option>
                        <option value="MAINTENANCE">Maintenance</option>
                    </select>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 mb-6 bg-gray-800 p-1 rounded-lg w-fit">
                    <button
                        onClick={() => setActiveTab('rooms')}
                        className={`px-5 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'rooms'
                            ? 'bg-blue-500 text-white'
                            : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        Rooms
                    </button>
                    <button
                        onClick={() => setActiveTab('queue')}
                        className={`px-5 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'queue'
                            ? 'bg-blue-500 text-white'
                            : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        Room Availability Queue
                    </button>
                </div>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto px-6 pb-6">
                {activeTab === 'rooms' ? (
                    /* Rooms Grid - All room types */
                    isLoading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="text-gray-400">Loading rooms...</div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                            {filteredRooms.map((room) => (
                                <RoomCard
                                    key={room.Room_ID}
                                    code={room.Name}
                                    type={roomTypeLabels[room.Room_Type]}
                                    status={room.Status === 'AVAILABLE' ? 'Available' : 'In Use'}
                                    nextSchedule="12:00 - 1:30"
                                    currentUser={room.Status !== 'AVAILABLE' ? 'In Use' : undefined}
                                    onViewDetails={() => setSelectedViewRoom(room)}
                                />
                            ))}
                            {filteredRooms.length === 0 && (
                                <div className="col-span-full text-center text-gray-500 py-12">
                                    No rooms found matching your criteria.
                                </div>
                            )}
                        </div>
                    )
                ) : (
                    /* Room Availability Queue - Show LAB rooms with time slots */
                    <div className="space-y-8">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-32">
                                <div className="text-gray-400">Loading lab rooms...</div>
                            </div>
                        ) : labRooms.length > 0 ? (
                            labRooms.map((room) => {
                                const roomSessions = getSessionsByRoom(room.Room_ID);

                                return (
                                    <div key={room.Room_ID} className="bg-gray-800 rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-4">
                                            <h2 className="text-xl font-bold text-white">
                                                {room.Name}
                                            </h2>
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${room.Status === 'AVAILABLE'
                                                ? 'bg-green-500/20 text-green-400'
                                                : 'bg-yellow-500/20 text-yellow-400'
                                                }`}>
                                                {room.Status}
                                            </span>
                                        </div>
                                        <TimeSlotGrid
                                            sessions={roomSessions}
                                            totalRoomsInCategory={1}
                                            onAddRoom={(start, end) => handleAddTimeSlot(room, start, end)}
                                            onSessionClick={handleSessionClick}
                                        />

                                        {/* Add Time Slot Button */}
                                        <div className="mt-4 flex justify-center">
                                            <button
                                                onClick={() => handleAddTimeSlot(room, '09:00', '10:00')}
                                                className="px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors"
                                            >
                                                + Add Student Usage Time
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="text-center text-gray-500 py-12">
                                No LAB rooms found. Create rooms with Room Type = LAB to see them here.
                            </div>
                        )}
                    </div>
                )}
            </div>

            <QueueModal
                isOpen={queueModalOpen}
                onClose={() => {
                    setQueueModalOpen(false);
                    setSelectedSession(null);
                    setSelectedRoom(null);
                }}
                onQueue={handleQueueRoom}
                onRemove={selectedSession ? () => handleRemoveSession(selectedSession) : () => { }}
                availableRooms={selectedRoom ? [selectedRoom] : []}
                selectedQueueItem={selectedSession ? {
                    roomName: selectedSession.roomName,
                    startTime: selectedSession.startTime,
                    endTime: selectedSession.endTime,
                    user: 'labtech',
                    status: selectedSession.status,
                } : null}
                readOnly={selectedSession ? (
                    // Read only if it's a schedule OR if it's a booking but not owned by current user
                    selectedSession.type === 'schedule' ||
                    (selectedSession.type === 'booking' && selectedSession.userId !== user?.User_ID)
                ) : false}
            />
            {selectedViewRoom && (
                <RoomDetailModal
                    isOpen={!!selectedViewRoom}
                    onClose={() => setSelectedViewRoom(null)}
                    room={selectedViewRoom}
                    sessions={getSessionsByRoom(selectedViewRoom.Room_ID)}
                />
            )}
        </div>
    );
}
