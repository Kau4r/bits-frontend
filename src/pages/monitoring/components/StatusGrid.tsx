import type { RoomStatus } from '@/types/monitoring';
import ComputerCard from '@/components/ComputerCard';

interface StatusGridProps {
  room: RoomStatus;
  onComputerClick: (computerId: number, computerName: string) => void;
}

export default function StatusGrid({ room, onComputerClick }: StatusGridProps) {
  return (
    <div className="mb-8" role="region" aria-label={`${room.room_name} computers`}>
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
        {room.room_name}
        <span className="text-sm text-gray-600 dark:text-gray-400 ml-2" aria-label={`${room.online_count} computers online, ${room.offline_count} computers offline`}>
          ({room.online_count} online, {room.offline_count} offline)
        </span>
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {room.computers.map(computer => (
          <ComputerCard
            key={computer.Computer_ID}
            computer={computer}
            onClick={() => onComputerClick(computer.Computer_ID, computer.Name)}
          />
        ))}
      </div>
    </div>
  );
}
