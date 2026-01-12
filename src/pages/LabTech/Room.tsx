import dayjs from 'dayjs'
import { useState, useEffect } from 'react'
import type { Room as RoomType, RoomStatus, RoomType as RoomTypeEnum, LabCategory } from '@/types/room'
import { labCategoryLabels, labCategories } from '@/types/room'
import { getRooms } from '@/services/room'
import QueueModal from './components/QueueModal'
import RoomDetailModal from './components/RoomDetailModal'
import RoomCard from './components/RoomCard'
import TimeSlotGrid from './components/TimeSlotGrid'

interface RoomSession {
    roomName: string;
    startTime: string;
    endTime: string;
    status: 'pending' | 'approved' | 'rejected';
    labCategory: LabCategory;
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

export default function Room() {
    const [activeTab, setActiveTab] = useState<TabType>('rooms');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilterType>('All Status');
    const [typeFilter, setTypeFilter] = useState<TypeFilterType>('All Types');

    const [rooms, setRooms] = useState<RoomType[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [sessions, setSessions] = useState<RoomSession[]>([]);
    const [queueModalOpen, setQueueModalOpen] = useState(false);
    const [selectedLabCategory, setSelectedLabCategory] = useState<LabCategory | null>(null);
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

    // Filter LAB rooms by category
    const getLabRoomsByCategory = (category: LabCategory) => {
        return rooms.filter(r => r.Room_Type === 'LAB' && r.Lab_Category === category);
    };

    // Get sessions for a category
    const getSessionsByCategory = (category: LabCategory) => {
        return sessions.filter(s => s.labCategory === category);
    };

    const handleAddRoom = (category: LabCategory, _startTime: string, _endTime: string) => {
        setSelectedLabCategory(category);
        setSelectedSession(null);
        setQueueModalOpen(true);
    };

    const handleSessionClick = (session: { roomName: string; startTime: string; endTime: string; status: 'pending' | 'approved' | 'rejected'; labCategory?: string }) => {
        // Find the full session with labCategory
        const fullSession = sessions.find(s => s.roomName === session.roomName && s.startTime === session.startTime);
        if (fullSession) {
            setSelectedSession(fullSession);
            setSelectedLabCategory(fullSession.labCategory);
            setQueueModalOpen(true);
        }
    };

    const handleQueueRoom = (startTime: string, endTime: string, roomName: string) => {
        if (!selectedLabCategory) return;

        const today = dayjs().startOf('day');
        const requestedStart = today.hour(Number(startTime.split(':')[0])).minute(Number(startTime.split(':')[1])).toISOString();
        const requestedEnd = today.hour(Number(endTime.split(':')[0])).minute(Number(endTime.split(':')[1])).toISOString();

        const newSession: RoomSession = {
            roomName,
            startTime: requestedStart,
            endTime: requestedEnd,
            status: 'approved',
            labCategory: selectedLabCategory,
        };

        setSessions(prev => [...prev, newSession]);
    };

    const handleRemoveSession = (session: RoomSession) => {
        setSessions(prev => prev.filter(s => s !== session));
        setQueueModalOpen(false);
        setSelectedSession(null);
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
                    /* Room Availability Queue - Grouped by Lab Category */
                    <div className="space-y-8">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-32">
                                <div className="text-gray-400">Loading lab rooms...</div>
                            </div>
                        ) : (
                            labCategories.map((category) => {
                                const categoryRooms = getLabRoomsByCategory(category);
                                const categorySessions = getSessionsByCategory(category);

                                // Only show categories that have rooms
                                if (categoryRooms.length === 0) return null;

                                return (
                                    <div key={category} className="bg-gray-800 rounded-lg p-4">
                                        <h2 className="text-xl font-bold text-white mb-4">
                                            {labCategoryLabels[category]}:
                                        </h2>
                                        <TimeSlotGrid
                                            sessions={categorySessions}
                                            totalRoomsInCategory={categoryRooms.length}
                                            onAddRoom={(start, end) => handleAddRoom(category, start, end)}
                                            onSessionClick={handleSessionClick}
                                        />

                                        {/* Add Room Button */}
                                        <div className="mt-4 flex justify-center">
                                            <button
                                                onClick={() => handleAddRoom(category, '09:00', '10:00')}
                                                className="px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors"
                                            >
                                                + Add Room
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}

                        {/* Show message if no lab rooms exist */}
                        {!isLoading && labCategories.every(cat => getLabRoomsByCategory(cat).length === 0) && (
                            <div className="text-center text-gray-500 py-12">
                                No LAB rooms with categories found. Please assign Lab_Category to your LAB rooms.
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
                    setSelectedLabCategory(null);
                }}
                onQueue={handleQueueRoom}
                onRemove={selectedSession ? () => handleRemoveSession(selectedSession) : () => { }}
                availableRooms={selectedLabCategory ? getLabRoomsByCategory(selectedLabCategory) : []}
                selectedQueueItem={selectedSession ? {
                    roomName: selectedSession.roomName,
                    startTime: selectedSession.startTime,
                    endTime: selectedSession.endTime,
                    user: 'labtech',
                    status: selectedSession.status,
                } : null}
            />
            {selectedViewRoom && (
                <RoomDetailModal
                    isOpen={!!selectedViewRoom}
                    onClose={() => setSelectedViewRoom(null)}
                    room={selectedViewRoom}
                />
            )}
        </div>
    );
}
