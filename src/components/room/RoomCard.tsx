interface Room {
  code: string
  type: 'Consultation Room' | 'Conference Room' | 'Lecture Room'
  status: 'Available' | 'In Use'
  nextSchedule: string
  instructor?: string
}

interface Props {
  room: Room
}

const statusStyles = {
  Available: 'bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-100',
  'In Use': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-800 dark:text-yellow-100',
}

export default function RoomCard({ room }: Props) {
  return (
    <div className="relative flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      {/* Status badge */}
      <span
        className={`absolute top-3 right-3 rounded-full px-2 py-1 text-xs font-semibold ${statusStyles[room.status]}`}
      >
        {room.status}
      </span>

      {/* Room Code */}
      <h2 className="text-xl font-bold text-slate-800 dark:text-white">{room.code}</h2>

      {/* Room Type */}
      <p className="text-sm text-slate-500 dark:text-slate-300">{room.type}</p>

      {/* Schedule Section */}
      <div className="mt-4 text-sm text-slate-600 dark:text-slate-200">
        <p className="text-xs text-slate-400 dark:text-slate-400">Next Schedule</p>
        <p>{room.nextSchedule}</p>
        {room.instructor && <p className="text-xs">{room.instructor}</p>}
      </div>

      {/* Action Button */}
      <button className="mt-auto rounded-lg bg-slate-700 px-4 py-2 text-sm text-white transition hover:bg-slate-800">
        View Details
      </button>
    </div>
  )
}
