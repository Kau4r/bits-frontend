import { useState } from 'react'
import { PlusIcon } from '@heroicons/react/24/outline'
import Search from '@/components/Search'
import RoomCard from '@/components/room/RoomCard'

// Define the Room type if not globally available
interface Room {
  code: string
  type: 'Consultation Room' | 'Conference Room' | 'Lecture Room'
  status: 'Available' | 'In Use'
  nextSchedule: string
  instructor?: string
}

const rooms: Room[] = [
  {
    code: 'CTL 1',
    type: 'Consultation Room',
    status: 'Available',
    nextSchedule: '12:00 - 13:30',
  },
  {
    code: 'CTL 2',
    type: 'Consultation Room',
    status: 'Available',
    nextSchedule: '13:30 - 15:00',
  },
  {
    code: 'CNF 1',
    type: 'Conference Room',
    status: 'Available',
    nextSchedule: '12:00 - 13:30',
  },
  {
    code: 'LB 483',
    type: 'Lecture Room',
    status: 'In Use',
    nextSchedule: '12:00 - 13:30',
    instructor: 'Mr. Sabandal',
  },
  {
    code: 'CNF 2',
    type: 'Conference Room',
    status: 'In Use',
    nextSchedule: '14:00 - 15:30',
    instructor: 'Ms. Delos Santos',
  },
  {
    code: 'LB 101',
    type: 'Lecture Room',
    status: 'Available',
    nextSchedule: '15:00 - 16:30',
  },
]

export default function RoomPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <div className="h-full w-full bg-white p-4 sm:px-8 lg:px-10 dark:bg-gray-900">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold">Room Management</h2>
        <Search searchTerm={searchTerm} onChange={setSearchTerm} showLabel={false} />
        <button
          className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none dark:bg-indigo-700 dark:hover:bg-indigo-600"
          onClick={() => setIsModalOpen(true)}
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
            <RoomCard key={room.code} room={room} />
          ))}
      </div>
    </div>
  )
}
