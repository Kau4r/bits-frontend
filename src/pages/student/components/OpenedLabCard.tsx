import { Users, Clock, Apple, Monitor, DoorOpen } from 'lucide-react';
import type { Room } from '@/pages/student/components/Room';

interface OpenedLabCardProps {
  room: Room;
}

export default function OpenedLabCard({ room }: OpenedLabCardProps) {
  const Logo = room.type === 'MAC' ? Apple : Monitor;
  const logoColor = room.type === 'MAC' ? 'text-gray-200' : 'text-blue-400';

  return (
    <div className="rounded-2xl p-5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                    hover:border-blue-500 transition-colors min-h-48">
      <div className="flex items-start space-x-4">

        <div className="p-4 rounded-xl bg-gray-100 dark:bg-slate-700/60 flex items-center justify-center">
          <Logo className={`w-8 h-8 ${logoColor}`} />
        </div>

        <div className="flex-1">

          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{room.name}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Room: {room.name}</p>
            </div>

            <div className="flex items-center space-x-2 bg-gray-100 dark:bg-slate-700 px-3 py-1 rounded-full text-sm">
              <Users className="text-gray-400" />
              <span className="text-gray-800 dark:text-gray-200">{room.capacity}</span>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
              <Clock className="mr-2 text-gray-400" />
              <span>
                Schedule: <span className="text-gray-800 dark:text-gray-200 font-medium">{room.schedule}</span>
              </span>
            </div>

            <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
              <DoorOpen className="mr-2 text-gray-400" />
              <span>
                Status: <span className="text-green-400 font-medium">{room.nextAvailable}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
