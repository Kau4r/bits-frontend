import { FaUserFriends, FaClock, FaDoorOpen, FaChalkboardTeacher } from 'react-icons/fa';
import type { Room } from './Room';

interface LectureCardProps {
  room: Room;
}

export default function LectureCard({ room }: LectureCardProps) {
  return (
    <div className="rounded-lg p-4 bg-slate-800 border border-slate-700 hover:border-blue-500 transition-colors">
      <div className="flex items-start space-x-4">
        {/* Lecture Room Icon */}
        <div className="p-3 rounded-lg bg-blue-500/10">
          <FaChalkboardTeacher className="w-6 h-6 text-blue-400" />
        </div>
        
        {/* Room Info */}
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold text-white">{room.name}</h3>
              <p className="text-sm text-gray-400">Lecture Room</p>
            </div>
            <div className="flex items-center space-x-2 bg-slate-700 px-2 py-1 rounded">
              <FaUserFriends className="text-gray-400" />
              <span className="text-sm text-gray-300">{room.capacity}</span>
            </div>
          </div>
          
          {/* Schedule and Next Available */}
          <div className="mt-3 space-y-2">
            <div className="flex items-center text-sm text-gray-300">
              <FaClock className="mr-2 text-gray-400 flex-shrink-0" />
              <span>Schedule: {room.schedule}</span>
            </div>
            
            <div className="flex items-center text-sm text-gray-300">
              <FaDoorOpen className="mr-2 text-gray-400 flex-shrink-0" />
              <span>Next Available: Room {room.nextAvailable}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}