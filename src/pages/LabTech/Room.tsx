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
import Search from '@/components/Search'
import { FunnelIcon, CalendarDaysIcon, BuildingOfficeIcon, PlusIcon } from '@heroicons/react/24/outline'


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

    const handleQueueRoom = async (startTime: string, endTime: string, _roomName: string) => {
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
        <div className="h-full w-full bg-white p-6 sm:px-8 lg:px-10 dark:bg-gray-900">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Rooms</h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">View and manage laboratory room availability and schedules</p>
                </div>

                {/* Tabs Toggle - Styled like UserPage Status Toggle */}
                <div className="flex rounded-lg border border-gray-300 bg-white shadow-sm dark:border-gray-600 dark:bg-gray-800">
                    <button
                        onClick={() => setActiveTab('rooms')}
                        className={`inline-flex items-center gap-2 rounded-l-lg px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'rooms'
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                            }`}
                    >
                        <BuildingOfficeIcon className="h-4 w-4" />
                        Rooms
                    </button>
                    <button
                        onClick={() => setActiveTab('queue')}
                        className={`inline-flex items-center gap-2 rounded-r-lg px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'queue'
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                            }`}
                    >
                        <CalendarDaysIcon className="h-4 w-4" />
                        Room Availability Queue
                    </button>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="mb-6 flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="min-w-[280px] flex-1">
                    <Search
                        searchTerm={searchTerm}
                        onChange={setSearchTerm}
                        showLabel={false}
                        placeholder="Search rooms..."
                    />
                </div>

                {/* Type Filter */}
                <div className="relative">
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value as TypeFilterType)}
                        className="appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-4 pr-10 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
                    >
                        <option value="All Types">All Types</option>
                        <option value="LECTURE">Lecture Room</option>
                        <option value="CONSULTATION">Consultation Room</option>
                        <option value="LAB">Lab</option>
                    </select>
                    <FunnelIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                </div>

                {/* Status Filter */}
                <div className="relative">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as StatusFilterType)}
                        className="appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-4 pr-10 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
                    >
                        <option value="All Status">All Status</option>
                        <option value="AVAILABLE">Available</option>
                        <option value="IN_USE">In Use</option>
                        <option value="MAINTENANCE">Maintenance</option>
                    </select>
                    <FunnelIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                </div>

                {/* Results Count */}
                <div className="ml-auto flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-semibold text-gray-900 dark:text-white">
                        {activeTab === 'rooms' ? filteredRooms.length : labRooms.length}
                    </span>
                    <span>of {activeTab === 'rooms' ? rooms.length : labRooms.length} rooms</span>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1">
                {activeTab === 'rooms' ? (
                    /* Rooms Grid */
                    isLoading ? (
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {[...Array(8)].map((_, i) => (
                                <div key={i} className="h-48 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
                            ))}
                        </div>
                    ) : filteredRooms.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <BuildingOfficeIcon className="h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No rooms found</h3>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Try adjusting your search or filter criteria</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                        </div>
                    )
                ) : (
                    /* Room Availability Queue */
                    <div className="space-y-6">
                        {isLoading ? (
                            <div className="space-y-4">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="h-64 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
                                ))}
                            </div>
                        ) : labRooms.length > 0 ? (
                            labRooms.map((room) => {
                                const roomSessions = getSessionsByRoom(room.Room_ID);

                                return (
                                    <div key={room.Room_ID} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                                                    <BuildingOfficeIcon className="h-6 w-6" />
                                                </div>
                                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                                    {room.Name}
                                                </h2>
                                            </div>
                                            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${room.Status === 'AVAILABLE'
                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                }`}>
                                                <span className={`h-1.5 w-1.5 rounded-full ${room.Status === 'AVAILABLE' ? 'bg-green-500' : 'bg-yellow-500'}`} />
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
                                        <div className="mt-6 flex justify-center">
                                            <button
                                                onClick={() => handleAddTimeSlot(room, '09:00', '10:00')}
                                                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-600"
                                            >
                                                <PlusIcon className="h-5 w-5" />
                                                Add Student Usage Time
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12">
                                <BuildingOfficeIcon className="h-12 w-12 text-gray-400" />
                                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No LAB rooms found</h3>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Create rooms with Room Type = LAB to see them here</p>
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
                onRemove={selectedSession ? () => handleRemoveSession(selectedSession!) : () => { }}
                availableRooms={selectedRoom ? [selectedRoom] as RoomType[] : []}
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
                    room={selectedViewRoom!}
                    sessions={getSessionsByRoom(selectedViewRoom!.Room_ID)}
                />
            )}
        </div>
    );
}
