import dayjs from 'dayjs'
import { useState, useEffect } from 'react'
import type { Room as RoomType, RoomStatus, RoomType as RoomTypeEnum } from '@/types/room'
import { getRooms } from '@/services/room'
import QueueModal from './components/QueueModal'
import RoomCard from './components/RoomCard'

interface RoomQueueItem {
    roomCode: string;
    startTime: string;
    endTime: string;
    user: string;
    status: 'pending' | 'approved' | 'rejected';
    segment: 'CB1' | 'CB2';
}

interface RoomSchedule {
    roomCode: string;
    start: string;
    end: string;
}

type TabType = 'rooms' | 'queue';
type StatusFilterType = 'All Status' | RoomStatus;
type TypeFilterType = 'All Types' | RoomTypeEnum;

// Map backend Room_Type to display name
const roomTypeLabels: Record<RoomTypeEnum, string> = {
    CONSULTATION: 'Consultation Room',
    LECTURE: 'Lecture Room',
    LAB: 'Lab',
};

// Map backend Status to display name
const statusLabels: Record<RoomStatus, string> = {
    AVAILABLE: 'Available',
    IN_USE: 'In Use',
    MAINTENANCE: 'Maintenance',
    OCCUPIED: 'Occupied',
    RESERVED: 'Reserved',
};

export default function Room() {
    const [activeTab, setActiveTab] = useState<TabType>('rooms');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilterType>('All Status');
    const [typeFilter, setTypeFilter] = useState<TypeFilterType>('All Types');

    const [rooms, setRooms] = useState<RoomType[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [roomSchedules, setRoomSchedules] = useState<RoomSchedule[]>([
        { roomCode: 'LB 483', start: '2025-08-06T09:00', end: '2025-08-06T11:00' },
        { roomCode: 'CNF 2', start: '2025-08-06T08:00', end: '2025-08-06T10:00' }
    ]);

    const [queueItems, setQueueItems] = useState<RoomQueueItem[]>([]);
    const [selectedQueueItem, setSelectedQueueItem] = useState<RoomQueueItem | null>(null);
    const [queueModalOpen, setQueueModalOpen] = useState(false);
    const [selectedSegment, setSelectedSegment] = useState<'CB1' | 'CB2'>('CB1');
    const [user] = useState('labtech');

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

    // Timeline config
    const startHour = 7;
    const endHour = 19;
    const hours = Array.from({ length: endHour - startHour }, (_, i) =>
        dayjs().hour(startHour + i).minute(0).format('h A')
    );

    function isConflict(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
        return !(aEnd <= bStart || aStart >= bEnd);
    }

    const handleQueueRoom = (startTime: string, endTime: string, segment: 'CB1' | 'CB2') => {
        const today = dayjs().startOf('day');
        const requestedStart = today.hour(Number(startTime.split(':')[0])).minute(Number(startTime.split(':')[1])).toISOString();
        const requestedEnd = today.hour(Number(endTime.split(':')[0])).minute(Number(endTime.split(':')[1])).toISOString();

        const primaryRoom = segment === 'CB1' ? 'LB 483' : 'CNF 2';
        const fallbackRooms = segment === 'CB1' ? ['LB 101', 'CNF 1'] : ['CTL 1', 'CTL 2'];

        let assignedRoom: string | null = null;

        const primaryConflict = roomSchedules.some(
            s => s.roomCode === primaryRoom && isConflict(requestedStart, requestedEnd, s.start, s.end)
        );

        if (!primaryConflict) {
            assignedRoom = primaryRoom;
        } else {
            for (const fallback of fallbackRooms) {
                const hasConflict = roomSchedules.some(
                    s => s.roomCode === fallback && isConflict(requestedStart, requestedEnd, s.start, s.end)
                );
                const isAvailable = rooms.find(r => r.Name === fallback)?.Status === 'AVAILABLE';
                if (!hasConflict && isAvailable) {
                    assignedRoom = fallback;
                    break;
                }
            }
        }

        const newQueueItem: RoomQueueItem = {
            roomCode: assignedRoom ?? 'Unassigned',
            startTime: requestedStart,
            endTime: requestedEnd,
            user,
            status: assignedRoom ? 'approved' : 'pending',
            segment,
        };

        setQueueItems(prev => [...prev, newQueueItem]);

        if (assignedRoom) {
            setRoomSchedules(prev => [...prev, {
                roomCode: assignedRoom,
                start: requestedStart,
                end: requestedEnd
            }]);
        }
    };

    const handleQueueItemClick = (item: RoomQueueItem) => {
        setSelectedQueueItem(item);
        setQueueModalOpen(true);
    };

    // Filtering
    const filteredRooms = rooms.filter(room => {
        const matchesSearch = room.Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            roomTypeLabels[room.Room_Type].toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'All Status' || room.Status === statusFilter;
        const matchesType = typeFilter === 'All Types' || room.Room_Type === typeFilter;
        return matchesSearch && matchesStatus && matchesType;
    });

    const borrowing1 = queueItems.filter(item => item.segment === 'CB1');
    const borrowing2 = queueItems.filter(item => item.segment === 'CB2');

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
                    /* Rooms Grid */
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
                                    onViewDetails={() => console.log('View details:', room.Room_ID)}
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
                    /* Room Availability Queue Timeline */
                    <div className="overflow-x-auto text-white text-sm">
                        <div className="min-w-[1000px]">
                            <div className="grid grid-cols-[150px_1fr] border-b border-gray-600 mb-2">
                                <div className="font-semibold">Time →</div>
                                <div className="grid grid-cols-12 text-gray-400 pl-5">
                                    {hours.map((label, index) => (
                                        <div key={index}>{label}</div>
                                    ))}
                                </div>
                            </div>

                            {/* CB1 */}
                            <div className="grid grid-cols-[150px_1fr] items-start mb-6 gap-3">
                                <h3 className="text-md font-bold text-white whitespace-nowrap mt-1">Computer Borrowing 1</h3>
                                <div className="relative h-10 bg-gray-800 rounded border border-gray-700 overflow-hidden w-full flex items-center px-1">
                                    {borrowing1.map((item, index) => {
                                        const start = dayjs(item.startTime);
                                        const end = dayjs(item.endTime);
                                        const startMinutes = (start.hour() * 60 + start.minute()) - (startHour * 60);
                                        const endMinutes = (end.hour() * 60 + end.minute()) - (startHour * 60);
                                        const totalMinutes = (endHour - startHour) * 60;
                                        const left = (startMinutes / totalMinutes) * 100;
                                        const width = ((endMinutes - startMinutes) / totalMinutes) * 100;
                                        const colour = item.status === 'approved'
                                            ? 'bg-green-600'
                                            : item.status === 'pending'
                                                ? 'bg-yellow-500'
                                                : 'bg-red-500';
                                        return (
                                            <div
                                                key={`b1-${index}`}
                                                className={`absolute h-6 rounded text-xs text-white px-2 flex items-center justify-center ${colour} cursor-pointer`}
                                                style={{ left: `${left}%`, width: `${width}%` }}
                                                title={`${start.format('h:mm A')}–${end.format('h:mm A')}`}
                                                onClick={() => handleQueueItemClick(item)}
                                            >
                                                {item.roomCode}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* CB2 */}
                            <div className="grid grid-cols-[150px_1fr] items-start mb-6 gap-3">
                                <h3 className="text-md font-bold text-white whitespace-nowrap mt-1">Computer Borrowing 2</h3>
                                <div className="relative h-10 bg-gray-800 rounded border border-gray-700 overflow-hidden w-full flex items-center px-1">
                                    {borrowing2.map((item, index) => {
                                        const start = dayjs(item.startTime);
                                        const end = dayjs(item.endTime);
                                        const startMinutes = (start.hour() * 60 + start.minute()) - (startHour * 60);
                                        const endMinutes = (end.hour() * 60 + end.minute()) - (startHour * 60);
                                        const totalMinutes = (endHour - startHour) * 60;
                                        const left = (startMinutes / totalMinutes) * 100;
                                        const width = ((endMinutes - startMinutes) / totalMinutes) * 100;
                                        const colour = item.status === 'approved'
                                            ? 'bg-green-600'
                                            : item.status === 'pending'
                                                ? 'bg-yellow-500'
                                                : 'bg-red-500';
                                        return (
                                            <div
                                                key={`b2-${index}`}
                                                className={`absolute h-6 rounded text-xs text-white px-2 flex items-center justify-center ${colour} cursor-pointer`}
                                                style={{ left: `${left}%`, width: `${width}%` }}
                                                title={`${start.format('h:mm A')}–${end.format('h:mm A')}`}
                                                onClick={() => handleQueueItemClick(item)}
                                            >
                                                {item.roomCode}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <QueueModal
                isOpen={queueModalOpen}
                onClose={() => {
                    setQueueModalOpen(false);
                    setSelectedQueueItem(null);
                }}
                onQueue={handleQueueRoom}
                onRemove={(item) => {
                    setQueueItems(prev => prev.filter(q => q !== item));
                    setRoomSchedules(prev => prev.filter(
                        s => !(s.roomCode === item.roomCode && s.start === item.startTime && s.end === item.endTime)
                    ));
                }}
                roomCode={selectedQueueItem?.roomCode || null}
                segment={selectedQueueItem?.segment || selectedSegment}
                selectedQueueItem={selectedQueueItem}
            />
        </div>
    );
}
