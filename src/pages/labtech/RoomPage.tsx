import dayjs from 'dayjs'
import { useState, useEffect } from 'react'
import type { Room as RoomType, RoomStatus, RoomType as RoomTypeEnum, RoomSession, LabCategory } from '@/types/room'
import { getRooms, setRoomStudentAvailability } from '@/services/room'
import api from '@/services/api'
import { useModal } from '@/context/ModalContext'
import QueueModal from '@/pages/labtech/components/QueueModal'
import RoomDetailModal from '@/pages/labtech/components/RoomDetailModal'
import RoomCard from '@/pages/labtech/components/RoomCard'
import SummaryStrip from '@/pages/labtech/components/SummaryStrip'
import ActiveQueueDashboard, { type OverflowPreset } from '@/pages/labtech/components/ActiveQueueDashboard'
import WeeklySwimlaneGrid from '@/pages/labtech/components/WeeklySwimlaneGrid'
import { getActiveQueues } from '@/services/room'
import type { ActiveQueueItem } from '@/services/room'
import { useAuth } from '@/context/AuthContext'
import Search from '@/components/Search'
import { CalendarDays, Building2 } from 'lucide-react'
import { FloatingSelect } from '@/ui/FloatingSelect'


type TabType = 'rooms' | 'queue';
type StatusFilterType = 'All Status' | RoomStatus;
type TypeFilterType = 'All Types' | RoomTypeEnum;

// Map backend Room_Type to display name
const roomTypeLabels: Record<RoomTypeEnum, string> = {
    CONSULTATION: 'Consultation Room',
    CONFERENCE: 'Conference Room',
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
    const [weekSessions, setWeekSessions] = useState<RoomSession[]>([]);
    const [queueModalOpen, setQueueModalOpen] = useState(false);
    const [queueInitialMode, setQueueInitialMode] = useState<'single' | 'weekly'>('weekly');
    const [, setSelectedRoom] = useState<RoomType | null>(null);
    const [selectedSession, setSelectedSession] = useState<RoomSession | null>(null);
    const [selectedViewRoom, setSelectedViewRoom] = useState<RoomType | null>(null);

    // Overflow preset state — when set, QueueModal opens in single-session mode
    // restricted to the given eligible rooms for a full lab's remaining window.
    const [overflowPreset, setOverflowPreset] = useState<OverflowPreset | null>(null);

    const [selectedCategory, setSelectedCategory] = useState<LabCategory | null>(null);
    const [selectedSlotStart, setSelectedSlotStart] = useState('');
    const [selectedSlotEnd, setSelectedSlotEnd] = useState('');
    const [slotDetailSessions, setSlotDetailSessions] = useState<RoomSession[] | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [serverTimeOffsetMs, setServerTimeOffsetMs] = useState(0);
    const [serverCurrentTime, setServerCurrentTime] = useState(() => new Date());
    const [activeQueues, setActiveQueues] = useState<ActiveQueueItem[]>([]);

    useEffect(() => { 
        let cancelled = false;

        const syncServerTime = async () => {
            try {
                const response = await api.get<{
                    timestamp?: string;
                    data?: { timestamp?: string };
                }>('/health');
                const serverTimestamp = response.data?.data?.timestamp || response.data?.timestamp;
                if (!serverTimestamp) return;

                const serverTimeMs = new Date(serverTimestamp).getTime();
                if (!Number.isNaN(serverTimeMs) && !cancelled) {
                    setServerTimeOffsetMs(serverTimeMs - Date.now());
                }
            } catch (error) {
                console.error('Failed to sync server time:', error);
            }
        };

        syncServerTime();
        const syncInterval = window.setInterval(syncServerTime, 5 * 60 * 1000);
        return () => {
            cancelled = true;
            window.clearInterval(syncInterval);
        };
    }, []);

    useEffect(() => {
        const updateServerCurrentTime = () => {
            setServerCurrentTime(new Date(Date.now() + serverTimeOffsetMs));
        };

        updateServerCurrentTime();
        const interval = window.setInterval(updateServerCurrentTime, 60 * 1000);
        return () => window.clearInterval(interval);
    }, [serverTimeOffsetMs]);

    const serverDayKey = dayjs(serverCurrentTime).format('YYYY-MM-DD');

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

    // Category splitting
    const windowsLabs = labRooms.filter(r => r.Lab_Type === 'WINDOWS');
    const macLabs = labRooms.filter(r => r.Lab_Type === 'MAC');
    const unassignedLabs = labRooms.filter(r => !r.Lab_Type);

    const getSessionsByCategory = (categoryRooms: RoomType[]) => {
        const roomIds = new Set(categoryRooms.map(r => r.Room_ID));
        return sessions.filter(s => roomIds.has(s.roomId));
    };

    // Compute available now count for a category
    const getAvailableNowCount = (categoryRooms: RoomType[], categorySessions: RoomSession[]) => {
        const now = dayjs(serverCurrentTime);
        return categoryRooms.filter(room => {
            if (room.Status !== 'AVAILABLE') return false;
            const hasActiveBooking = categorySessions.some(s =>
                s.roomId === room.Room_ID &&
                dayjs(s.startTime).isBefore(now) &&
                dayjs(s.endTime).isAfter(now)
            );
            return !hasActiveBooking;
        }).length;
    };

    const getRoomsForCategory = (category: LabCategory | null): RoomType[] => {
        if (!category) return [];
        if (category === 'WINDOWS') return windowsLabs;
        if (category === 'MAC') return macLabs;
        return unassignedLabs;
    };

    const getSessionsForCategory = (category: LabCategory | null): RoomSession[] => {
        if (!category) return [];
        return getSessionsByCategory(getRoomsForCategory(category));
    };

    // Fetch existing schedules and approved bookings for LAB rooms when rooms are loaded
    useEffect(() => {
        const loadSchedulesAndBookings = async () => {
            if (labRooms.length === 0) return;

            try {
                const today = dayjs(serverCurrentTime).startOf('day');
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

                    const bookingsPayload = response.data as {
                        data?: Array<{
                            Booked_Room_ID: number;
                            Room_ID: number;
                            Start_Time: string;
                            End_Time: string;
                            Status: string;
                            Purpose?: string;
                            Room?: { Name: string };
                            User_ID?: number;
                            Created_By?: number;
                            User?: { First_Name: string; Last_Name: string };
                        }>;
                    } | Array<{
                        Booked_Room_ID: number;
                        Room_ID: number;
                        Start_Time: string;
                        End_Time: string;
                        Status: string;
                        Purpose?: string;
                        Room?: { Name: string };
                        User_ID?: number;
                        Created_By?: number;
                        User?: { First_Name: string; Last_Name: string };
                    }>;

                    const bookings = Array.isArray(bookingsPayload)
                        ? bookingsPayload
                        : Array.isArray(bookingsPayload?.data)
                            ? bookingsPayload.data
                            : [];

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
                                userId: booking.User_ID || booking.Created_By,
                                bookedByName: booking.User
                                    ? `${booking.User.First_Name} ${booking.User.Last_Name}`.trim()
                                    : 'Unknown',
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
    }, [labRooms.length, refreshTrigger, serverDayKey]); // Re-run when rooms, refresh, or server day changes

    // Compute the Monday (local) of the current server week.
    const weekStartDate = dayjs(serverCurrentTime).startOf('day').day() === 0
        ? dayjs(serverCurrentTime).startOf('day').subtract(6, 'day')
        : dayjs(serverCurrentTime).startOf('day').subtract(dayjs(serverCurrentTime).day() - 1, 'day');
    const weekEndDate = weekStartDate.add(7, 'day');
    const weekRangeKey = `${weekStartDate.format('YYYY-MM-DD')}_${weekEndDate.format('YYYY-MM-DD')}`;

    // Fetch a 7-day window of sessions for weekly mode.
    useEffect(() => {
        const loadWeekSessions = async () => {
            if (labRooms.length === 0) {
                setWeekSessions([]);
                return;
            }
            try {
                const weekDays = Array.from({ length: 7 }, (_, i) => weekStartDate.add(i, 'day'));
                const all: RoomSession[] = [];

                // 1. Expand class schedules across the week's days
                for (const room of labRooms) {
                    if (!room.Schedule) continue;
                    for (const schedule of room.Schedule) {
                        const scheduleDays = schedule.Days?.split(',').map(d => parseInt(d.trim())) || [];
                        const sStart = dayjs(schedule.Start_Time);
                        const sEnd = dayjs(schedule.End_Time);
                        for (const day of weekDays) {
                            if (scheduleDays.includes(day.day())) {
                                all.push({
                                    roomId: room.Room_ID,
                                    roomName: room.Name,
                                    startTime: day.hour(sStart.hour()).minute(sStart.minute()).toISOString(),
                                    endTime: day.hour(sEnd.hour()).minute(sEnd.minute()).toISOString(),
                                    status: 'approved',
                                    purpose: (schedule as { Title?: string }).Title || 'Scheduled',
                                    type: 'schedule',
                                    id: schedule.Schedule_ID
                                });
                            }
                        }
                    }
                }

                // 2. Fetch all APPROVED bookings in the week window for LAB rooms
                const response = await api.get('/bookings', {
                    params: {
                        status: 'APPROVED',
                        from: weekStartDate.toISOString(),
                        to: weekEndDate.toISOString()
                    }
                });
                const payload = response.data as {
                    data?: Array<{
                        Booked_Room_ID: number;
                        Room_ID: number;
                        Start_Time: string;
                        End_Time: string;
                        Status: string;
                        Purpose?: string;
                        Room?: { Name: string };
                        User_ID?: number;
                        Created_By?: number;
                        User?: { First_Name: string; Last_Name: string };
                    }>;
                } | Array<{
                    Booked_Room_ID: number;
                    Room_ID: number;
                    Start_Time: string;
                    End_Time: string;
                    Status: string;
                    Purpose?: string;
                    Room?: { Name: string };
                    User_ID?: number;
                    Created_By?: number;
                    User?: { First_Name: string; Last_Name: string };
                }>;
                const bookings = Array.isArray(payload)
                    ? payload
                    : Array.isArray(payload?.data)
                        ? payload.data
                        : [];

                const labRoomIds = new Set(labRooms.map(r => r.Room_ID));
                for (const b of bookings) {
                    if (!labRoomIds.has(b.Room_ID)) continue;
                    all.push({
                        roomId: b.Room_ID,
                        roomName: b.Room?.Name || '',
                        startTime: b.Start_Time,
                        endTime: b.End_Time,
                        status: 'approved',
                        purpose: b.Purpose || 'Booked',
                        id: b.Booked_Room_ID,
                        type: 'booking',
                        userId: b.User_ID || b.Created_By,
                        bookedByName: b.User
                            ? `${b.User.First_Name} ${b.User.Last_Name}`.trim()
                            : 'Unknown',
                    });
                }

                setWeekSessions(all);
            } catch (error) {
                console.error('Failed to load week sessions:', error);
            }
        };
        loadWeekSessions();
    }, [labRooms.length, weekRangeKey, refreshTrigger]);

    // Poll active queues for the SummaryStrip counters.
    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const data = await getActiveQueues();
                if (!cancelled) setActiveQueues(data);
            } catch (err) {
                console.error('Failed to load active queues:', err);
            }
        };
        load();
        const interval = window.setInterval(load, 30000);
        return () => {
            cancelled = true;
            window.clearInterval(interval);
        };
    }, [refreshTrigger]);

    const handleOpenOverflow = (preset: OverflowPreset) => {
        setOverflowPreset(preset);
        setSelectedSession(null);
        setSelectedRoom(null);
        setSelectedCategory(preset.labType);
        setQueueInitialMode('single');

        // Derive HH:MM strings from the preset ISO timestamps so QueueModal can
        // pre-fill its single-session time dropdowns.
        const start = new Date(preset.startTimeIso);
        const end = new Date(preset.endTimeIso);
        const toHHMM = (d: Date) => `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
        setSelectedSlotStart(toHHMM(start));
        setSelectedSlotEnd(toHHMM(end));
        setQueueModalOpen(true);
    };

    // Compute fully booked slots for the selected category's time picker
    const computeFullyBookedSlots = (): { startMinutes: number; endMinutes: number }[] => {
        if (!selectedCategory) return [];
        const categoryRooms = getRoomsForCategory(selectedCategory);
        const categorySessions = getSessionsForCategory(selectedCategory);
        const totalRooms = categoryRooms.length;
        if (totalRooms === 0) return [];

        const slots: { startMinutes: number; endMinutes: number }[] = [];
        // Check each 30-min slot from 7:00 to 21:00
        for (let m = 7 * 60; m < 21 * 60 + 30; m += 30) {
            const occupiedRoomIds = new Set<number>();
            categorySessions.forEach(s => {
                const sStart = new Date(s.startTime);
                const sEnd = new Date(s.endTime);
                const sStartMin = sStart.getHours() * 60 + sStart.getMinutes();
                const sEndMin = sEnd.getHours() * 60 + sEnd.getMinutes();
                if (m >= sStartMin && m < sEndMin) {
                    occupiedRoomIds.add(s.roomId);
                }
            });
            if (occupiedRoomIds.size >= totalRooms) {
                slots.push({ startMinutes: m, endMinutes: m + 30 });
            }
        }
        return slots;
    };

    const handleQueueRoom = async (startTime: string, endTime: string, roomId: number) => {
        // Single-session edit / overflow flows always use the current server day.
        const targetDate = dayjs(serverCurrentTime).startOf('day');
        const requestedStart = targetDate.hour(Number(startTime.split(':')[0])).minute(Number(startTime.split(':')[1])).toISOString();
        const requestedEnd = targetDate.hour(Number(endTime.split(':')[0])).minute(Number(endTime.split(':')[1])).toISOString();

        try {
            if (selectedSession && selectedSession.type === 'booking' && selectedSession.id) {
                // EDIT LOGIC
                if (selectedSession.userId !== user?.User_ID) {
                    await modal.showError("You can only edit your own bookings.", "Permission Denied");
                    return;
                }

                await api.patch(`/bookings/${selectedSession.id}`, {
                    Start_Time: requestedStart,
                    End_Time: requestedEnd
                });

                setSessions(prev => prev.map(s =>
                    s === selectedSession
                        ? { ...s, startTime: requestedStart, endTime: requestedEnd }
                        : s
                ));

                setQueueModalOpen(false);
                await modal.showSuccess('Booking updated successfully.', 'Success');
            } else {
                // CREATE LOGIC - use roomId directly
                const response = await setRoomStudentAvailability(roomId, {
                    startTime: requestedStart,
                    endTime: requestedEnd,
                    notes: `Student usage time set by staff`
                });

                setQueueModalOpen(false);
                setSelectedCategory(null);
                setSelectedSlotStart('');
                setSelectedSlotEnd('');
                setSelectedSession(null);
                setSelectedRoom(null);
                setRefreshTrigger(prev => prev + 1);
                await modal.showSuccess(
                    response.rejectedBookings?.length
                        ? `Room queue added. ${response.rejectedBookings.length} pending booking(s) were rejected due to conflict.`
                        : 'Room queue added successfully.',
                    'Success'
                );
            }
        } catch (error: any) {
            console.error('Error setting room availability:', error);
            const errorMessage = error.response?.data?.details || error.response?.data?.error || 'Failed to action room availability';
            await modal.showError(errorMessage, 'Error');
        }
    };

    const handleQueueWeekly = async (
        roomId: number,
        slots: { startTime: string; endTime: string }[]
    ) => {
        try {
            await api.post('/bookings/weekly', {
                roomId,
                purpose: 'Student Usage',
                slots
            });

            setQueueModalOpen(false);
            setSelectedCategory(null);
            setSelectedSlotStart('');
            setSelectedSlotEnd('');
            setSelectedSession(null);
            setSelectedRoom(null);
            setQueueInitialMode('weekly');
            setRefreshTrigger(prev => prev + 1);
            await modal.showSuccess(`Queued ${slots.length} session(s) for the week.`, 'Success');
        } catch (error: unknown) {
            console.error('Error queuing weekly:', error);
            const err = error as { response?: { data?: { details?: string; error?: string; conflictingSlots?: unknown[] } } };
            const data = err.response?.data;
            let errorMessage = data?.details || data?.error || 'Failed to queue weekly availability';
            if (Array.isArray(data?.conflictingSlots) && data.conflictingSlots.length > 0) {
                errorMessage += ` (${data.conflictingSlots.length} conflicting slot${data.conflictingSlots.length === 1 ? '' : 's'})`;
            }
            await modal.showError(errorMessage, 'Error');
            throw error;
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

        const confirmed = await modal.showConfirm("Are you sure you want to remove this booking?", "Confirm Removal");
        if (!confirmed) return;

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

    const handleSlotDetail = (_startTime: string, detailSessions: RoomSession[]) => {
        setSlotDetailSessions(detailSessions);
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
                        <Building2 className="h-4 w-4" />
                        Rooms
                    </button>
                    <button
                        onClick={() => setActiveTab('queue')}
                        className={`inline-flex items-center gap-2 rounded-r-lg px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'queue'
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                            }`}
                    >
                        <CalendarDays className="h-4 w-4" />
                        Computer Use Queue
                    </button>
                </div>
            </div>

            {/* Filters Bar / Queue Header */}
            {activeTab === 'rooms' && (
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
                    <div className="min-w-48">
                        <FloatingSelect
                            id="room-type-filter"
                            value={typeFilter}
                            placeholder="All Types"
                            options={[
                                { value: 'All Types', label: 'All Types' },
                                { value: 'LECTURE', label: 'Lecture Room' },
                                { value: 'CONFERENCE', label: 'Conference Room' },
                                { value: 'CONSULTATION', label: 'Consultation Room' },
                                { value: 'LAB', label: 'Lab' },
                            ]}
                            onChange={(type) => setTypeFilter(type as TypeFilterType)}
                        />
                    </div>

                    {/* Status Filter */}
                    <div className="min-w-44">
                        <FloatingSelect
                            id="room-status-filter"
                            value={statusFilter}
                            placeholder="All Status"
                            options={[
                                { value: 'All Status', label: 'All Status' },
                                { value: 'AVAILABLE', label: 'Available' },
                                { value: 'IN_USE', label: 'In Use' },
                                { value: 'MAINTENANCE', label: 'Maintenance' },
                            ]}
                            onChange={(status) => setStatusFilter(status as StatusFilterType)}
                        />
                    </div>

                    {/* Results Count */}
                    <div className="ml-auto flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <span className="font-semibold text-gray-900 dark:text-white">
                            {filteredRooms.length}
                        </span>
                        <span>of {rooms.length} rooms</span>
                    </div>
                </div>
            )}

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
                            <Building2 className="h-12 w-12 text-gray-400" />
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
                    /* Room Availability Queue — vertical layout:
                       [Summary strip] → [Active Queue Dashboard] → [Weekly Swimlane Grid] */
                    <div className="space-y-6">
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                {dayjs(serverCurrentTime).format('dddd, MMMM D')}
                            </span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Rooms queued here are reserved for student use during the selected time window.
                        </p>

                        {isLoading ? (
                            <div className="space-y-4">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="h-40 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
                                ))}
                            </div>
                        ) : labRooms.length > 0 ? (
                            <>
                                <SummaryStrip
                                    activeQueues={activeQueues}
                                    rooms={labRooms}
                                    weekSessions={weekSessions}
                                    currentTime={serverCurrentTime}
                                />

                                <div>
                                    <h2 className="mb-2 text-base font-semibold text-gray-900 dark:text-white">Active Queues</h2>
                                    <ActiveQueueDashboard
                                        allRooms={labRooms}
                                        weekSessions={weekSessions}
                                        onOpenOverflow={handleOpenOverflow}
                                        refreshSignal={refreshTrigger}
                                    />
                                </div>

                                <div>
                                    <h2 className="mb-2 text-base font-semibold text-gray-900 dark:text-white">Weekly Schedule</h2>
                                    <WeeklySwimlaneGrid
                                        rooms={labRooms}
                                        weekSessions={weekSessions}
                                        weekStart={weekStartDate.toDate()}
                                        currentTime={serverCurrentTime}
                                        onSlotClick={(labType, startISO, endISO) => {
                                            const cat = labType as LabCategory;
                                            setSelectedCategory(cat);
                                            setSelectedSession(null);
                                            setSelectedRoom(null);
                                            setSelectedSlotStart(startISO);
                                            setSelectedSlotEnd(endISO);
                                            setQueueInitialMode('single');
                                            setQueueModalOpen(true);
                                        }}
                                        onAddRoom={(labType, day) => {
                                            const cat = labType as LabCategory;
                                            const start = new Date(day);
                                            start.setHours(9, 0, 0, 0);
                                            const end = new Date(day);
                                            end.setHours(10, 0, 0, 0);
                                            setSelectedCategory(cat);
                                            setSelectedSession(null);
                                            setSelectedRoom(null);
                                            setSelectedSlotStart(start.toISOString());
                                            setSelectedSlotEnd(end.toISOString());
                                            setQueueInitialMode('single');
                                            setQueueModalOpen(true);
                                        }}
                                        onBlockerClick={(blocker, room) => {
                                            const startLabel = dayjs(blocker.startTime).format('ddd MMM D · h:mm A');
                                            const endLabel = dayjs(blocker.endTime).format('h:mm A');
                                            const roomName = room?.Name || `Room ${blocker.roomId}`;
                                            let kind = 'Booking';
                                            let detail = blocker.purpose || 'Booked';
                                            if (blocker.type === 'schedule') {
                                                kind = 'Class schedule';
                                                detail = blocker.purpose || 'Scheduled class';
                                            } else if (blocker.purpose === 'Student Usage') {
                                                kind = 'Queued for student usage';
                                                detail = blocker.bookedByName
                                                    ? `Queued by ${blocker.bookedByName}`
                                                    : 'Queued by a lab technician';
                                            }
                                            void modal.showAlert(
                                                `${roomName} · ${startLabel} – ${endLabel}\n\n${kind}: ${detail}`,
                                                'Slot details',
                                            );
                                        }}
                                    />
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12">
                                <Building2 className="h-12 w-12 text-gray-400" />
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
                    setSelectedCategory(null);
                    setQueueInitialMode('weekly');
                    setOverflowPreset(null);
                }}
                onQueue={handleQueueRoom}
                onQueueWeekly={handleQueueWeekly}
                onRemove={selectedSession ? () => handleRemoveSession(selectedSession!) : () => { }}
                availableRooms={overflowPreset
                    ? overflowPreset.eligibleRooms
                    : getRoomsForCategory(selectedCategory)}
                categorySessions={getSessionsForCategory(selectedCategory)}
                weekSessions={weekSessions.filter(s => {
                    // Filter to the selected category's rooms to keep blocker logic focused.
                    const catRoomIds = new Set(getRoomsForCategory(selectedCategory).map(r => r.Room_ID));
                    return catRoomIds.has(s.roomId);
                })}
                weekStart={weekStartDate.toDate()}
                editingSessionId={selectedSession?.id}
                initialStartTime={selectedSlotStart}
                initialEndTime={selectedSlotEnd}
                initialMode={queueInitialMode}
                selectedQueueItem={selectedSession ? {
                    roomId: selectedSession.roomId,
                    roomName: selectedSession.roomName,
                    startTime: selectedSession.startTime,
                    endTime: selectedSession.endTime,
                    user: 'labtech',
                    status: selectedSession.status,
                } : null}
                readOnly={selectedSession ? (
                    selectedSession.type === 'schedule' ||
                    (selectedSession.type === 'booking' && selectedSession.userId !== user?.User_ID)
                ) : false}
                fullyBookedSlots={computeFullyBookedSlots()}
            />

            {slotDetailSessions && (
                <div
                    className="fixed inset-0 bg-black/40 grid place-items-center p-4 z-50"
                    onClick={() => setSlotDetailSessions(null)}
                >
                    <div
                        className="w-full max-w-md rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-6 shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Slot Bookings</h3>
                            <button
                                onClick={() => setSlotDetailSessions(null)}
                                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                            {slotDetailSessions.map((session, idx) => (
                                <div key={idx} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">{session.roomName}</p>
                                            {session.type === 'schedule' ? (
                                                <>
                                                    <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">Class Schedule</p>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">{session.purpose || 'Class schedule'}</p>
                                                    <p className="text-xs text-gray-400 dark:text-gray-500">
                                                        {dayjs(session.startTime).format('h:mm A')} - {dayjs(session.endTime).format('h:mm A')}
                                                    </p>
                                                </>
                                            ) : session.type === 'booking' && session.purpose !== 'Student Usage' ? (
                                                <p className="text-sm text-gray-500 dark:text-gray-400 italic">Unavailable</p>
                                            ) : (
                                                <>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">{session.purpose || 'Booked'}</p>
                                                    {session.bookedByName && (
                                                        <p className="text-xs text-gray-400 dark:text-gray-500">by {session.bookedByName}</p>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                        {session.type === 'booking' && session.userId === user?.User_ID && (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        setSlotDetailSessions(null);
                                                        setSelectedSession(session);
                                                        const room = labRooms.find(r => r.Room_ID === session.roomId);
                                                        if (room) {
                                                            const cat: LabCategory = room.Lab_Type || 'UNASSIGNED';
                                                            setSelectedCategory(cat);
                                                        }
                                                        // Editing a single existing session uses single-session mode
                                                        // (the weekly grid view doesn't fit editing one slot).
                                                        setQueueInitialMode('single');
                                                        setQueueModalOpen(true);
                                                    }}
                                                    className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSlotDetailSessions(null);
                                                        handleRemoveSession(session);
                                                    }}
                                                    className="text-xs text-red-600 hover:text-red-800 dark:text-red-400"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {selectedViewRoom && (
                <RoomDetailModal
                    isOpen={!!selectedViewRoom}
                    onClose={() => setSelectedViewRoom(null)}
                    room={selectedViewRoom!}
                    sessions={getSessionsByCategory([selectedViewRoom!])}
                />
            )}
        </div>
    );
}
