import { useState } from 'react'
import { PlusIcon } from '@heroicons/react/24/outline'
import Search from '@/components/Search'
import { type Room } from '@/types/Room'
import RoomCard from '@/components/SysAd/room/RoomCard'
import RoomModal from '@/components/SysAd/room/RoomModal'

const mockRooms: Room[] = [
  { code: 'CTL 1', type: 'Consultation Room', status: 'Available' },
  { code: 'CTL 2', type: 'Consultation Room', status: 'Available' },
  { code: 'CNF 1', type: 'Conference Room', status: 'Available' },
  { code: 'LB 483', type: 'Lecture Room', status: 'In Use' },
  { code: 'CNF 2', type: 'Conference Room', status: 'In Use' },
  { code: 'LB 101', type: 'Lecture Room', status: 'Available' },
]

export default function RoomPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [rooms, setRooms] = useState<Room[]>(mockRooms)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('view')
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)

  const handleRoomSubmit = (room: Room) => {
    setRooms((prev) => {
      const index = prev.findIndex((r) => r.code === room.code)
      if (index !== -1) {
        const updated = [...prev]
        updated[index] = room
        return updated
      }
      return [...prev, room]
    })
    setIsModalOpen(false)
    setSelectedRoom(null)
  }

  return (
    <div className="h-full w-full bg-white p-4 sm:px-8 lg:px-10 dark:bg-gray-900">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold">Room Management</h2>
        <Search searchTerm={searchTerm} onChange={setSearchTerm} showLabel={false} />
        <button
          className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none dark:bg-indigo-700 dark:hover:bg-indigo-600"
          onClick={() => {
            setSelectedRoom(null)
            setModalMode('add')
            setIsModalOpen(true)
          }}
        >
          <PlusIcon className="mr-2 h-5 w-5" />
          Add Room
        </button>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {rooms
          .filter(
            (room) =>
              room.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
              room.type.toLowerCase().includes(searchTerm.toLowerCase())
          )
          .map((room) => (
            <RoomCard
              key={room.code}
              room={room}
              onView={() => {
                setSelectedRoom(room)
                setModalMode('view')
                setIsModalOpen(true)
              }}
            />
          ))}
      </div>
      {isModalOpen && (
        <RoomModal
          mode={modalMode}
          initialData={selectedRoom ?? undefined}
          onClose={() => {
            setIsModalOpen(false)
            setSelectedRoom(null)
          }}
          onSubmit={handleRoomSubmit}
        />
      )}
    </div>
  )
}
