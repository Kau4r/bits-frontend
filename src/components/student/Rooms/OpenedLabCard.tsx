import { FaUserFriends, FaClock, FaApple, FaWindows, FaDoorOpen } from 'react-icons/fa';
import type { Room } from './Room';

interface OpenedLabCardProps {
  room: Room;
}

export default function OpenedLabCard({ room }: OpenedLabCardProps) {
  const Logo = room.type === 'MAC' ? FaApple : FaWindows;
  const logoColor = room.type === 'MAC' ? 'text-gray-800' : 'text-blue-500';
  
  return (
    <div className="rounded-lg p-4 bg-slate-800 border border-slate-700">
      <div className="flex items-start space-x-4">
        {/* Logo */}
        <div className={`p-3 rounded-lg bg-white ${room.type === 'MAC' ? 'bg-opacity-20' : 'bg-opacity-10'}`}>
          <Logo className={`w-8 h-8 ${logoColor}`} />
        </div>
        
        {/* Room Info */}
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold text-white">{room.name}</h3>
              <p className="text-sm text-gray-400">Type: {room.type} Laboratory</p>
              <p className="text-sm text-gray-400">Room: {room.roomCode}</p>
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