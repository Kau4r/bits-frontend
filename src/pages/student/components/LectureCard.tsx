import { Users, Clock, Presentation } from 'lucide-react';
import type { Room } from '@/pages/student/components/Room';

interface LectureCardProps {
  room: Room;
}

export default function LectureCard({ room }: LectureCardProps) {
  return (
    <div className="h-full flex flex-col rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                    hover:border-blue-500/50 transition-colors duration-200 p-5 shadow-sm">

      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <Presentation className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{room.name}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Lecture Room</p>
          </div>
        </div>

        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
          room.isAvailable
            ? 'bg-green-900/50 text-green-400'
            : 'bg-yellow-900/50 text-yellow-400'
        }`}>
          {room.isAvailable ? 'Available' : 'In Class'}
        </div>
      </div>

      <div className="space-y-3 text-sm flex-1">
        <div className="flex items-center text-gray-600 dark:text-gray-300">
          <Users className="mr-2 text-gray-400" />
          <span>Capacity: <span className="text-gray-900 dark:text-white">{room.capacity} students</span></span>
        </div>

        <div className="flex items-center text-gray-600 dark:text-gray-300">
          <Clock className="mr-2 text-blue-400" />
          <span>Schedule: <span className="text-gray-900 dark:text-white">{room.schedule}</span></span>
        </div>

        {!room.isAvailable && (
          <div className="flex items-center text-gray-600 dark:text-gray-300">
            <Clock className="mr-2 text-yellow-400" />
            <span>Next Available: <span className="text-green-400">{room.nextAvailable}</span></span>
          </div>
        )}
      </div>
    </div>
  );
}
