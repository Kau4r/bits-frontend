import { statusColors, type Room } from "@/types/room"

interface Props {
  room: Room
  onView: (room: Room) => void
}

export default function RoomCard({ room, onView }: Props) {
  return (
    <div className="relative flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      {/* Status badge */}
      <span
        className={`absolute top-3 right-3 rounded-full px-2 py-1 text-xs font-semibold ${statusColors[room.Status]}`}
      >
        {room.Status}
      </span>

      {/* Room Code */}
      <h2 className="text-xl font-bold text-slate-800 dark:text-white">{room.Name}</h2>

      {/* Room Type */}
      <p className="text-sm text-slate-500 dark:text-slate-300">{room.Room_Type}</p>

      {/* Action Button */}
      <button className="mt-auto rounded-lg bg-slate-700 px-4 py-2 text-sm text-white transition hover:bg-slate-600" onClick={() => onView(room)} >
        View Details
      </button>
    </div>
  )
}
