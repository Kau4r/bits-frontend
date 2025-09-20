import dayjs from 'dayjs'
import { useState } from 'react'
import type { Room } from '@/types/room'
import QueueModal from './components/QueueModal'

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

export default function Room() {
    const [roomSchedules, setRoomSchedules] = useState<RoomSchedule[]>([{
        roomCode: 'LB 483', start: '2025-08-06T09:00', end: '2025-08-06T11:00'
    }, {
        roomCode: 'CNF 2', start: '2025-08-06T08:00', end: '2025-08-06T10:00'
    }])
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedSegment, setSelectedSegment] = useState<'CB1' | 'CB2'>('CB1')
    const [rooms] = useState<Room[]>([
        { code: 'LB 482', type: 'Consultation Room', status: 'Available' },
        { code: 'LB 481', type: 'Consultation Room', status: 'Available' },
        { code: 'LB 483', type: 'Conference Room', status: 'Available' },
        { code: 'LB 484', type: 'Lecture Room', status: 'In Use' },
        { code: 'LB 485', type: 'Conference Room', status: 'In Use' },
        { code: 'LB 486', type: 'Lecture Room', status: 'Available' },
    ])

    const startHour = 7
    const endHour = 19
    const hours = Array.from({ length: endHour - startHour }, (_, i) =>
        dayjs().hour(startHour + i).minute(0).format('h A')
    )

    const [queueItems, setQueueItems] = useState<RoomQueueItem[]>([])
    const [selectedQueueItem, setSelectedQueueItem] = useState<RoomQueueItem | null>(null)

    const handleQueueItemClick = (item: RoomQueueItem) => {
        setSelectedQueueItem(item)
        setQueueModalOpen(true)
    }
    const [queueModalOpen, setQueueModalOpen] = useState(false)
    const [user] = useState('labtech')

    function isConflict(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
        return !(aEnd <= bStart || aStart >= bEnd)
    }

    const handleQueueRoom = (startTime: string, endTime: string, segment: 'CB1' | 'CB2') => {
        const today = dayjs().startOf('day')
        const requestedStart = today.hour(Number(startTime.split(':')[0])).minute(Number(startTime.split(':')[1])).toISOString()
        const requestedEnd = today.hour(Number(endTime.split(':')[0])).minute(Number(endTime.split(':')[1])).toISOString()

        const primaryRoom = segment === 'CB1' ? 'LB 483' : 'CNF 2'
        const fallbackRooms = segment === 'CB1' ? ['LB 101', 'CNF 1'] : ['CTL 1', 'CTL 2']

        let assignedRoom: string | null = null

        const primaryConflict = roomSchedules.some(
            s => s.roomCode === primaryRoom && isConflict(requestedStart, requestedEnd, s.start, s.end)
        )

        if (!primaryConflict) {
            assignedRoom = primaryRoom
        } else {
            for (const fallback of fallbackRooms) {
                const hasConflict = roomSchedules.some(
                    s => s.roomCode === fallback && isConflict(requestedStart, requestedEnd, s.start, s.end)
                )
                const isAvailable = rooms.find(r => r.code === fallback)?.status === 'Available'
                if (!hasConflict && isAvailable) {
                    assignedRoom = fallback
                    break
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
        }

        setQueueItems(prev => [...prev, newQueueItem])

        if (assignedRoom) {
            setRoomSchedules(prev => [...prev, {
                roomCode: assignedRoom,
                start: requestedStart,
                end: requestedEnd
            }])
        }
    }

    const filteredRooms = rooms.filter(room =>
        room.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        room.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        room.status.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const borrowing1 = queueItems.filter(item => item.segment === 'CB1')
    const borrowing2 = queueItems.filter(item => item.segment === 'CB2')

    return (
        <div className="p-6 dark:bg-gray-900 min-h-screen text-white">
            <div className="overflow-x-auto text-white text-sm mb-4">
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
                                const start = dayjs(item.startTime)
                                const end = dayjs(item.endTime)
                                const startMinutes = (start.hour() * 60 + start.minute()) - (startHour * 60)
                                const endMinutes = (end.hour() * 60 + end.minute()) - (startHour * 60)
                                const totalMinutes = (endHour - startHour) * 60
                                const left = (startMinutes / totalMinutes) * 100
                                const width = ((endMinutes - startMinutes) / totalMinutes) * 100
                                const colour = item.status === 'approved'
                                    ? 'bg-green-600'
                                    : item.status === 'pending'
                                        ? 'bg-yellow-500'
                                        : 'bg-red-500'
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
                                )
                            })}
                        </div>
                    </div>

                    {/* CB2 */}
                    <div className="grid grid-cols-[150px_1fr] items-start mb-6 gap-3">
                        <h3 className="text-md font-bold text-white whitespace-nowrap mt-1">Computer Borrowing 2</h3>
                        <div className="relative h-10 bg-gray-800 rounded border border-gray-700 overflow-hidden w-full flex items-center px-1">
                            {borrowing2.map((item, index) => {
                                const start = dayjs(item.startTime)
                                const end = dayjs(item.endTime)
                                const startMinutes = (start.hour() * 60 + start.minute()) - (startHour * 60)
                                const endMinutes = (end.hour() * 60 + end.minute()) - (startHour * 60)
                                const totalMinutes = (endHour - startHour) * 60
                                const left = (startMinutes / totalMinutes) * 100
                                const width = ((endMinutes - startMinutes) / totalMinutes) * 100
                                const colour = item.status === 'approved'
                                    ? 'bg-green-600'
                                    : item.status === 'pending'
                                        ? 'bg-yellow-500'
                                        : 'bg-red-500'
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
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>
            <div className="mb-6">
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search rooms..."
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
                />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredRooms.map((room) => (
                    <div key={room.code} className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-blue-500 transition-colors">
                        <div className={`inline-block px-2 py-1 rounded-full text-xs font-semibold mb-2 ${room.status === 'Available'
                            ? 'bg-green-500/20 text-green-500'
                            : 'bg-yellow-500/20 text-yellow-500'
                            }`}>
                            {room.status}
                        </div>
                        <h2 className="text-xl font-semibold mb-2">{room.code}</h2>
                        <p className="text-gray-400">{room.type}</p>
                        <button
                            onClick={() => {
                                setSelectedSegment(room.code === 'LB 483' || room.code === 'LB 101' ? 'CB1' : 'CB2')
                                setQueueModalOpen(true)
                            }}
                            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors w-full"
                        >
                            Queue Room
                        </button>
                    </div>
                ))}
            </div>


            <QueueModal
                isOpen={queueModalOpen}
                onClose={() => {
                    setQueueModalOpen(false)
                    setSelectedQueueItem(null)
                }}
                onQueue={handleQueueRoom}
                onRemove={(item) => {
                    setQueueItems(prev => prev.filter(q => q !== item))
                    setRoomSchedules(prev => prev.filter(
                        s => !(s.roomCode === item.roomCode && s.start === item.startTime && s.end === item.endTime)
                    ))
                }}
                roomCode={selectedQueueItem?.roomCode || null}
                segment={selectedQueueItem?.segment || selectedSegment}
                selectedQueueItem={selectedQueueItem}
            />

        </div>
    );
}
